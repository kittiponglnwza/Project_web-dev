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
