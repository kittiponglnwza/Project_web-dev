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

            console.error("Error fetching rooms:", error);
            document.getElementById("room-container").innerHTML = "<p>ไม่สามารถโหลดข้อมูลห้องพักได้</p>";
        });
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
