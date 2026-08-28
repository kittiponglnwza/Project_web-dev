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
                renderPremiumDetail(room);
            } else {
                document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพักที่ท่านค้นหา</p>";
            }
        })
        .catch(error => console.error("Error:", error));
}

function renderPremiumDetail(room) {
    const container = document.getElementById("room-detail-container");
    const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
    
    // ตั้งค่าตัวอักษรและสีสถานะแบบพรีเมียม
    const statusText = room.isAvailable ? `Available (${room.availableCount} Rooms)` : "Fully Booked (คิวเต็ม)";
    const statusColor = room.isAvailable ? "#2ecc71" : "#e74c3c";

    const mainImage = room.images[0];
    let galleryHTML = '';
    
    // ถ้ารูปมีมากกว่า 1 เอารูปที่เหลือมาเรียงในส่วน Gallery
    if (room.images.length > 1) {
        room.images.forEach((imgUrl, index) => {
            if (index > 0) {
                galleryHTML += `<img src="${imgUrl}" alt="Gallery ${index}" class="luxury-img">`;
            }
        });
    } else {
        galleryHTML = `<img src="${mainImage}" alt="Gallery 1" class="luxury-img">`;
    }

    container.innerHTML = `
        <!-- ส่วนปก (Hero) ใช้รูปแรกเป็นแบคกราวนด์ -->
        <div class="luxury-hero" style="background-image: url('${mainImage}');">
            <div class="luxury-overlay">
                <div class="luxury-nav">
                    <a href="index.html" class="luxury-back">&#8592; กลับหน้าแรก (Back to Home)</a>
                </div>
                <div class="hero-text">
                    <p class="subtitle">PREMIUM RESIDENCE</p>
                    <h1>${room.type}</h1>
                </div>
            </div>
        </div>

        <div class="luxury-content">
            <!-- ฝั่งซ้าย รายละเอียดทั้งหมด -->
            <div class="luxury-main">
                <h2 class="section-title">Overview (ภาพรวม)</h2>
                <p class="luxury-desc">${room.description}</p>
                
                <h2 class="section-title">Amenities (สิ่งอำนวยความสะดวก)</h2>
                <div class="luxury-amenities">
                    <div class="amenity-item"><span class="icon">🛡️</span> 24/7 Security & CCTV</div>
                    <div class="amenity-item"><span class="icon">🚘</span> Private Parking</div>
                    <div class="amenity-item"><span class="icon">🧺</span> Laundry Service</div>
                    <div class="amenity-item"><span class="icon">📶</span> High-Speed Wi-Fi</div>
                    <div class="amenity-item"><span class="icon">🧹</span> Cleaning Service</div>
                    <div class="amenity-item"><span class="icon">🔑</span> Keycard Access</div>
                </div>

                <h2 class="section-title">Gallery (คลังภาพ)</h2>
                <div class="luxury-gallery">
                    ${galleryHTML}
                </div>
            </div>

            <!-- ฝั่งขวา กล่องจองห้อง (Sticky Sidebar) -->
            <div class="luxury-sidebar">
                <div class="booking-card">
                    <div class="price-wrap">
                        <span class="currency">THB</span>
                        <span class="price-val">${formattedPrice}</span>
                        <span class="period">/ เดือน</span>
                    </div>
                    <div class="status-wrap">
                        <span class="status-dot" style="background-color: ${statusColor}; box-shadow: 0 0 10px ${statusColor};"></span>
                        <span>${statusText}</span>
                    </div>
                    <hr class="luxury-divider">
                    <p style="color: #777; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.6;">
                        จองวันนี้รับสิทธิพิเศษ ฟรีค่าส่วนกลาง 1 เดือนแรก พร้อมบริการทำความสะอาดฟรีก่อนเข้าอยู่
                    </p>
                    <button class="luxury-btn" onclick="alert('✅ เปิดฟอร์มการจองห้องพัก...');">RESERVE NOW (จองเลย)</button>
                </div>
            </div>
        </div>
    `;
}
