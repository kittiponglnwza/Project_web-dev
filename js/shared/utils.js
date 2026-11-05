/**
 * js/shared/utils.js
 * Shared utility functions for the Dorminator project.
 * Loaded globally before page-specific scripts.
 */

// =========================================
//  HTML Sanitization (XSS Prevention)
// =========================================

/**
 * Escapes HTML special characters to prevent XSS injection.
 * Use this for ALL dynamic database values before inserting into innerHTML.
 * @param {string} str - The string to escape
 * @returns {string} - HTML-escaped string
 */
function escapeHTML(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

// =========================================
//  Validation Patterns (Rubric 3)
// =========================================

const DORM_PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    phone: /^0\d{9}$/,
    nationalId: /^\d{13}$/
};

// =========================================
//  Ajax (Rubric 10)
// =========================================

/**
 * ดึงข้อมูลด้วย XMLHttpRequest แล้วแปลง responseText จาก JSON เป็น Object
 * @param {string} url - URL ที่ต้องการดึงข้อมูล
 * @param {object} [headers] - Request headers
 * @returns {Promise<any>} - ข้อมูลที่แปลงแล้ว
 */
function ajaxGetJSON(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        Object.keys(headers).forEach(name => xhr.setRequestHeader(name, headers[name]));
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (err) {
                    reject(err);
                }
            } else {
                reject(new Error('HTTP ' + xhr.status + ': ' + url));
            }
        };
        xhr.onerror = () => reject(new Error('Network error: ' + url));
        xhr.send();
    });
}

/** Headers สำหรับเรียก Supabase REST API โดยตรง */
function supabaseRestHeaders() {
    return { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey };
}

// =========================================
//  Room Availability (Rubric 7)
// =========================================

let roomInventory = [];

function setRoomInventory(rows) {
    roomInventory = (rows || [])
        .filter(row => row && row.room_no && row.room_size)
        .map(row => ({ room_no: String(row.room_no).trim(), room_size: String(row.room_size).trim().toUpperCase() }))
        .sort((a, b) => a.room_no.localeCompare(b.room_no, undefined, { numeric: true }));
}

/** อ่านขนาดห้องจาก inventory ที่โหลดจากฐานข้อมูล */
function getRoomSize(roomNo) {
    const normalized = String(roomNo || '').trim();
    return roomInventory.find(room => room.room_no === normalized)?.room_size || '';
}

/** อ่าน token ขนาดจากชื่อประเภท แม้มี emoji หรือข้อความต่อท้าย เช่น "Size S 🟢" */
function getRoomTypeKey(typeName) {
    const parts = String(typeName || '').trim().split(/\s+/);
    const size = parts.find(part => /^(S|M|XL)$/i.test(part));
    return size ? size.toUpperCase() : '';
}

/**
 * คำนวณจำนวนห้องว่างของแต่ละประเภทจากรายการห้องที่มีผู้เช่า
 * @param {Array<object>} rooms - ข้อมูลประเภทห้อง
 * @param {Array<{room_size: string, available_rooms: number}>} availabilityRows - สรุปห้องว่างจากฐานข้อมูล
 * @returns {Array<object>} - ข้อมูลห้องพร้อม isAvailable และ availableCount
 */
function computeRoomAvailability(rooms, availabilityRows) {
    return rooms.map(room => {
        const key = getRoomTypeKey(room.type);
        const summary = (availabilityRows || []).find(row => String(row.room_size).toUpperCase() === key);
        const availableCount = Math.max(0, Number(summary?.available_rooms) || 0);
        return { ...room, isAvailable: availableCount > 0, availableCount, availabilityEstimated: false };
    });
}

// =========================================
//  Pagination (Rubric 8)
// =========================================

/**
 * วาดปุ่มเปลี่ยนหน้าลงใน container
 * @param {string} containerId - id ขององค์ประกอบที่แสดงตัวควบคุม
 * @param {number} totalItems - จำนวนรายการทั้งหมด
 * @param {number} page - หน้าปัจจุบัน
 * @param {number} pageSize - จำนวนรายการต่อหน้า
 * @param {function(number): void} onChange - เรียกเมื่อเปลี่ยนหน้า
 */
function renderPager(containerId, totalItems, page, pageSize, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) return;

    const pager = document.createElement('nav');
    pager.className = 'pager';
    pager.setAttribute('aria-label', 'เปลี่ยนหน้า');

    const info = document.createElement('span');
    info.textContent = `หน้า ${page} จาก ${totalPages} (${totalItems} รายการ)`;

    const buttons = document.createElement('div');
    buttons.className = 'pager-buttons';

    const addButton = (label, target, disabled) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => onChange(target));
        buttons.appendChild(btn);
    };
    addButton('ก่อนหน้า', page - 1, page <= 1);
    addButton('ถัดไป', page + 1, page >= totalPages);

    pager.append(info, buttons);
    container.appendChild(pager);
}

// =========================================
//  Thai Date & Currency Formatting
// =========================================

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

/**
 * Formats a date string or Date object into Thai Buddhist Era format.
 * @param {string|Date} dateInput - Date to format
 * @param {object} [opts] - Options: { short: true } for abbreviated month
 * @returns {string} - Formatted Thai date string
 */
function formatDateThai(dateInput, opts = {}) {
    if (!dateInput) return '-';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';

    const day = d.getDate();
    const monthArr = opts.short ? THAI_MONTHS : THAI_MONTHS_FULL;
    const month = monthArr[d.getMonth()];
    const year = d.getFullYear() + 543;

    if (opts.includeTime) {
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year} ${hours}:${minutes}`;
    }

    return `${day} ${month} ${year}`;
}

/**
 * แปลงรอบบิล เช่น "พ.ย. 2569" หรือ "พฤษภาคม 2024" เป็นตัวเลขสำหรับเรียงลำดับ
 * @param {string} monthText - ข้อความรอบบิล
 * @returns {number} - ค่าเรียงลำดับ (ปี ค.ศ. x 12 + เดือน) หรือ 0 ถ้าอ่านไม่ได้
 */
function monthSortKey(monthText) {
    const [name, yearText] = String(monthText || '').trim().split(/\s+/);
    let monthIndex = THAI_MONTHS.indexOf(name);
    if (monthIndex === -1) monthIndex = THAI_MONTHS_FULL.indexOf(name);
    let year = parseInt(yearText, 10);
    if (monthIndex === -1 || isNaN(year)) return 0;
    if (year > 2400) year -= 543;
    return year * 12 + monthIndex;
}

/**
 * Generates Thai month options for select dropdowns.
 * @param {number} [rangeBack=1] - Months to go back
 * @param {number} [rangeForward=4] - Months to go forward
 * @returns {Array<{text: string, value: string}>} - Array of month options
 */
function generateThaiMonthOptions(rangeBack, rangeForward) {
    if (rangeBack === undefined) rangeBack = 1;
    if (rangeForward === undefined) rangeForward = 4;
    const d = new Date();
    const startMonth = d.getMonth() - rangeBack;
    const currentYear = d.getFullYear();
    const options = [];

    for (let i = 0; i < rangeBack + 1 + rangeForward; i++) {
        const targetDate = new Date(currentYear, startMonth + i, 1);
        const mText = THAI_MONTHS[targetDate.getMonth()];
        const yText = targetDate.getFullYear() + 543;
        const val = mText + ' ' + yText;
        options.push({ text: val, value: val });
    }

    return options;
}

/**
 * Formats a number as Thai Baht currency string.
 * @param {number} num - Number to format
 * @returns {string} - Formatted currency string (e.g., "12,500")
 */
function formatCurrency(num) {
    if (num == null || isNaN(num)) return '0';
    return Number(num).toLocaleString('th-TH');
}

// =========================================
//  Sidebar Mobile Toggle
// =========================================

/**
 * Initializes the mobile sidebar toggle.
 * Call this on DOMContentLoaded to replace inline onclick attributes.
 */
function initSidebar() {
    const toggle = document.querySelector('.sidebar-toggle');
    const links = document.querySelector('.sidebar-links');
    if (toggle && links) {
        toggle.addEventListener('click', function () {
            links.classList.toggle('active');
        });
    }
}

// =========================================
//  User Display Name Helper
// =========================================

/**
 * Extracts display name from Supabase user metadata.
 * Handles duplicate title prefix bug.
 * @param {object} user - Supabase user object
 * @returns {{ fullName: string, shortName: string }}
 */
function getUserDisplayName(user) {
    let fullName = user.email;
    let shortName = 'ผู้เช่า';

    if (user.user_metadata && user.user_metadata.full_name) {
        const title = user.user_metadata.title || '';
        const fName = user.user_metadata.full_name.trim();

        // Fix duplicate title prefix
        if (fName.startsWith(title)) {
            fullName = fName;
        } else {
            fullName = title + ' ' + fName;
        }

        // Extract first name without title for short display
        const nameWithoutTitle = fName.replace(/^(นาย|นางสาว|นาง)\s*/, '');
        shortName = nameWithoutTitle.split(' ')[0];
    }

    return { fullName, shortName };
}
