function setActiveSidebarLink(sidebar) {
    const currentPage = window.location.pathname.split("/").pop().toLowerCase();
    const activePage = currentPage === "create_bill.html" ? "billing.html" : currentPage;

    sidebar.querySelectorAll(".sidebar-links a[href]").forEach((link) => {
        const targetPage = link.getAttribute("href").split("/").pop().toLowerCase();
        link.classList.toggle("active", targetPage === activePage);
    });
}

function renderAdminSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="logo" style="margin-bottom: 0;">Dorminator Admin</div>
            <div class="sidebar-toggle" id="sidebar-toggle">
                <i class="bx bx-menu"></i>
            </div>
        </div>
        <div class="sidebar-links" style="flex: 1;">
            <a href="dashboard.html"><i class="bx bxs-dashboard"></i> ภาพรวม (Dashboard)</a>
            <a href="billing.html"><i class="bx bx-receipt"></i> จัดการบิล / ตรวจสลิป</a>
            <a href="promotions.html"><i class="bx bx-gift"></i> โปรโมชั่น</a>
            <a href="users.html"><i class="bx bx-user-pin"></i> จัดการผู้เช่า / ห้องพัก</a>
            <a href="maintenance.html"><i class="bx bx-wrench"></i> รายการแจ้งซ่อม</a>
            <a href="chat.html"><i class="bx bxs-message-dots"></i> ข้อความ (Chat)</a>
            <a href="#" class="logout" onclick="logout()"><i class="bx bx-log-out"></i> ออกจากระบบ</a>
        </div>
    `;

    setActiveSidebarLink(sidebar);
}

function renderTenantSidebar() {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <div class="sidebar-logo" style="margin-bottom: 0;">Dorminator</div>
            <div class="sidebar-toggle">
                <i class="bx bx-menu"></i>
            </div>
        </div>
        <div class="sidebar-links" style="flex: 1;">
            <a href="dashboard.html" class="nav-link"><i class="bx bx-grid-alt"></i> ภาพรวม (Dashboard)</a>
            <a href="billing.html" class="nav-link"><i class="bx bx-receipt"></i> รายการค้างชำระ</a>
            <a href="maintenance.html" class="nav-link"><i class="bx bx-wrench"></i> แจ้งซ่อม/ปัญหา</a>
            <a href="profile.html" class="nav-link"><i class="bx bx-user"></i> ข้อมูลส่วนตัว</a>
            <a href="chat.html" class="nav-link"><i class="bx bx-message-square-dots"></i> ติดต่อนิติบุคคล</a>
            <a href="#" class="nav-link logout-btn" onclick="logout()"><i class="bx bx-log-out"></i> ออกจากระบบ</a>
        </div>
    `;

    setActiveSidebarLink(sidebar);
}
