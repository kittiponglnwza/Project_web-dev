let currentUserEmail = "";

// ฟังก์ชันสลับหน้าต่าง (Tabs) แบบ Single Page Application
window.switchTab = function(tabName) {
    // 1. ซ่อนเนื้อหาทั้งหมด
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    // 2. ลบ active ออกจากเมนูทั้งหมด
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // 3. แสดงเนื้อหาที่เลือก
    document.getElementById('view-' + tabName).classList.add('active');
    // 4. ไฮไลท์เมนูที่เลือก
    document.getElementById('tab-' + tabName).classList.add('active');

    // ถ้ากดเข้ามาหน้าบิลหรือแจ้งซ่อม ให้รีเฟรชข้อมูล
    if(tabName === 'billing') fetchBills();
    if(tabName === 'maintenance') fetchMaintenance();
};

document.addEventListener("DOMContentLoaded", async () => {
    // 1. ตรวจสอบการเข้าสู่ระบบ
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = "login.html";
        return;
    }
    
    // 2. โหลดข้อมูลผู้ใช้
    const user = session.user;
    currentUserEmail = user.email;
    
    let fullName = user.email;
    let phone = "ไม่ระบุ";
    
    if (user.user_metadata && user.user_metadata.full_name) {
        fullName = (user.user_metadata.title || "") + user.user_metadata.full_name;
        phone = user.user_metadata.phone || "ไม่ระบุ";
    }
    
    // อัปเดต UI 
    document.getElementById("welcome-text").innerText = "สวัสดี, " + fullName;
    document.getElementById("profile-name").innerText = fullName.split(' ')[0];
    
    document.getElementById("prof-email").innerText = user.email;
    document.getElementById("prof-name").innerText = fullName;
    document.getElementById("prof-phone").innerText = phone;

    // 3. โหลดข้อมูลจำลอง
    loadMockData();

    // 4. ผูกระบบฟอร์มแจ้งซ่อม (จำลองการทำงาน)
    const maintenanceForm = document.getElementById("maintenanceForm");
    if(maintenanceForm) {
        maintenanceForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const title = document.getElementById("m_title").value;
            const desc = document.getElementById("m_desc").value;
            
            alert("ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว: " + title);
            
            // Escape HTML เพื่อป้องกัน XSS
            function escapeHTML(str) {
                const div = document.createElement('div');
                div.textContent = str;
                return div.innerHTML;
            }
            
            const list = document.getElementById("maintenance-list");
            const newRow = `
                <tr>
                    <td><strong>${escapeHTML(title)}</strong><br><small style="color:#6b7280">${escapeHTML(desc)}</small></td>
                    <td>เพิ่งแจ้ง</td>
                    <td><span class="status-badge status-pending">กำลังรอดำเนินการ</span></td>
                </tr>
            `;
            if(list.innerHTML.includes("ยังไม่มีประวัติแจ้งซ่อม")) list.innerHTML = "";
            list.innerHTML = newRow + list.innerHTML;
            
            maintenanceForm.reset();
        });
    }
});

function loadMockData() {
    // บิลค้างชำระ
    document.getElementById("dash-bill").innerText = "5,200";
    document.getElementById("billing-list").innerHTML = `
        <tr>
            <td>ตุลาคม 2567</td>
            <td>ค่าเช่า + ค่าน้ำค่าไฟ</td>
            <td>5,200</td>
            <td><span class="status-badge status-pending">ค้างชำระ</span></td>
            <td><button class="lux-btn" style="padding: 6px 15px; font-size:0.85rem;" onclick="alert('ระบบชำระเงินจำลอง (รอเชื่อมต่อ)')">ชำระเงิน</button></td>
        </tr>
        <tr>
            <td>กันยายน 2567</td>
            <td>ค่าเช่า + ค่าน้ำค่าไฟ</td>
            <td>4,800</td>
            <td><span class="status-badge status-paid">ชำระแล้ว</span></td>
            <td>-</td>
        </tr>
    `;

    // แจ้งซ่อม
    document.getElementById("maintenance-list").innerHTML = `
        <tr>
            <td><strong>แอร์มีน้ำหยด</strong><br><small style="color:#6b7280">น้ำหยดลงมาตรงเตียง</small></td>
            <td>10 ต.ค. 67</td>
            <td><span class="status-badge status-paid">เสร็จสิ้น</span></td>
        </tr>
    `;
}

function fetchBills() {
    // Placeholder สำหรับดึงบิลจาก DB ในอนาคต
}

function fetchMaintenance() {
    // Placeholder สำหรับดึงเรื่องแจ้งซ่อมจาก DB ในอนาคต
}
