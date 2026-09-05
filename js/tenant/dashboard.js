document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    const auth = await requireTenant(); 
    if (!auth) return; 
    const user = auth.user;
    
    let fullName = user.email;
    let shortName = "ผู้เช่า";

    if (user.user_metadata && user.user_metadata.full_name) {
        let title = user.user_metadata.title || "";
        let fName = user.user_metadata.full_name.trim();
        
        // แก้บั๊กคำนำหน้าซ้ำซ้อน
        if (fName.startsWith(title)) {
            fullName = fName;
        } else {
            fullName = title + " " + fName;
        }

        // สกัดเอาเฉพาะชื่อคำแรกไปแสดงมุมขวาบน (ตัดคำนำหน้าออก)
        let nameWithoutTitle = fName.replace(/^(นาย|นางสาว|นาง)\s*/, '');
        shortName = nameWithoutTitle.split(' ')[0];
    }

    // โหลดข้อมูล Dashboard (ต้องอยู่นอก if เพื่อให้ทำงานเสมอ)
    loadDashboardData(user.email);
    loadTenantAnnouncements();
    
    document.getElementById("welcome-text").innerText = "สวัสดี, " + fullName;
    document.getElementById("profile-name").innerText = shortName;
});

async function loadDashboardData(email) {
    try {
        // 1. ดึงยอดบิลค้างชำระรวม
        const { data: bills, error: billsError } = await supabaseClient
            .from('bills')
            .select('amount')
            .eq('email', email)
            .eq('status', 'pending');
            
        if (billsError) throw billsError;
        
        let totalDue = 0;
        if (bills) {
            bills.forEach(b => totalDue += b.amount);
        }
        document.querySelector(".dashboard-cards .card:nth-child(1) .card-value").innerHTML = 
            totalDue > 0 ? `${totalDue.toLocaleString()} <span style="font-size: 1rem; color: #6b7280; font-weight: 400;">บาท</span>` : `0 <span style="font-size: 1rem; color: #6b7280; font-weight: 400;">บาท</span>`;

        // 2. สถานะแจ้งซ่อมล่าสุด
        const { data: requests, error: requestsError } = await supabaseClient
            .from('maintenance_requests')
            .select('status, title')
            .eq('email', email)
            .order('created_at', { ascending: false })
            .limit(1);

        if (requestsError) throw requestsError;

        let mStatusEl = document.querySelector(".dashboard-cards .card:nth-child(2) .card-value");
        if (requests && requests.length > 0) {
            let r = requests[0];
            if (r.status === 'pending') {
                mStatusEl.innerHTML = `รอดำเนินการ <br><span style="font-size: 0.9rem; color: #6b7280; font-weight: 400;">(${escapeHTML(r.title)})</span>`;
                mStatusEl.style.color = "#d97706";
            } else if (r.status === 'in_progress') {
                mStatusEl.innerHTML = `กำลังซ่อม <br><span style="font-size: 0.9rem; color: #6b7280; font-weight: 400;">(${escapeHTML(r.title)})</span>`;
                mStatusEl.style.color = "#4f46e5";
            } else {
                mStatusEl.innerHTML = `เสร็จสิ้น <br><span style="font-size: 0.9rem; color: #6b7280; font-weight: 400;">(${escapeHTML(r.title)})</span>`;
                mStatusEl.style.color = "#059669";
            }
        } else {
            mStatusEl.innerHTML = `ปกติ`;
            mStatusEl.style.color = "#059669";
        }

        // 3. ข้อมูลห้องพัก
        const { data: profile, error: profileError } = await supabaseClient
            .from('tenant_profiles')
            .select('room_no')
            .eq('email', email)
            .single();
        
        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        let roomEl = document.querySelector(".dashboard-cards .card:nth-child(3) .card-value");
        if (profile && profile.room_no) {
            roomEl.innerHTML = `ห้อง ${escapeHTML(profile.room_no)}`;
        } else {
            roomEl.innerHTML = `รอการจัดห้อง`;
            roomEl.style.fontSize = "1.2rem";
        }
    } catch (error) {
        console.error("Error loading dashboard data:", error);
    }
}

async function loadTenantAnnouncements() {
    try {
        const { data, error } = await supabaseClient
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        const list = document.getElementById('tenant-announcements');
        if (error) {
            list.innerHTML = `<div style="color: #ef4444; padding: 10px;">เกิดข้อผิดพลาดในการโหลดข่าวสาร</div>`;
            return;
        }

        if (!data || data.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #9ca3af; padding: 20px;">ยังไม่มีข่าวประชาสัมพันธ์ในขณะนี้</div>`;
            return;
        }

        list.innerHTML = data.map(ann => {
            let color = '#3b82f6'; // default info
            if (ann.type === 'warning') color = '#d4af37'; // yellow-ish theme
            if (ann.type === 'urgent') color = '#ef4444'; // red

            return `
                <div style="padding: 15px; border-left: 4px solid ${color}; background: #f9fafb; margin-bottom: 10px; border-radius: 4px;">
                    <strong style="display: block; color: #111; margin-bottom: 5px;">${escapeHTML(ann.title)}</strong>
                    <span style="color: #6b7280; font-size: 0.9rem; line-height: 1.5; display: block;">${escapeHTML(ann.content)}</span>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Error loading announcements:", error);
        document.getElementById('tenant-announcements').innerHTML = `<div style="color: #ef4444; padding: 10px;">เกิดข้อผิดพลาดในการโหลดข่าวสาร</div>`;
    }
}
