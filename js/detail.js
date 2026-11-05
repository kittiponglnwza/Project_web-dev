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
        // ห้ามเลือกวันเข้าอยู่ย้อนหลัง
        const now = new Date();
        document.getElementById("b_date").min = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

        bookingForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 
            const phoneInput = document.getElementById("b_phone");
            const nameInput = document.getElementById("b_name");
            const dateInput = document.getElementById("b_date");
            const phoneError = document.getElementById("phoneError");
            
            const phoneVal = phoneInput.value.trim();
            const nameVal = nameInput.value.trim();
            const dateVal = dateInput.value;

            if (!DORM_PATTERNS.phone.test(phoneVal)) {
                phoneInput.classList.add("invalid");
                phoneError.style.display = "block";
            } else {
                phoneInput.classList.remove("invalid");
                phoneError.style.display = "none";
                
                // Show loading state on button
                const btn = bookingForm.querySelector("button[type='submit']");
                const originalText = btn.innerHTML;
                btn.innerHTML = "<i class='bx bx-loader-alt bx-spin'></i> กำลังส่งข้อมูล...";
                btn.disabled = true;

                let sendFailed = false;
                try {
                    // Send booking data to admin via messages table
                    const messageText = `🔔 แจ้งเตือน! มีลูกค้าสนใจจอง/ดูห้องพัก\nชื่อ: ${nameVal}\nเบอร์โทร: ${phoneVal}\nวันที่คาดว่าจะเข้าอยู่: ${dateVal || 'ไม่ได้ระบุ'}\nID ห้องที่สนใจ: ${roomId}`;

                    const { error } = await supabaseClient
                        .from('messages')
                        .insert([{
                            sender_email: 'system_booking@mydorm.com',
                            receiver_email: 'admin',
                            message: messageText
                        }]);

                    if (error) {
                        console.error("Supabase Error:", error);
                        sendFailed = true;
                    }
                } catch (err) {
                    console.error(err);
                    sendFailed = true;
                }

                btn.innerHTML = originalText;
                btn.disabled = false;

                // ถ้าส่งไม่สำเร็จต้องแจ้งลูกค้า เพราะแอดมินจะไม่ได้รับเรื่องนี้
                if (sendFailed) {
                    alert("ส่งข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
                    return;
                }

                // Rubric 6: ซ่อนฟอร์มและเพิ่ม Element จากข้อมูลที่รับมาจากฟอร์ม
                document.getElementById("bookingFormContainer").style.display = "none";
                document.getElementById("bookingSuccess").style.display = "block";

                const summary = document.getElementById("bookingSummary");
                summary.innerHTML = "";
                [
                    `ชื่อ: ${nameVal}`,
                    `เบอร์โทร: ${phoneVal}`,
                    `วันที่เข้าอยู่: ${dateVal || 'ไม่ได้ระบุ'}`
                ].forEach(text => {
                    const item = document.createElement("li");
                    item.textContent = text;
                    summary.appendChild(item);
                });
            }
        });
    }
});

// Rubric 10: ใช้ XMLHttpRequest มากกว่า 1 จุดในหน้าเดียว และจัดการ responseText ชนิด JSON
async function fetchRoomDetail(id) {
    let jsonRooms = [];
    try {
        // จุดที่ 1: ไฟล์ JSON สำหรับรายการอุปกรณ์ในห้อง และใช้สำรองเมื่อฐานข้อมูลล่ม
        jsonRooms = await ajaxGetJSON('data/rooms.json');
    } catch (error) {
        console.error("Error loading rooms.json:", error);
    }
    const jsonRoom = jsonRooms.find(room => String(room.id) === String(id));

    let room = null;
    try {
        const headers = supabaseRestHeaders();
        // จุดที่ 2: ข้อมูลห้องจากฐานข้อมูล
        const rows = await ajaxGetJSON(`${supabaseUrl}/rest/v1/rooms?select=*&id=eq.${encodeURIComponent(id)}`, headers);
        if (rows.length > 0) {
            // สรุปจำนวนห้องจาก SQL view เพื่อให้ตรงกับหน้าแรก
            const availability = await ajaxGetJSON(`${supabaseUrl}/rest/v1/room_availability?select=room_size,total_rooms,available_rooms,occupied_rooms`, headers);
            room = computeRoomAvailability(rows, availability)[0];
        }
    } catch (error) {
        console.error("Error fetching detail, using rooms.json:", error);
    }

    room = room || (jsonRoom ? { ...jsonRoom, isAvailable: true, availableCount: null, availabilityEstimated: true } : null);
    if (!room) {
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center; padding: 100px;'>⚠️ ไม่พบข้อมูลห้องพักที่ท่านค้นหา</p>";
        return;
    }

    room.facilities = room.facilities || (jsonRoom ? jsonRoom.facilities : []) || [];
    renderUltraPremiumDetail(room);
}

function renderUltraPremiumDetail(room) {
    const container = document.getElementById("room-detail-container");
    const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
    const statusText = room.availabilityEstimated ? 'มีห้องว่าง*' : (room.isAvailable ? `Available (${room.availableCount} Rooms)` : "Fully Booked (เต็มแล้ว)");
    const statusColor = room.isAvailable ? "#10b981" : "#ef4444"; 
    // ดึงรูปแรกมาขยายขนาดความละเอียดสำหรับแบนเนอร์ใหญ่
    room.images = room.images && room.images.length > 0 ? room.images : ['images/1.jpg'];
    let mainImage = room.images[0];
    if (mainImage.includes('images.pexels.com')) {
        mainImage = mainImage.replace(/w=\d+/g, 'w=1920'); // ขยายเป็น 1920px เพื่อความคมชัด
    }

    let galleryHTML = '';
    
    if (room.images.length > 1) {
        room.images.forEach((imgUrl, index) => {
            if (index > 0) {
                // ขยายรูปใน Gallery ให้ชัดขึ้นด้วย (เช่น 1200px)
                let highResImg = imgUrl;
                if (highResImg.includes('images.pexels.com')) {
                    highResImg = highResImg.replace(/w=\d+/g, 'w=1200'); 
                }
                galleryHTML += `<a href="${escapeHTML(highResImg)}" target="_blank" rel="noopener"><img src="${escapeHTML(highResImg)}" alt="Gallery ${index}" class="lux-gallery-img"></a>`;
            }
        });
    } else {
        let highResImg = mainImage.replace(/w=\d+/g, 'w=1200');
        galleryHTML = `<img src="${escapeHTML(highResImg)}" alt="Gallery 1" class="lux-gallery-img">`;
    }

    const facilitiesHTML = room.facilities.length === 0 ? '' : `
                <section class="lux-section">
                    <h2>อุปกรณ์ภายในห้อง (Room Facilities)</h2>
                    <div class="lux-amenities">
                        ${room.facilities.map(item => `<div class="am-item"><i class='bx bx-check'></i> <span>${escapeHTML(item)}</span></div>`).join('')}
                    </div>
                </section>
    `;

    container.innerHTML = `
        <header class="lux-hero" style="background-image: url('${escapeHTML(mainImage)}');">
            <nav class="lux-nav">
                <a href="index.html" class="lux-back">
                    <i class='bx bx-left-arrow-alt'></i> กลับหน้าหลัก
                </a>
            </nav>
        </header>

        <div class="lux-wrapper">
            <article class="lux-main">
                <header class="lux-header">
                    <span class="lux-category">PREMIUM RESIDENCE</span>
                    <h1 class="lux-title">${escapeHTML(room.type)}</h1>
                    <p class="lux-location"><i class='bx bx-map'></i> ใจกลางเมือง, เดินทางสะดวก ปลอดภัย</p>
                </header>
                <hr class="lux-divider">

                <section class="lux-section">
                    <h2>ภาพรวม (Overview)</h2>
                    <p class="lux-desc">${escapeHTML(room.description)}</p>
                </section>

                ${facilitiesHTML}

                <!-- สลับเอาคลังภาพ (Gallery) ขึ้นมาไว้บน สิ่งอำนวยความสะดวก ตามคำขอ -->
                <section class="lux-section">
                    <h2>คลังภาพ (Gallery)</h2>
                    <div class="lux-gallery">
                        ${galleryHTML}
                    </div>
                </section>

                <!-- แผนผังอาคาร (Floor Plan) -->
                <section class="lux-section">
                    <h2>แผนผังอาคาร (Floor Plan)</h2>
                    <figure style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05); margin-bottom: 15px; text-align: center;">
                        <img src="images/floorplan.jpg" alt="แผนผังอาคาร" style="max-width: 100%; height: auto; border-radius: 12px;">
                    </figure>
                </section>

                <section class="lux-section">
                    <h2>สิ่งอำนวยความสะดวก (Amenities)</h2>
                    <div class="lux-amenities">
                        <div class="am-item"><i class='bx bx-cctv'></i> <span>24/7 Security & CCTV</span></div>
                        <div class="am-item"><i class='bx bx-car'></i> <span>Private Parking</span></div>
                        <div class="am-item"><i class='bx bx-water'></i> <span>Laundry Service</span></div>
                        <div class="am-item"><i class='bx bx-wifi'></i> <span>High-Speed Wi-Fi</span></div>
                        <div class="am-item"><i class='bx bx-spray-can'></i> <span>Cleaning Service</span></div>
                        <div class="am-item"><i class='bx bx-key'></i> <span>Keycard Access</span></div>
                    </div>
                </section>

                <!-- แผนที่ Location (Google Maps) -->
                <section class="lux-section">
                    <h2>สถานที่ตั้ง (Location)</h2>
                    <div style="width: 100%; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 20px rgba(0,0,0,0.05); margin-bottom: 15px;">
                        <iframe 
                            src="https://maps.google.com/maps?q=คณะวิทยาศาสตร์ประยุกต์%20มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ&t=&z=16&ie=UTF8&iwloc=&output=embed" 
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
                        <span>ทำเลทอง ใกล้มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ (มจพ.) เดินทางสะดวกสบายด้วยรถสาธารณะ มีร้านสะดวกซื้อ 7-11 ป้ายรถเมล์ และวินมอเตอร์ไซค์หน้าปากซอย</span>
                    </p>
                </section>

            </article>

            <aside class="lux-sidebar">
                <div class="lux-booking-card">
                    <div class="lux-price-row">
                        <span class="lux-price">฿${formattedPrice}</span>
                        <span class="lux-period">/ เดือน</span>
                    </div>
                    
                    <div class="lux-status">
                        <span class="lux-dot" style="background-color: ${statusColor};"></span>
                        <span style="color: ${statusColor}; font-weight: 500;">${statusText}</span>
                    </div>
                    ${room.availabilityEstimated ? `<small style="display:block; color:#64748b; margin-top:6px;">* สถานะสำรองเมื่อเชื่อมต่อฐานข้อมูลไม่ได้ โปรดติดต่อสอบถามก่อนเข้าพัก</small>` : ''}
                    
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
            </aside>
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
