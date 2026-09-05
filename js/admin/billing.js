let tenantProfiles = [];
let allBills = [];
let currentMonthBills = [];
let uniqueMonths = [];

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    // Set update time
    const now = new Date();
    document.getElementById('last-update').innerText = now.toLocaleString('th-TH');

    await loadTenantsAndCheckExpiry();
    await loadBills();
});

async function loadTenantsAndCheckExpiry() {
    try {
        const { data, error } = await supabaseClient.from('tenant_profiles').select('*').neq('role', 'admin');
        if(data) {
            tenantProfiles = data;
            
            const today = new Date();
            const expiryList = document.getElementById('expiry-list');
            const alertBox = document.getElementById('expiry-alert');
            let expiryCount = 0;
            
            expiryList.innerHTML = '';

            tenantProfiles.forEach(t => {
                if (t.end_date) {
                    const endDate = new Date(t.end_date);
                    const diffTime = endDate - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays <= 30) {
                        expiryCount++;
                        let statusText = diffDays < 0 ? `หมดสัญญาแล้ว ${Math.abs(diffDays)} วัน` : `เหลือ ${diffDays} วัน`;
                        let color = diffDays < 0 ? 'color: #dc2626;' : 'color: #ea580c;';
                        
                        expiryList.innerHTML += `
                            <li>
                                <span>ห้อง ${escapeHTML(t.room_no || 'ไม่ระบุ')}</span> 
                                ${escapeHTML(t.email)} - <b style="${color}">${escapeHTML(statusText)}</b> (สิ้นสุด ${endDate.toLocaleDateString('th-TH')})
                            </li>
                        `;
                    }
                }
            });

            if (expiryCount > 0) {
                alertBox.style.display = 'block';
            }
        } else if (error) {
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
}

async function loadBills() {
    try {
        const { data, error } = await supabaseClient
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            data.forEach(bill => {
                // ดึงเลขห้องปัจจุบันจาก tenantProfiles เสมอ เพื่อไม่ให้ข้อมูลขัดแย้งกันกรณีเปลี่ยนห้อง
                const tenant = tenantProfiles.find(t => t.email === bill.email);
                if (tenant && tenant.room_no) {
                    bill.room_no = tenant.room_no;
                } else if (!bill.room_no || bill.room_no === 'null') {
                    bill.room_no = 'ไม่ระบุ';
                }
            });
            
            allBills = data;
            
            // Extract unique months
            uniqueMonths = [...new Set(data.map(b => b.month))];
            const select = document.getElementById('monthSelect');
            select.innerHTML = '';
            
            if (uniqueMonths.length === 0) {
                select.innerHTML = '<option value="">ไม่มีข้อมูลบิล</option>';
                renderBills([]);
                return;
            }

            // Populate dropdown
            uniqueMonths.forEach(m => {
                select.innerHTML += `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`;
            });
            
            // Trigger change to load the first month
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
    currentMonthBills = allBills.filter(b => b.month === selectedMonth);
    
    // Calculate Stats
    let totalRev = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let countPaid = 0;
    let countUnpaid = 0;
    let countChecking = 0;

    currentMonthBills.forEach(b => {
        totalRev += b.amount;
        if (b.status === 'paid') {
            totalPaid += b.amount;
            countPaid++;
        } else if (b.status === 'checking') {
            countChecking++;
            totalUnpaid += b.amount;
            countUnpaid++;
        } else {
            totalUnpaid += b.amount;
            countUnpaid++;
        }
    });

    document.getElementById('stat-total').innerText = totalRev.toLocaleString() + ' ฿';
    document.getElementById('stat-paid').innerText = totalPaid.toLocaleString() + ' ฿';
    document.getElementById('stat-unpaid').innerText = totalUnpaid.toLocaleString() + ' ฿';
    document.getElementById('count-paid').innerText = countPaid;
    document.getElementById('count-unpaid').innerText = countUnpaid;
    document.getElementById('stat-checking').innerText = countChecking;

    // Reset filters and render
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn').classList.add('active'); // set "All" active
    
    renderBills(currentMonthBills);
};

window.filterBills = function(status, btnElement) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    if(status === 'all') renderBills(currentMonthBills);
    else renderBills(currentMonthBills.filter(b => b.status === status || (status === 'unpaid' && b.status === 'pending')));
};

function renderBills(bills) {
    const tbody = document.getElementById('bills-table-body');
    tbody.innerHTML = '';

    if (bills.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">ไม่มีข้อมูลบิลสำหรับเดือนนี้</td></tr>';
        return;
    }

    // Sort by room no
    bills.sort((a, b) => {
        const ra = parseInt(a.room_no) || 9999;
        const rb = parseInt(b.room_no) || 9999;
        return ra - rb;
    });

    bills.forEach(bill => {
        const utilTotal = (bill.elec_fee || 0) + (bill.water_fee || 0) + (bill.other_fee || 0);
        
        let badge = '';
        let actionBtn = '';

        if (bill.status === 'paid') {
            badge = '<span class="status-badge st-paid">ชำระแล้ว</span>';
            actionBtn = `
                <button class="action-btn" title="ดูสลิป" onclick="openSlipModal('${escapeHTML(bill.id)}')" style="color:#3b82f6;"><i class='bx bx-image'></i></button>
                <button class="action-btn" title="เรียบร้อย" onclick="alert('บิลนี้เคลียร์แล้ว')" style="color:#10b981;"><i class='bx bx-check-double'></i></button>
            `;
        } else if (bill.status === 'checking') {
            badge = '<span class="status-badge st-checking">รอตรวจสลิป</span>';
            actionBtn = `
                <button class="action-btn" title="ดูสลิป" onclick="openSlipModal('${escapeHTML(bill.id)}')" style="color:#3b82f6;"><i class='bx bx-image'></i></button>
                <button class="action-btn btn-approve" title="อนุมัติสลิป" onclick="approveSlip('${escapeHTML(bill.id)}')" style="color:#10b981;"><i class='bx bx-check'></i></button>
                <button class="action-btn" title="ให้ส่งใหม่" onclick="rejectSlip('${escapeHTML(bill.id)}')" style="color:#ef4444;"><i class='bx bx-x'></i></button>
            `;
        } else {
            badge = '<span class="status-badge st-unpaid">ค้างชำระ</span>';
            actionBtn = `<button class="action-btn" title="ลบบิลทิ้ง" onclick="deleteBill('${escapeHTML(bill.id)}')" style="color:#ef4444;"><i class='bx bx-trash'></i></button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;">
                    <div style="background: #f1f5f9; display: inline-block; padding: 4px 10px; border-radius: 6px; border-left: 3px solid #0f172a;">
                        ${escapeHTML(bill.room_no || 'ไม่ระบุ')}
                    </div>
                </td>
                <td>${escapeHTML(bill.month)}</td>
                <td>${(bill.rent_fee || 0).toLocaleString()}</td>
                <td style="color: #64748b;">${utilTotal.toLocaleString()}</td>
                <td style="font-weight: 600; color: #dc2626; font-size: 15px;">${bill.amount.toLocaleString()}</td>
                <td>${badge}</td>
                <td style="text-align: center;">${actionBtn}</td>
            </tr>
        `;
    });
}

window.openSlipModal = function(billId) {
    const bill = allBills.find(b => b.id == billId);
    const slipImage = bill ? bill.slip_image : null;
    
    if (slipImage && slipImage !== 'undefined') {
        document.getElementById('slipImagePreview').src = slipImage;
        document.getElementById('slipModal').style.display = 'flex';
    } else {
        alert("บิลนี้ไม่มีรูปสลิปในระบบครับ");
    }
};

window.closeSlipModal = function() {
    document.getElementById('slipModal').style.display = 'none';
    document.getElementById('slipImagePreview').src = '';
};

window.rejectSlip = async function(billId) {
    if(confirm('คุณแน่ใจหรือไม่ว่าต้องการ "ปฏิเสธ" สลิปนี้? \nบิลจะถูกเปลี่ยนกลับเป็น "ค้างชำระ" เพื่อให้ลูกบ้านส่งสลิปใหม่')) {
        try {
            const { error } = await supabaseClient
                .from('bills')
                .update({ status: 'pending', slip_image: null })
                .eq('id', billId);
            
            if(!error) {
                alert('ปฏิเสธสลิปเรียบร้อยแล้ว ลูกบ้านสามารถส่งสลิปใหม่ได้');
                loadBills();
            } else {
                alert('เกิดข้อผิดพลาด: ' + error.message);
                console.error(error);
            }
        } catch (err) {
            console.error(err);
        }
    }
};

window.approveSlip = async function(billId) {
    if(confirm('ยืนยันว่าตรวจสอบสลิปโอนเงินถูกต้อง และต้องการเปลี่ยนสถานะเป็น "ชำระแล้ว" ใช่หรือไม่?')) {
        try {
            const { error } = await supabaseClient
                .from('bills')
                .update({ status: 'paid' })
                .eq('id', billId);
            
            if(!error) {
                alert('อนุมัติบิลเรียบร้อย!');
                loadBills(); 
            } else {
                alert('เกิดข้อผิดพลาดในการอนุมัติ: ' + error.message);
                console.error(error);
            }
        } catch (err) {
            console.error(err);
        }
    }
};

window.deleteBill = async function(billId) {
    if(confirm('ต้องการลบบิลนี้ทิ้งใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)')) {
        try {
            const { error } = await supabaseClient.from('bills').delete().eq('id', billId);
            if(!error) {
                loadBills();
            } else {
                alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
                console.error(error);
            }
        } catch (err) {
            console.error(err);
        }
    }
};
