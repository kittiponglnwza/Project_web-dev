document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');

    if (roomId) {
        fetchRoomDetail(roomId);
    } else {
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพัก กรุณากลับไปเลือกใหม่</p>";
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
    const statusColor = room.isAvailable ? "#10b981" : "#ef4444"; // สีเขียว/แดง โทนละมุนแบบโมเดิร์น

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
        <!-- ปกห้องพักแบบคลีนๆ ไม่มีอะไรมาบดบัง -->
        <div class="lux-hero" style="background-image: url('${mainImage}');">
            <div class="lux-nav">
                <a href="index.html" class="lux-back">
                    <i class='bx bx-left-arrow-alt'></i> กลับหน้าหลัก
                </a>
            </div>
        </div>

        <!-- เนื้อหาด้านล่าง จัดเรียงแบบ 2 คอลัมน์ -->
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
                    <!-- ใช้ Icon จาก BoxIcons แทน Emoji ดูเป็นมืออาชีพขึ้น 100% -->
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

            <!-- กล่องจองห้องพักด้านขวา (ดีไซน์โค้งมน มีมิติ) -->
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

                    <button class="lux-btn-reserve" onclick="alert('✅ เปิดฟอร์มการจองห้องพัก...');">
                        จองห้องพักตอนนี้ <i class='bx bx-right-arrow-alt'></i>
                    </button>
                </div>
            </div>

        </div>
    `;
}
