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
        fetchRoomsData();
    }
});

function fetchRoomsData() {
    fetch("data/rooms.json")
        .then(response => {
            if (!response.ok) throw new Error("Network response was not ok");
            return response.json();
        })
        .then(data => {
            renderRooms(data);
        })
        .catch(error => {
            console.error("Error fetching rooms:", error);
            document.getElementById("room-container").innerHTML = "<p>ไม่สามารถโหลดข้อมูลห้องพักได้</p>";
        });
}

function renderRooms(rooms) {
    const container = document.getElementById("room-container");
    container.innerHTML = ""; 

    rooms.forEach(room => {
        const card = document.createElement("article");
        card.className = "card";
        card.setAttribute("data-status", room.isAvailable ? "available" : "full");

        const formattedPrice = new Intl.NumberFormat('th-TH').format(room.price);
        const statusText = room.isAvailable ? `ว่าง ${room.availableCount} ห้อง` : "เต็มแล้ว";
        const statusClass = room.isAvailable ? "status-available" : "status-full";

        // เพิ่มแท็ก <img> และครอบเนื้อหาด้วย .card-content
        card.innerHTML = `
            <img src="${room.image}" alt="${room.type}" class="room-img">
            <div class="card-content">
                <h3>${room.type}</h3>
                <p><strong>รายละเอียด:</strong> ${room.description}</p>
                <p><strong>ราคา:</strong> ${formattedPrice} บาท/เดือน</p>
                <p><span class="status-badge ${statusClass}">${statusText}</span></p>
            </div>
        `;

        container.appendChild(card);
    });
}
