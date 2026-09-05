let allRequests = [];
let currentMonthRequests = [];
let tenantProfiles = {};
const thaiMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    
    const now = new Date();
    document.getElementById('last-update').innerText = now.toLocaleString('th-TH');

    await loadProfiles();
    await loadRequests();
});

async function loadProfiles() {
    try {
        const { data, error } = await supabaseClient.from('tenant_profiles').select('email, room_no');
        if(data) {
            data.forEach(p => {
                tenantProfiles[p.email] = p.room_no || '-';
            });
        } else if (error) {
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadRequests() {
    try {
        const { data, error } = await supabaseClient
            .from('maintenance_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            data.forEach(req => {
                const d = new Date(req.created_at);
                req.monthStr = `${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
            });
            
            allRequests = data;
            
            const uniqueMonths = [...new Set(data.map(r => r.monthStr))];
            const select = document.getElementById('monthSelect');
            select.innerHTML = '';
            
            if (uniqueMonths.length === 0) {
                select.innerHTML = '<option value="">ไม่มีข้อมูลแจ้งซ่อม</option>';
                window.changeMonth();
                return;
            }

            uniqueMonths.forEach(m => {
                select.innerHTML += `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`;
            });
            
            window.changeMonth();
        } else if (error) {
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
}

window.changeMonth = function() {
    const selectedMonth = document.getElementById('monthSelect').value;
    currentMonthRequests = allRequests.filter(r => r.monthStr === selectedMonth);
    
    let total = currentMonthRequests.length;
    let pending = 0;
    let completed = 0;

    currentMonthRequests.forEach(r => {
        if(r.status === 'completed') completed++;
        else pending++;
    });

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-completed').innerText = completed;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn').classList.add('active'); 
    
    renderTable(currentMonthRequests);
};

window.filterData = function(status, btnElement) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    if(status === 'all') renderTable(currentMonthRequests);
    else renderTable(currentMonthRequests.filter(r => r.status === status));
};

function renderTable(requests) {
    const tbody = document.getElementById('maintenance-table-body');
    tbody.innerHTML = '';

    if (requests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">ไม่มีรายการแจ้งซ่อมในเดือนนี้</td></tr>';
        return;
    }

    requests.forEach(req => {
        const roomNo = tenantProfiles[req.email] || 'ไม่ทราบห้อง';
        const d = new Date(req.created_at);
        const dateStr = d.toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
        
        let badge = '';
        let actionBtn = '';

        if (req.status === 'completed') {
            badge = '<span class="status-badge st-completed"><i class="bx bx-check"></i> ซ่อมเสร็จแล้ว</span>';
            actionBtn = `<span style="color:#94a3b8; font-size:12px;">เรียบร้อย</span>`;
        } else if (req.status === 'in_progress') {
            badge = '<span class="status-badge st-inprogress"><i class="bx bx-wrench"></i> กำลังดำเนินการ</span>';
            actionBtn = `<button class="btn-action btn-complete" onclick="updateStatus('${escapeHTML(req.id)}', 'completed')">กดเมื่อซ่อมเสร็จ</button>`;
        } else {
            badge = '<span class="status-badge st-pending"><i class="bx bx-time"></i> รอดำเนินการ</span>';
            actionBtn = `<button class="btn-action btn-inprogress" onclick="updateStatus('${escapeHTML(req.id)}', 'in_progress')">รับเรื่อง / กำลังซ่อม</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-size: 12px; color: #64748b;">${dateStr}</td>
                <td style="font-weight: 600; color: #0f172a;">
                    <div style="background: #f1f5f9; display: inline-block; padding: 4px 10px; border-radius: 6px; border-left: 3px solid #0f172a;">${escapeHTML(roomNo)}</div>
                </td>
                <td style="font-weight: 500;">${escapeHTML(req.title)}</td>
                <td style="font-size: 13px; color: #64748b;">${escapeHTML(req.description || '-')}</td>
                <td>${badge}</td>
                <td style="text-align: center;">${actionBtn}</td>
            </tr>
        `;
    });
}

window.updateStatus = async function(id, newStatus) {
    const req = allRequests.find(r => r.id == id);
    let confirmMsg = newStatus === 'in_progress' ? 
        'รับเรื่องและส่งสถานะ "กำลังดำเนินการ" ไปยังแชทของผู้เช่าใช่หรือไม่?' : 
        'ยืนยันว่าช่างได้ "ซ่อมเสร็จสิ้น" และส่งแจ้งเตือนไปที่แชทผู้เช่า?';
        
    if(confirm(confirmMsg)) {
        try {
            // อัปเดตสถานะการแจ้งซ่อม
            const { error: err1 } = await supabaseClient
                .from('maintenance_requests')
                .update({ status: newStatus })
                .eq('id', id);
            
            if(!err1) {
                // ส่งข้อความไปที่แชท
                const chatMessage = newStatus === 'in_progress' ? 
                    `[ระบบแจ้งซ่อม] 👨‍🔧 แอดมินรับเรื่องแจ้งซ่อมของคุณแล้ว และกำลังเตรียมดำเนินการแก้ไขปัญหา "${req.title}" ครับ` : 
                    `[ระบบแจ้งซ่อม] ✅ การซ่อมแซมปัญหา "${req.title}" ได้ดำเนินการเสร็จสิ้นเรียบร้อยแล้วครับ`;

                const { error: err2 } = await supabaseClient.from('messages').insert([{
                    sender_email: 'admin',
                    receiver_email: req.email,
                    message: chatMessage,
                    is_read: false
                }]);

                if (err2) {
                    console.error(err2);
                }

                alert('อัปเดตสถานะและส่งแจ้งเตือนเรียบร้อย!');
                loadRequests(); // รีเฟรช
            } else {
                console.error(err1);
            }
        } catch (err) {
            console.error(err);
        }
    }
};
