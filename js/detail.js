document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');

    if (roomId) {
        fetchRoomDetail(roomId);
    } else {
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพัก กรุณากลับไปเลือกใหม่</p>";
    }

    // ==========================================
    // ระบบ Modal & Form Validation (RegEx) 
    // สำหรับคะแนน Rubric ข้อ 3 โดยเฉพาะ
    // ==========================================
    const modal = document.getElementById("bookingModal");
    const closeBtn = document.querySelector(".close-modal");
    
    // เปิด/ปิด Modal
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
        });

        // กดพื้นที่ว่างข้างนอกเพื่อปิด
        window.addEventListener("click", (e) => {
            if (e.target == modal) {
                modal.classList.remove("show");
            }
        });
    }

    // จัดการการส่งฟอร์ม + Validation
    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => {
            e.preventDefault(); // ป้องกันเว็บโหลดใหม่ (สำคัญเวลาใช้ Ajax/JS จัดการ)

            const phoneInput = document.getElementById("b_phone");
            const phoneError = document.getElementById("phoneError");
            const phoneVal = phoneInput.value.trim();

            // เช็ค RegEx: ต้องขึ้นด้วย 0 และตามด้วยตัวเลขอีก 9 หลัก (รวมเป็น 10)
            const phoneRegex = /^0\d{9}$/;

            if (!phoneRegex.test(phoneVal)) {
                // กรอกเบอร์ผิดรูปแบบ โชว์ตัวแดงเตือน
                phoneInput.classList.add("invalid");
                phoneError.style.display = "block";
            } else {
                // กรอกถูกรูปแบบ ผ่าน!
                phoneInput.classList.remove("invalid");
                phoneError.style.display = "none";

                // จำลองว่าบันทึกข้อมูลแล้ว ปิดฟอร์ม โชว์ปุ่มแอด LINE
                document.getElementById("bookingFormContainer").style.display = "none";
                document.getElementById("bookingSuccess").style.display = "block";
            }
        });
    }
});

function fetchRoomDetail(id) {
    fetch("data/rooms.json")
        .then(response => {
            if (!response.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้");
            return response.json();
        })
        .then(data => {
            const room = data.find(r => r.id == id);
            if (room) {
                renderUltraPremiumDetail(room);
            } else {
                document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพักที่ท่านค้นหา</p>";
            }
        })
        .catch(error => console.error("Error:", error));
}

function renderUltraPremiumDetail(room) {
    const container = document.getElementById("room-detail-container");
    const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
    
    const statusText = room.isAvailable ? `Available (${room.availableCount} Rooms)` : "Fully Booked (เต็มแล้ว)";
    const statusColor = room.isAvailable ? "#10b981" : "#ef4444"; 

    const mainImage = room.images[0];
    let galleryHTML = '';
    
    if (room.images.length > 1) {
        room.images.forEach((imgUrl, index) => {
            if (index > 0) {
                galleryHTML += `<img src="${imgUrl}" alt="Gallery ${index}" class="lux-gallery-img">`;
            }
        });
    } else {
        galleryHTML = `<img src="${mainImage}" alt="Gallery 1" class="lux-gallery-img">`;
    }

    container.innerHTML = `
        <div class="lux-hero" style="background-image: url('${mainImage}');">
            <div class="lux-nav">
                <a href="index.html" class="lux-back">
                    <i class='bx bx-left-arrow-alt'></i> กลับหน้าหลัก
                </a>
            </div>
        </div>

        <div class="lux-wrapper">
            <div class="lux-main">
                <div class="lux-header">
                    <span class="lux-category">PREMIUM RESIDENCE</span>
                    <h1 class="lux-title">${room.type}</h1>
                    <p class="lux-location"><i class='bx bx-map'></i> ใจกลางเมือง, เดินทางสะดวก ปลอดภัย</p>
                </div>
                <hr class="lux-divider">
                <div class="lux-section">
                    <h2>ภาพรวม (Overview)</h2>
                    <p class="lux-desc">${room.description}</p>
                </div>
                
                <div class="lux-section">
                    <h2>สิ่งอำนวยความสะดวก (Amenities)</h2>
                    <div class="lux-amenities">
                        <div class="am-item"><i class='bx bx-cctv'></i> <span>24/7 Security & CCTV</span></div>
                        <div class="am-item"><i class='bx bx-car'></i> <span>Private Parking</span></div>
                        <div class="am-item"><i class='bx bx-water'></i> <span>Laundry Service</span></div>
                        <div class="am-item"><i class='bx bx-wifi'></i> <span>High-Speed Wi-Fi</span></div>
                        <div class="am-item"><i class='bx bx-spray-can'></i> <span>Cleaning Service</span></div>
                        <div class="am-item"><i class='bx bx-key'></i> <span>Keycard Access</span></div>
                    </div>
                </div>

                <div class="lux-section">
                    <h2>คลังภาพ (Gallery)</h2>
                    <div class="lux-gallery">
                        ${galleryHTML}
                    </div>
                </div>
            </div>

            <div class="lux-sidebar">
                <div class="lux-booking-card">
                    <div class="lux-price-row">
                        <span class="lux-price">฿${formattedPrice}</span>
                        <span class="lux-period">/ เดือน</span>
                    </div>
                    
                    <div class="lux-status">
                        <span class="lux-dot" style="background-color: ${statusColor};"></span>
                        <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
                    </div>
                    
                    <div class="lux-promo">
                        <i class='bx bxs-star' style="color: #d4af37; font-size: 1.2rem;"></i>
                        <div>
                            <strong>สิทธิพิเศษวันนี้</strong><br>
                            ฟรีค่าส่วนกลาง 1 เดือนแรก พร้อมบริการทำความสะอาดฟรีก่อนเข้าอยู่
                        </div>
                    </div>

                    <!-- เปลี่ยนปุ่มให้เรียกใช้งาน ฟังก์ชันเปิด Modal -->
                    <button class="lux-btn-reserve" onclick="openBookingModal()">
                        สนใจจอง / นัดดูห้องพัก <i class='bx bx-right-arrow-alt'></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ฟังก์ชันเปิด Modal
window.openBookingModal = function() {
    const modal = document.getElementById("bookingModal");
    modal.classList.add("show");
    
    // เคลียร์ค่าฟอร์มกลับเป็นค่าเริ่มต้นทุกครั้งที่เปิดใหม่
    document.getElementById("bookingFormContainer").style.display = "block";
    document.getElementById("bookingSuccess").style.display = "none";
    document.getElementById("bookingForm").reset();
    document.getElementById("b_phone").classList.remove("invalid");
    document.getElementById("phoneError").style.display = "none";
}
