// Rubric 6: เพิ่ม Element ด้วย getElementById() ใน window load event
window.addEventListener('load', () => {
    // Rubric 9: นับจำนวนการเปิดหน้านี้ใน Session ปัจจุบัน
    DormSession.init();
    const visits = Number(DormSession.get('index_visits') || 0) + 1;
    DormSession.set('index_visits', visits);

    const note = document.createElement('p');
    note.className = 'visit-note';
    note.textContent = visits === 1
        ? 'ยินดีต้อนรับ! นี่คือการเข้าชมครั้งแรกในรอบนี้'
        : `ยินดีต้อนรับกลับ! คุณเปิดหน้านี้ ${visits} ครั้งในรอบนี้`;
    document.getElementById('hero-content').appendChild(note);
});

document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuBtn = document.getElementById("mobile-menu");
    const navMenu = document.getElementById("nav-menu");
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener("click", () => {
            navMenu.classList.toggle("active");
        });
    }

    const roomContainer = document.getElementById("room-container");
    if (roomContainer) {
        fetchRooms();
    }
});
// ดึงข้อมูลห้องพักจากฐานข้อมูลจริง (Supabase)
async function fetchRooms() {
    try {
        // --- Rubric 10: Ajax Fetch API -> Database ---
        // ใช้ Fetch API บริสุทธิ์ดึงข้อมูลจาก Supabase REST API โดยตรง
        const fetchUrl = supabaseUrl + '/rest/v1/rooms?select=*&order=id.asc';
        const response = await fetch(fetchUrl, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': 'Bearer ' + supabaseKey
            }
        });

        if (!response.ok) {
            throw new Error("HTTP Fetch Error: " + response.status);
        }

        const roomsData = await response.json();
        // ฐานข้อมูลใหม่ที่ยังไม่นำเข้าห้องพัก ให้ใช้ไฟล์สำรอง data/rooms.json
        if (roomsData.length === 0) {
            throw new Error("ตาราง rooms ยังไม่มีข้อมูล");
        }
        // ---------------------------------------------

        // 2. ดึงข้อมูลผู้เช่าทั้งหมดที่มีเลขห้อง เพื่อคำนวณห้องที่ถูกจองแล้ว
        // (เปลี่ยนไปคิวรีจาก View: occupied_rooms แทน เพื่อความปลอดภัย ไม่ให้ข้อมูลส่วนตัวผู้เช่าหลุด)
        // --- Rubric 10: Ajax Fetch API -> Database (2nd endpoint) ---
        const fetchUrl2 = supabaseUrl + '/rest/v1/occupied_rooms?select=room_no';
        const response2 = await fetch(fetchUrl2, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': 'Bearer ' + supabaseKey
            }
        });

        if (!response2.ok) {
            throw new Error("HTTP Fetch Error (occupied_rooms): " + response2.status);
        }

        const tenantsData = await response2.json();
        // --------------------------------------------------------

        const totalOccupied = new Set(tenantsData.map(t => (t.room_no || '').trim()).filter(Boolean)).size;

        // 3. อัปเดตป้ายบอกจำนวนห้องว่างรวมที่หน้า Index (สมมติว่าตึกนี้มีทั้งหมด 16 ห้อง ตามที่แอดมินแจ้ง)
        const TOTAL_BUILDING_ROOMS = 16;
        const heroBadge = document.getElementById('hero-availability');
        if (heroBadge) {
            const availableTotal = TOTAL_BUILDING_ROOMS - totalOccupied;
            if (availableTotal > 0) {
                heroBadge.innerHTML = `<i class='bx bx-check-circle'></i> มีห้องว่าง ${availableTotal} ห้อง พร้อมเข้าอยู่ทันที!`;
                heroBadge.style.background = '#10b981';
                heroBadge.style.color = '#fff';
                heroBadge.style.border = 'none';
                heroBadge.style.boxShadow = '0 4px 10px rgba(16, 185, 129, 0.3)';
            } else {
                heroBadge.innerHTML = `<i class='bx bx-x-circle'></i> ตอนนี้ห้องพักเต็มทั้งหมดแล้ว`;
                heroBadge.style.background = '#ef4444';
                heroBadge.style.color = '#fff';
                heroBadge.style.border = 'none';
            }
        }
        
        // 4. คำนวณจำนวนห้องว่างของแต่ละ Type (S, M, XL) จากข้อมูล JSON
        const formattedData = computeRoomAvailability(roomsData, tenantsData);

        renderRooms(formattedData);
        renderRoomSummary(formattedData);
    } catch (error) {
        console.error("Error fetching from Supabase, falling back to local JSON (Rubric 7: JSON):", error);
        // JSON -> Fetch -> Process -> Render UI
        try {
            const response = await fetch('data/rooms.json');
            const localData = await response.json();
            
            // Process the JSON data to match the format expected by renderRooms
            const fallbackData = localData.map(room => ({
                id: room.id,
                type: room.type,
                description: room.description,
                price: room.price,
                isAvailable: room.isAvailable,
                availableCount: room.availableCount,
                images: room.images
            }));
            
            renderRooms(fallbackData);
            renderRoomSummary(fallbackData);

            const availableTotal = fallbackData.reduce((sum, room) => sum + room.availableCount, 0);
            document.getElementById('hero-availability').textContent = `มีห้องว่าง ${availableTotal} ห้อง (ข้อมูลสำรอง)`;
        } catch (fetchError) {
            document.getElementById("room-container").innerHTML = "<p style='text-align:center;'>เกิดข้อผิดพลาดในการดึงข้อมูลทั้งจากฐานข้อมูลและไฟล์สำรอง</p>";
        }
    }
}
// Rubric 7: ประมวลผลข้อมูล JSON แล้วแสดงเป็นตารางสรุปที่อ่านง่าย
function renderRoomSummary(rooms) {
    const summary = document.getElementById('room-summary');
    if (!summary || rooms.length === 0) return;

    const prices = rooms.map(room => Number(room.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
    const totalAvailable = rooms.reduce((sum, room) => sum + room.availableCount, 0);
    const money = value => Number(value).toLocaleString('th-TH');

    const rows = rooms.map(room => `
        <tr>
            <td>${escapeHTML(room.type)}</td>
            <td>${money(room.price)} บาท</td>
            <td>${room.availableCount} ห้อง</td>
        </tr>
    `).join('');

    summary.innerHTML = `
        <h3>สรุปประเภทห้องพัก</h3>
        <table>
            <thead><tr><th>ประเภท</th><th>ราคาต่อเดือน</th><th>ห้องว่าง</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p>ราคาเริ่มต้น ${money(minPrice)} บาท สูงสุด ${money(maxPrice)} บาท เฉลี่ย ${money(avgPrice)} บาทต่อเดือน รวมห้องว่าง ${totalAvailable} ห้อง</p>
    `;
}

// ตัวแปรเก็บสถานะสไลเดอร์ของแต่ละห้อง
const sliderStates = {};

function renderRooms(rooms) {
    const container = document.getElementById("room-container");
    container.innerHTML = ""; 

    rooms.forEach((room, index) => {
        const box = document.createElement("article");
        box.className = "room-box";
        box.setAttribute("data-status", room.isAvailable ? "available" : "full");

        const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
        const statusText = room.isAvailable ? `ว่าง ${room.availableCount} ห้อง` : "เต็มแล้ว";
        const statusClass = room.isAvailable ? "status-available" : "status-full";

        // สร้างแท็กรูปภาพทั้งหมดใน Slider (วนลูปจาก Array)
        let imagesHTML = '';
        (room.images || []).forEach(imgUrl => {
            imagesHTML += `<img src="${escapeHTML(imgUrl)}" alt="${escapeHTML(room.type)}">`;
        });

        // จัดโครงสร้าง ซ้าย (Slider) ขวา (Details)
        box.innerHTML = `
            <div class="slider-wrapper" id="slider-${index}">
                <div class="slider-track">
                    ${imagesHTML}
                </div>
                <!-- ปุ่มเลื่อนซ้ายขวา -->
                <button class="slider-btn prev-btn" onclick="moveSlide(${index}, -1)">&#10094;</button>
                <button class="slider-btn next-btn" onclick="moveSlide(${index}, 1)">&#10095;</button>
            </div>
            
            <div class="room-details">
                <h3>${escapeHTML(room.type)}</h3>
                <p class="desc">${escapeHTML(room.description)}</p>
                <h4 class="price">ราคา: ${formattedPrice} บาท/เดือน</h4>
                <span class="status-badge ${statusClass}">${statusText}</span>
                <a href="room-detail.html?id=${encodeURIComponent(room.id)}" class="btn-details">ชมรายละเอียดเพิ่มเติม</a>
            </div>
        `;

        container.appendChild(box);
    });

    // เริ่มทำงานระบบ Auto Slide
    initAutoSlide(rooms.length);
}

// ฟังก์ชันควบคุมการเลื่อนภาพ (DOM Manipulation)
window.moveSlide = function(sliderId, direction) {
    const track = document.querySelector(`#slider-${sliderId} .slider-track`);
    const totalSlides = track.children.length;
    if (totalSlides === 0) return;

    // ตั้งค่าเริ่มต้นถ้ายังไม่เคยเลื่อน
    if (typeof sliderStates[sliderId] === 'undefined') {
        sliderStates[sliderId] = 0;
    }

    sliderStates[sliderId] += direction;

    // เช็คกรณีเลื่อนทะลุภาพแรกหรือภาพสุดท้าย
    if (sliderStates[sliderId] >= totalSlides) {
        sliderStates[sliderId] = 0; // กลับไปรูปแรก
    } else if (sliderStates[sliderId] < 0) {
        sliderStates[sliderId] = totalSlides - 1; // ไปรูปสุดท้าย
    }

    // คำนวณระยะการขยับภาพ (100% ต่อรูป)
    const offset = -(sliderStates[sliderId] * 100);
    track.style.transform = `translateX(${offset}%)`;
};

// ฟังก์ชันเลื่อนภาพอัตโนมัติทุกๆ 3.5 วินาที
function initAutoSlide(totalRooms) {
    setInterval(() => {
        for (let i = 0; i < totalRooms; i++) {
            // เช็คว่ามีองค์ประกอบอยู่ในหน้าจอไหมก่อนเลื่อน
            const track = document.querySelector(`#slider-${i} .slider-track`);
            if (track) moveSlide(i, 1);
        }
    }, 3500);
}
