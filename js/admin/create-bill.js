let activeTenants = [];

window.getRoomDetails = function(roomNo) {
    if (!roomNo) return { type: '-', price: 0 };
    const num = parseInt(roomNo.toString().slice(-2));
    if (num >= 1 && num <= 4) return { type: 'S', price: 5500 };
    if (num >= 5 && num <= 10) return { type: 'M', price: 7500 };
    if (num >= 11 && num <= 99) return { type: 'XL', price: 9000 };
    return { type: '-', price: 0 };
};

document.addEventListener('DOMContentLoaded', async () => {
    initSidebar();

    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    const monthSelect = document.getElementById('b_month');
    const thaiMonths = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
    const d = new Date();
    let startMonth = d.getMonth() - 1; 
    let currentYear = d.getFullYear();
    
    for (let i = 0; i < 6; i++) { 
        let targetDate = new Date(currentYear, startMonth + i, 1);
        let mText = thaiMonths[targetDate.getMonth()];
        let yText = targetDate.getFullYear() + 543;
        let val = `${mText} ${yText}`;
        
        let option = document.createElement('option');
        option.value = val;
        option.text = val;
        
        if(targetDate.getMonth() === d.getMonth() && targetDate.getFullYear() === d.getFullYear()) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }
    
    await loadTenants();
    renderTable();
});

async function loadTenants() {
    try {
        const { data, error } = await supabaseClient.from('tenant_profiles').select('*').neq('role', 'admin').not('room_no', 'is', null);
        if(data) {
            activeTenants = data.filter(t => t.room_no.trim() !== '');
            document.getElementById('save-all-btn').innerHTML = `<i class='bx bx-save'></i> บันทึกบิลทั้งหมด (${activeTenants.length} ห้อง)`;
        } else if (error) {
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderTable() {
    const tbody = document.getElementById('rooms-table-body');
    tbody.innerHTML = '';

    if (activeTenants.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px;">ไม่มีผู้เช่าที่มีห้องในระบบ</td></tr>';
        return;
    }

    activeTenants.sort((a, b) => parseInt(a.room_no) - parseInt(b.room_no));

    activeTenants.forEach((tenant) => {
        const r = getRoomDetails(tenant.room_no);
        const badgeClass = r.type !== '-' ? `type-${r.type}` : '';
        const escapedRoom = escapeHTML(tenant.room_no);
        const escapedEmail = escapeHTML(tenant.email);

        tbody.innerHTML += `
            <tr id="row-${escapedRoom}" data-room="${escapedRoom}" data-email="${escapedEmail}" data-price="${r.price}">
                <td>
                    ${r.type !== '-' ? `<span class="room-badge ${badgeClass}">${escapeHTML(r.type)}</span>` : ''} 
                    <strong style="margin-left:8px; color:#0f172a;">${escapedRoom}</strong>
                </td>
                <td style="font-size:13px; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${escapedEmail}</td>
                <td>${r.price.toLocaleString()}</td>
                <td><input type="number" class="input-sm calc-input" id="elec-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td><input type="number" class="input-sm calc-input" id="water-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td><input type="number" class="input-sm calc-input" id="other-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td class="total-col" id="total-${escapedRoom}">${r.price.toLocaleString()}</td>
            </tr>
        `;
    });
}

window.calculateRow = function(roomNo) {
    const row = document.getElementById(`row-${roomNo}`);
    const basePrice = parseInt(row.getAttribute('data-price')) || 0;
    
    const elecUnit = parseInt(document.getElementById(`elec-${roomNo}`).value) || 0;
    const waterUnit = parseInt(document.getElementById(`water-${roomNo}`).value) || 0;
    const otherFee = parseInt(document.getElementById(`other-${roomNo}`).value) || 0;

    const total = basePrice + (elecUnit * 8) + (waterUnit * 18) + otherFee;
    document.getElementById(`total-${roomNo}`).innerText = total.toLocaleString();
};

window.saveAllBills = async function() {
    if (activeTenants.length === 0) {
        alert("ไม่มีผู้เช่าให้สร้างบิล");
        return;
    }

    const month = document.getElementById('b_month').value;
    if(!month) {
        alert("กรุณาระบุประจำเดือน");
        return;
    }

    if(!confirm(`ยืนยันการสร้างบิลสำหรับเดือน "${month}" จำนวน ${activeTenants.length} ห้อง?`)) return;

    const btn = document.getElementById('save-all-btn');
    btn.disabled = true;
    btn.innerHTML = `<i class='bx bx-loader-alt bx-spin'></i> กำลังบันทึกข้อมูล...`;

    const billsToInsert = [];

    activeTenants.forEach(tenant => {
        const roomNo = tenant.room_no;
        const r = getRoomDetails(roomNo);
        
        const elecUnit = parseInt(document.getElementById(`elec-${roomNo}`).value) || 0;
        const waterUnit = parseInt(document.getElementById(`water-${roomNo}`).value) || 0;
        const otherFee = parseInt(document.getElementById(`other-${roomNo}`).value) || 0;
        
        const elecFee = elecUnit * 8;
        const waterFee = waterUnit * 18;
        const totalAmount = r.price + elecFee + waterFee + otherFee;

        billsToInsert.push({
            email: tenant.email,
            room_no: roomNo,
            month: month,
            rent_fee: r.price,
            other_fee: otherFee,
            elec_unit: elecUnit,
            elec_fee: elecFee,
            water_unit: waterUnit,
            water_fee: waterFee,
            amount: totalAmount,
            status: 'pending' 
        });
    });

    try {
        const { data, error } = await supabaseClient.from('bills').insert(billsToInsert);

        if (error) {
            alert('เกิดข้อผิดพลาดในการสร้างบิล: ' + error.message);
            console.error(error);
            btn.disabled = false;
            btn.innerHTML = `<i class='bx bx-save'></i> บันทึกบิลทั้งหมด (${activeTenants.length} ห้อง)`;
        } else {
            alert(`สร้างบิลรายเดือนสำเร็จ ${activeTenants.length} ห้องรวด!`);
            window.location.href = 'billing.html';
        }
    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `<i class='bx bx-save'></i> บันทึกบิลทั้งหมด (${activeTenants.length} ห้อง)`;
    }
};
