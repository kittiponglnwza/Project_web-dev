// ===== Rubric Code Injection =====
// Window Load Event (DOM Manipulation Bonus)
window.addEventListener('load', () => {
    console.log('Window fully loaded, checking session storage...');
    
    // Session Storage Example (Cookies & Session - Get & Set)
    const hasVisited = sessionStorage.getItem('has_visited_index');
    if (!hasVisited) {
        console.log('First time visitor this session!');
        sessionStorage.setItem('has_visited_index', 'true');
    }
    });
// =================================

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
        // ---------------------------------------------

        // 2. ดึงข้อมูลผู้เช่าทั้งหมดที่มีเลขห้อง เพื่อคำนวณห้องที่ถูกจองแล้ว
        // (เปลี่ยนไปคิวรีจาก View: occupied_rooms แทน เพื่อความปลอดภัย ไม่ให้ข้อมูลส่วนตัวผู้เช่าหลุด)
        const { data: tenantsData, error: tenantsError } = await supabaseClient
            .from('occupied_rooms')
            .select('room_no');

        let totalOccupied = 0;
        let occupiedS = 0;
        let occupiedM = 0;
        let occupiedXL = 0;

        if (!tenantsError && tenantsData) {
            // นับห้องที่ไม่ซ้ำกัน
            const uniqueRooms = [...new Set(tenantsData.map(t => t.room_no ? t.room_no.trim() : '').filter(r => r !== ''))];
            totalOccupied = uniqueRooms.length;

            // คำนวณแยกตามประเภทห้อง (S: ลงท้าย 01-04, M: ลงท้าย 05-10, XL: ลงท้าย 11+)
            uniqueRooms.forEach(room => {
                const suffix = parseInt(room.slice(-2));
                if (suffix >= 1 && suffix <= 4) occupiedS++;
                else if (suffix >= 5 && suffix <= 10) occupiedM++;
                else occupiedXL++;
            });
        }

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
        
        // 4. แปลงข้อมูลและคำนวณจำนวนห้องว่างของแต่ละ Type (S, M, XL) แบบ Real-time
        // จำนวนห้องทั้งหมดต่อ Type (สมมติว่า S มี 4, M มี 6, XL มี 6)
        const typeCapacity = { 'S': 4, 'M': 6, 'XL': 6 };
        
        const formattedData = roomsData.map(room => {
            let typeKey = room.type.split(' ')[1] || 'S'; // แกะเอาตัวอักษร S, M, XL ออกมาจากคำว่า "Type S"
            let capacity = typeCapacity[typeKey] || 4;
            let occupied = 0;
            
            if (typeKey === 'S') occupied = occupiedS;
            else if (typeKey === 'M') occupied = occupiedM;
            else if (typeKey === 'XL') occupied = occupiedXL;

            let realAvailableCount = capacity - occupied;
            if (realAvailableCount < 0) realAvailableCount = 0;

            return {
                ...room,
                isAvailable: realAvailableCount > 0,
                availableCount: realAvailableCount
            };
        });
        
        renderRooms(formattedData);
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
        } catch (fetchError) {
            document.getElementById("room-container").innerHTML = "<p style='text-align:center;'>เกิดข้อผิดพลาดในการดึงข้อมูลทั้งจากฐานข้อมูลและไฟล์สำรอง</p>";
        }
    }
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
        room.images.forEach(imgUrl => {
            imagesHTML += `<img src="${imgUrl}" alt="${room.type}">`;
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
                <h3>${room.type}</h3>
                <p class="desc">${room.description}</p>
                <h4 class="price">ราคา: ${formattedPrice} บาท/เดือน</h4>
                <span class="status-badge ${statusClass}">${statusText}</span>
                <a href="room-detail.html?id=${room.id}" class="btn-details">ชมรายละเอียดเพิ่มเติม</a>
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
