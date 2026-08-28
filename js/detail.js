document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');

    if (roomId) {
        fetchRoomDetail(roomId);
    } else {
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพัก กรุณากลับไปเลือกใหม่</p>";
    }

    const modal = document.getElementById("bookingModal");
    const closeBtn = document.querySelector(".close-modal");
    
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
        });

        window.addEventListener("click", (e) => {
            if (e.target == modal) {
                modal.classList.remove("show");
            }
        });
    }

    const bookingForm = document.getElementById("bookingForm");
    if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => {
            e.preventDefault(); 
            const phoneInput = document.getElementById("b_phone");
            const phoneError = document.getElementById("phoneError");
            const phoneVal = phoneInput.value.trim();
            const phoneRegex = /^0\d{9}$/;

            if (!phoneRegex.test(phoneVal)) {
                phoneInput.classList.add("invalid");
                phoneError.style.display = "block";
            } else {
                phoneInput.classList.remove("invalid");
                phoneError.style.display = "none";
                document.getElementById("bookingFormContainer").style.display = "none";
                document.getElementById("bookingSuccess").style.display = "block";
            }
        });
    }
});

async function fetchRoomDetail(id) {
    try {
        // ใช้ Supabase API ดึงข้อมูลเฉพาะห้องที่มี id ตรงกับ URL
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', id)
            .single(); // เอาแค่ 1 แถว

        if (error) throw error;
        
        if (data) {
            // แปลงข้อมูลจาก DB ให้ตรงกับตัวแปรในหน้าเว็บ
            const room = {
                ...data,
                isAvailable: data.is_available,
                availableCount: data.available_count
            };
            renderUltraPremiumDetail(room);
        }
    } catch (error) {
        console.error("Error fetching detail:", error);
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพักที่ท่านค้นหา</p>";
    }
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
            if (index > 0) galleryHTML += `<img src="${imgUrl}" alt="Gallery ${index}" class="lux-gallery-img">`;
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

                <!-- สลับเอาคลังภาพ (Gallery) ขึ้นมาไว้บน สิ่งอำนวยความสะดวก ตามคำขอ -->
                <div class="lux-section">
                    <h2>คลังภาพ (Gallery)</h2>
                    <div class="lux-gallery">
                        ${galleryHTML}
                    </div>
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

                <!-- แผนที่ Location (Google Maps) -->
                <div class="lux-section">
                    <h2>สถานที่ตั้ง (Location)</h2>
                    <div style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05); margin-bottom: 15px;">
                        <iframe 
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3874.33156272559!2d100.51139427508365!3d13.824510786575184!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e29b7134371457%3A0xcbb98305342a7!2z4Lih4Lir4Liy4Lin4Li04LiX4Lii4Liy4Lil4Lix4Lii4LmA4LiX4LiE4LmC4LiZ4LmC4Lil4Lii4Li14Lie4Lij4Liw4LiI4Lit4Lih4LmA4LiB4Lil4LmJ4Liy4Lie4Lij4Liw4LiZ4LiE4Lij4LmA4Lir4LiZ4Li34Lit!5e0!3m2!1sth!2sth!4v1714500000000!5m2!1sth!2sth" 
                            width="100%" 
                            height="350" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="lazy" 
                            referrerpolicy="no-referrer-when-downgrade">
                        </iframe>
                    </div>
                    <p style="color: #4b5563; font-size: 1rem; display: flex; gap: 8px; align-items: flex-start; line-height: 1.6;">
                        <i class='bx bxs-map' style="color: #ef4444; font-size: 1.3rem; margin-top: 3px;"></i> 
                        <span>ทำเลทอง ใกล้มหาวิทยาลัยและแหล่งชุมชน เดินทางสะดวกสบายด้วยรถสาธารณะ มีร้านสะดวกซื้อ 7-11 ป้ายรถเมล์ และวินมอเตอร์ไซค์หน้าปากซอย</span>
                    </p>
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

                    <button class="lux-btn-reserve" onclick="openBookingModal()">
                        สนใจจอง / นัดดูห้องพัก <i class='bx bx-right-arrow-alt'></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.openBookingModal = function() {
    const modal = document.getElementById("bookingModal");
    modal.classList.add("show");
    
    document.getElementById("bookingFormContainer").style.display = "block";
    document.getElementById("bookingSuccess").style.display = "none";
    document.getElementById("bookingForm").reset();
    document.getElementById("b_phone").classList.remove("invalid");
    document.getElementById("phoneError").style.display = "none";
}
