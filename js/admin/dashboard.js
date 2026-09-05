document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    const now = new Date();
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').innerText = 'ข้อมูลอัปเดตล่าสุด: ' + now.toLocaleDateString('th-TH', dateOpts);
    
    await fetchDashboardData();
    await loadAnnouncements();

    document.getElementById('announcement-form').addEventListener('submit', createAnnouncement);
});

async function loadAnnouncements() {
    try {
        const { data, error } = await supabaseClient
            .from('announcements')
            .select('*')
            .order('created_at', { ascending: false });

        const list = document.getElementById('admin-announcement-list');
        if (error) {
            list.innerHTML = `<div style="color: #ef4444; padding: 10px;">เกิดข้อผิดพลาดในการโหลดประกาศ: ${escapeHTML(error.message)}</div>`;
            console.error(error);
            return;
        }

        if (data.length === 0) {
            list.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 20px;">ยังไม่มีประกาศ</div>`;
            return;
        }

        list.innerHTML = data.map(ann => {
            let color = '#3b82f6';
            if (ann.type === 'warning') color = '#eab308';
            if (ann.type === 'urgent') color = '#ef4444';

            const d = new Date(ann.created_at);
            const dateStr = d.toLocaleDateString('th-TH', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });

            return `
                <div style="background: #f8fafc; border-left: 4px solid ${color}; padding: 15px; border-radius: 8px; position: relative;">
                    <button onclick="deleteAnnouncement('${escapeHTML(ann.id)}')" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 16px;"><i class='bx bx-trash'></i></button>
                    <h5 style="margin: 0 0 5px; color: #0f172a; font-size: 15px; padding-right: 20px;">${escapeHTML(ann.title)}</h5>
                    <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">${escapeHTML(ann.content)}</p>
                    <small style="color: #94a3b8; font-size: 11px;">ประกาศเมื่อ: ${dateStr}</small>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
    }
}

async function createAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById('announce-title').value.trim();
    const content = document.getElementById('announce-content').value.trim();
    const type = document.getElementById('announce-type').value;

    if (!title || !content) return;

    try {
        const { error } = await supabaseClient.from('announcements').insert([{ title, content, type }]);
        if (!error) {
            document.getElementById('announcement-form').reset();
            loadAnnouncements();
        } else {
            alert("เกิดข้อผิดพลาด: " + error.message);
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
}

window.deleteAnnouncement = async function(id) {
    if(confirm("แน่ใจหรือไม่ว่าต้องการลบประกาศนี้?")) {
        try {
            const { error } = await supabaseClient.from('announcements').delete().eq('id', id);
            if(!error) loadAnnouncements();
            else console.error(error);
        } catch (err) {
            console.error(err);
        }
    }
};

let globalBills = [];
let revenueChartInstance = null;

async function fetchDashboardData() {
    try {
        // 1. Fetch Tenants
        const { data: tenants, error: err1 } = await supabaseClient.from('tenant_profiles').select('*').neq('role', 'admin');
        if (err1) console.error(err1);
        document.getElementById('stat-tenants').innerText = tenants ? tenants.length : 0;

        // 2. Fetch Maintenance
        const { data: maintenance, error: err2 } = await supabaseClient.from('maintenance_requests').select('*');
        if (err2) console.error(err2);
        const pendingMaintenance = maintenance ? maintenance.filter(m => m.status !== 'completed') : [];
        document.getElementById('stat-maintenance').innerText = pendingMaintenance.length;

        // 3. Fetch Chats
        const { data: chats, error: err3 } = await supabaseClient.from('messages').select('*').eq('receiver_email', 'admin').eq('is_read', false);
        if (err3) console.error(err3);
        document.getElementById('stat-chat').innerText = chats ? chats.length : 0;

        // 4. Fetch Bills
        const { data: bills, error: err4 } = await supabaseClient.from('bills').select('*');
        if (err4) console.error(err4);
        let currentRevenue = 0;
        let pendingSlips = 0;

        if (bills) {
            globalBills = bills;
            const allMonths = [...new Set(bills.map(b => b.month))];
            bills.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            const latestMonth = allMonths.length > 0 ? bills[bills.length-1].month : '';

            // Populate Year Filter Dropdown
            const allYears = [...new Set(bills.map(b => (b.month.split(' ')[1] || '')))].filter(y => y);
            const select = document.getElementById('chart-year-filter');
            select.innerHTML = '<option value="all">รวมทุกปี</option>';
            allYears.sort().reverse().forEach(y => {
                select.innerHTML += `<option value="${escapeHTML(y)}">ปี ${escapeHTML(y)}</option>`;
            });

            bills.forEach(b => {
                if (b.status === 'checking') pendingSlips++;
                if (b.status === 'paid' && b.month === latestMonth) {
                    currentRevenue += b.amount;
                }
            });
        }
        document.getElementById('stat-revenue').innerText = currentRevenue.toLocaleString() + ' ฿';

        // Check Contract Expiry
        let expiringContracts = 0;
        if (tenants) {
            const now = new Date();
            tenants.forEach(t => {
                if (t.end_date) {
                    const endDate = new Date(t.end_date);
                    const diffTime = endDate - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 30) expiringContracts++;
                }
            });
        }

        // Render Alerts & Initial Chart
        renderAlerts(pendingMaintenance.length, pendingSlips, expiringContracts, (chats ? chats.length : 0));
        filterChart();
    } catch (err) {
        console.error(err);
    }
}

function renderAlerts(maintenanceCount, slipsCount, expiryCount, chatCount) {
    const list = document.getElementById('alert-list');
    list.innerHTML = '';

    let hasAlerts = false;

    if (slipsCount > 0) {
        list.innerHTML += `
            <a href="billing.html" class="alert-item urgent">
                <i class='bx bx-money alert-icon'></i>
                <span class="alert-text">มีสลิปโอนเงินรอการตรวจสอบ</span>
                <span class="alert-count" style="color:#ef4444">${slipsCount}</span>
            </a>`;
        hasAlerts = true;
    }

    if (maintenanceCount > 0) {
        list.innerHTML += `
            <a href="maintenance.html" class="alert-item warning">
                <i class='bx bx-wrench alert-icon'></i>
                <span class="alert-text">รายการแจ้งซ่อมรอดำเนินการ</span>
                <span class="alert-count" style="color:#f59e0b">${maintenanceCount}</span>
            </a>`;
        hasAlerts = true;
    }

    if (expiryCount > 0) {
        list.innerHTML += `
            <a href="billing.html" class="alert-item warning">
                <i class='bx bx-time alert-icon'></i>
                <span class="alert-text">สัญญาเช่าใกล้หมดอายุ (ภายใน 30 วัน)</span>
                <span class="alert-count" style="color:#f59e0b">${expiryCount}</span>
            </a>`;
        hasAlerts = true;
    }

    if (chatCount > 0) {
        list.innerHTML += `
            <a href="chat.html" class="alert-item info">
                <i class='bx bx-message-dots alert-icon'></i>
                <span class="alert-text">ข้อความใหม่จากผู้เช่า</span>
                <span class="alert-count" style="color:#3b82f6">${chatCount}</span>
            </a>`;
        hasAlerts = true;
    }

    if (!hasAlerts) {
        list.innerHTML = `
            <div style="text-align: center; color: #10b981; padding: 30px 10px;">
                <i class='bx bx-check-circle' style="font-size: 40px; margin-bottom: 10px;"></i>
                <br>ไม่มีรายการที่ต้องจัดการด่วน
            </div>
        `;
    }
}

window.filterChart = function() {
    const selectedYear = document.getElementById('chart-year-filter').value;
    let revenueByMonth = {};
    
    globalBills.forEach(b => {
        if (b.status === 'paid') {
            const year = b.month.split(' ')[1] || '';
            if (selectedYear === 'all' || year === selectedYear) {
                revenueByMonth[b.month] = (revenueByMonth[b.month] || 0) + b.amount;
            }
        }
    });
    
    renderChart(revenueByMonth);
};

function renderChart(revenueByMonth) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    
    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    const labels = Object.keys(revenueByMonth);
    const data = labels.map(l => revenueByMonth[l]);

    if (labels.length === 0) {
        labels.push('ยังไม่มีข้อมูล');
        data.push(0);
    }

    let gradient = ctx.createLinearGradient(0, 0, 0, 350);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    revenueChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'รายรับ (บาท)',
                data: data,
                backgroundColor: gradient,
                borderColor: '#3b82f6',
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4 // Makes the line smooth/curved
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0f172a',
                    titleFont: { family: 'Prompt', size: 14 },
                    bodyFont: { family: 'Prompt', size: 14 },
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + ' บาท';
                        }
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    grid: { borderDash: [5, 5] },
                    ticks: { font: { family: 'Prompt' } }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Prompt' } }
                }
            }
        }
    });
}
