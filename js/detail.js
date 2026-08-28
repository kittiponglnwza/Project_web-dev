document.addEventListener("DOMContentLoaded", () => {
    // ดึง parameter 'id' จาก URL (เช่น room-detail.html?id=1)
    const urlParams = new URLSearchParams(window.location.search);
    const roomId = urlParams.get('id');

    if (roomId) {
        fetchRoomDetail(roomId);
    } else {
        document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center;'>⚠️ ไม่พบรหัสห้องพัก กรุณากลับไปเลือกห้องใหม่ที่หน้าแรก</p>";
    }
});

function fetchRoomDetail(id) {
    // ใช้ Ajax ดึงไฟล์ JSON
    fetch("data/rooms.json")
        .then(response => {
            if (!response.ok) throw new Error("ไม่สามารถโหลดข้อมูลได้");
            return response.json();
        })
        .then(data => {
            // ค้นหาห้องที่ id ตรงกับที่คลิกมา
            const room = data.find(r => r.id == id);
            
            if (room) {
                renderRoomDetail(room);
            } else {
                document.getElementById("room-detail-container").innerHTML = "<p style='text-align:center;'>⚠️ ไม่พบข้อมูลห้องพักที่ท่านค้นหา</p>";
            }
        })
        .catch(error => console.error("Error:", error));
}

function renderRoomDetail(room) {
    const container = document.getElementById("room-detail-container");
    
    // แปลงตัวเลขราคา
    const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
    const statusText = room.isAvailable ? `ว่าง ${room.availableCount} ห้อง` : "เต็มแล้ว";
    const statusClass = room.isAvailable ? "status-available" : "status-full";

    // สร้าง Gallery รูปภาพทั้งหมดที่มี
    let galleryHTML = '<div class="detail-gallery">';
    room.images.forEach(imgUrl => {
        galleryHTML += `<img src="${imgUrl}" alt="${room.type}">`;
    });
    galleryHTML += '</div>';

    // วาดเนื้อหาลงไปใน Container (DOM Manipulation)
    container.innerHTML = `
        <a href="index.html" class="back-link">&#10094; ย้อนกลับ</a>
        
        <div class="detail-header">
            <h2>${room.type}</h2>
            <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        
        ${galleryHTML}
        
        <div class="detail-info">
            <h3 class="price">ราคา: ${formattedPrice} บาท/เดือน</h3>
            <div class="description-box">
                <h4>รายละเอียดห้องพัก</h4>
                <p>${room.description}</p>
                <br>
                <h4>สิ่งอำนวยความสะดวกส่วนกลาง</h4>
                <ul style="margin-left: 20px; color: #555;">
                    <li>ระบบรักษาความปลอดภัย คีย์การ์ด และ CCTV 24 ชม.</li>
                    <li>ที่จอดรถมอเตอร์ไซค์และรถยนต์</li>
                    <li>เครื่องซักผ้าหยอดเหรียญและตู้กดน้ำ</li>
                    <li>ฟรี Wi-Fi ส่วนกลาง</li>
                </ul>
            </div>
            
            <a href="#" class="btn-book" onclick="alert('✅ จำลองการจองสำเร็จ! (ติดต่อฐานข้อมูลในอนาคต)'); return false;">ติดต่อจองห้องพัก</a>
        </div>
    `;
}
