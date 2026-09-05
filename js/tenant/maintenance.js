let userEmail = "";

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    const auth = await requireTenant(); 
    if (!auth) return; 
    const user = auth.user;
    userEmail = user.email;
    
    fetchMaintenance();
});

async function fetchMaintenance() {
    try {
        const { data: requests, error } = await supabaseClient
            .from('maintenance_requests')
            .select('*')
            .eq('email', userEmail)
            .order('created_at', { ascending: false });
            
        const list = document.getElementById("maintenance-list");
        list.innerHTML = "";
        
        if (error || !requests || requests.length === 0) {
            list.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#6b7280;">ยังไม่มีประวัติการแจ้งซ่อม</td></tr>`;
            return;
        }
        
        requests.forEach(req => {
            let statusHtml = "";
            if (req.status === "completed") {
                statusHtml = `<span class="status-badge status-paid">เสร็จสิ้น</span>`;
            } else if (req.status === "in_progress") {
                statusHtml = `<span class="status-badge status-pending" style="background:#e0e7ff; color:#4f46e5;">กำลังซ่อม</span>`;
            } else {
                statusHtml = `<span class="status-badge status-pending">รอดำเนินการ</span>`;
            }
            
            let d = new Date(req.created_at);
            let dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

            list.innerHTML += `
                <tr>
                    <td><strong>${escapeHTML(req.title)}</strong><br><small style="color:#6b7280">${escapeHTML(req.description || '-')}</small></td>
                    <td>${dateStr}</td>
                    <td>${statusHtml}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching maintenance:", error);
    }
}

document.getElementById("maintenanceForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const btn = document.getElementById("submitBtn");
    btn.innerHTML = "กำลังส่ง...";
    btn.disabled = true;

    const title = document.getElementById("m_title").value;
    const desc = document.getElementById("m_desc").value;
    
    try {
        const { error } = await supabaseClient
            .from('maintenance_requests')
            .insert([{ email: userEmail, title: title, description: desc }]);
            
        if (error) {
            alert("เกิดข้อผิดพลาดในการแจ้งซ่อม: " + error.message);
        } else {
            alert("ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว แอดมินจะรีบตรวจสอบให้ครับ!");
            this.reset();
            fetchMaintenance(); 
        }
    } catch (error) {
        console.error("Error submitting maintenance:", error);
    }
    
    btn.innerHTML = "ส่งเรื่องแจ้งซ่อม <i class='bx bx-send'></i>";
    btn.disabled = false;
});
