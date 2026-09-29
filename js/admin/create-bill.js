let activeTenants = [];
let activePromotions = [];

window.getRoomDetails = function(roomNo) {
    if (!roomNo) return { type: '-', price: 0 };
    const num = parseInt(roomNo.toString().slice(-2));
    if (num >= 1 && num <= 4) return { type: 'S', price: 5500 };
    if (num >= 5 && num <= 10) return { type: 'M', price: 7500 };
    if (num >= 11 && num <= 99) return { type: 'XL', price: 9000 };
    return { type: '-', price: 0 };
};

function getApplicablePromotions(tenant) {
    const now = new Date();
    const results = [];

    activePromotions.forEach(promo => {
        if (!promo.is_active || !promo.auto_apply) return;

        const startDate = promo.start_date ? new Date(promo.start_date) : null;
        const endDate = promo.end_date ? new Date(promo.end_date) : null;

        // Check date range
        if (startDate && now < startDate) return;
        if (endDate && now > endDate) return;

        if (promo.type === 'new_tenant') {
            // Check if tenant is in their first month
            if (tenant.start_date) {
                const leaseStart = new Date(tenant.start_date);
                const diffMonths = (now.getFullYear() - leaseStart.getFullYear()) * 12 + (now.getMonth() - leaseStart.getMonth());
                if (diffMonths > 0) return; // Not first month
            } else {
                return; // No start date, can't verify
            }
        }

        results.push(promo);
    });

    return results;
}

function calculateDiscount(basePrice, otherFee, promos) {
    let totalDiscount = 0;
    let discountDetails = [];

    promos.forEach(promo => {
        let discountAmount = 0;

        if (promo.type === 'free_common_fee') {
            discountAmount = otherFee;
            discountDetails.push(`${promo.name}: ฟรีค่าส่วนกลาง -${otherFee}฿`);
        } else if (promo.discount_type === 'percent') {
            discountAmount = Math.round(basePrice * promo.discount_value / 100);
            discountDetails.push(`${promo.name}: -${discountAmount}฿ (${promo.discount_value}%)`);
        } else if (promo.discount_type === 'fixed') {
            discountAmount = promo.discount_value;
            discountDetails.push(`${promo.name}: -${discountAmount}฿`);
        }

        totalDiscount += discountAmount;
    });

    return { totalDiscount, discountDetails };
}

document.addEventListener('DOMContentLoaded', async () => {
    renderAdminSidebar();
    initSidebar();

    const auth = await requireAdmin();
    if (!auth) return;

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

        if (targetDate.getMonth() === d.getMonth() && targetDate.getFullYear() === d.getFullYear()) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    }

    await loadPromotions();
    await loadTenants();
    renderTable();
});

async function loadPromotions() {
    try {
        const { data, error } = await supabaseClient
            .from('promotions')
            .select('*')
            .eq('is_active', true)
            .eq('auto_apply', true);

        if (data) {
            activePromotions = data;
            renderPromoBanner();
        }
        if (error) console.error(error);
    } catch (err) {
        console.error(err);
    }
}

function renderPromoBanner() {
    const banner = document.getElementById('promo-banner');
    if (!banner) return;

    if (activePromotions.length === 0) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'block';
    let html = '';
    activePromotions.forEach(p => {
        let icon = '🎉';
        if (p.type === 'seasonal') icon = '🌿';
        if (p.type === 'free_common_fee') icon = '🆓';

        let discountText = '';
        if (p.type === 'free_common_fee') {
            discountText = 'ฟรีค่าส่วนกลาง';
        } else if (p.discount_type === 'percent') {
            discountText = `ลด ${p.discount_value}%`;
        } else {
            discountText = `ลด ${Number(p.discount_value).toLocaleString()} ฿`;
        }

        html += `<div class="promo-tag">${icon} ${escapeHTML(p.name)} - <strong>${discountText}</strong></div>`;
    });
    banner.innerHTML = `<div class="promo-banner-title"><i class='bx bx-gift'></i> โปรโมชั่นที่ใช้งานอยู่ (คำนวณอัตโนมัติ)</div>${html}`;
}

async function loadTenants() {
    try {
        const { data, error } = await supabaseClient.from('tenant_profiles').select('*').neq('role', 'admin').not('room_no', 'is', null);
        if (data) {
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
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 30px;">ไม่มีผู้เช่าที่มีห้องในระบบ</td></tr>';
        return;
    }

    activeTenants.sort((a, b) => parseInt(a.room_no) - parseInt(b.room_no));

    activeTenants.forEach((tenant) => {
        const r = getRoomDetails(tenant.room_no);
        const badgeClass = r.type !== '-' ? `type-${r.type}` : '';
        const escapedRoom = escapeHTML(tenant.room_no);
        const escapedEmail = escapeHTML(tenant.email);

        // Get applicable promotions for this tenant
        const promos = getApplicablePromotions(tenant);
        const hasPromo = promos.length > 0;

        let promoLabel = '';
        if (hasPromo) {
            const promoNames = promos.map(p => p.name).join(', ');
            promoLabel = `<div class="promo-applied-tag" title="${escapeHTML(promoNames)}"><i class='bx bx-gift'></i> ${promos.length} โปร</div>`;
        }

        tbody.innerHTML += `
            <tr id="row-${escapedRoom}" data-room="${escapedRoom}" data-email="${escapedEmail}" data-price="${r.price}" data-promos='${JSON.stringify(promos.map(p=>p.id))}'>
                <td>
                    ${r.type !== '-' ? `<span class="room-badge ${badgeClass}">${escapeHTML(r.type)}</span>` : ''}
                    <strong style="margin-left:8px; color:#0f172a;">${escapedRoom}</strong>
                    ${promoLabel}
                </td>
                <td style="font-size:13px; max-width:150px; overflow:hidden; text-overflow:ellipsis;">${escapedEmail}</td>
                <td>${r.price.toLocaleString()}</td>
                <td><input type="number" class="input-sm calc-input" id="elec-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td><input type="number" class="input-sm calc-input" id="water-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td><input type="number" class="input-sm calc-input" id="other-${escapedRoom}" value="0" min="0" oninput="calculateRow('${escapedRoom}')"></td>
                <td class="discount-col" id="discount-${escapedRoom}" style="color:#10b981; font-weight:600;">0</td>
                <td class="total-col" id="total-${escapedRoom}">${r.price.toLocaleString()}</td>
            </tr>
        `;

        // Calculate initial row with promotions
        calculateRow(escapedRoom);
    });
}

window.calculateRow = function(roomNo) {
    const row = document.getElementById(`row-${roomNo}`);
    const basePrice = parseInt(row.getAttribute('data-price')) || 0;

    const elecUnit = parseInt(document.getElementById(`elec-${roomNo}`).value) || 0;
    const waterUnit = parseInt(document.getElementById(`water-${roomNo}`).value) || 0;
    const otherFee = parseInt(document.getElementById(`other-${roomNo}`).value) || 0;

    // Get promotions for this room's tenant
    const promoIds = JSON.parse(row.getAttribute('data-promos') || '[]');
    const promos = activePromotions.filter(p => promoIds.includes(p.id));

    const { totalDiscount } = calculateDiscount(basePrice, otherFee, promos);

    const subtotal = basePrice + (elecUnit * 8) + (waterUnit * 18) + otherFee;
    const total = Math.max(0, subtotal - totalDiscount);

    const discountEl = document.getElementById(`discount-${roomNo}`);
    if (discountEl) {
        discountEl.innerText = totalDiscount > 0 ? `-${totalDiscount.toLocaleString()}` : '0';
        discountEl.style.color = totalDiscount > 0 ? '#10b981' : '#94a3b8';
    }

    document.getElementById(`total-${roomNo}`).innerText = total.toLocaleString();
};

window.saveAllBills = async function() {
    if (activeTenants.length === 0) {
        alert("ไม่มีผู้เช่าให้สร้างบิล");
        return;
    }

    const month = document.getElementById('b_month').value;
    if (!month) {
        alert("กรุณาระบุประจำเดือน");
        return;
    }

    if (!confirm(`ยืนยันการสร้างบิลสำหรับเดือน "${month}" จำนวน ${activeTenants.length} ห้อง?`)) return;

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

        // Get applicable promotions
        const promos = getApplicablePromotions(tenant);
        const { totalDiscount, discountDetails } = calculateDiscount(r.price, otherFee, promos);

        const subtotal = r.price + elecFee + waterFee + otherFee;
        const totalAmount = Math.max(0, subtotal - totalDiscount);

        const billData = {
            email: tenant.email,
            room_no: roomNo,
            month: month,
            rent_fee: r.price,
            other_fee: otherFee,
            elec_unit: elecUnit,
            elec_fee: elecFee,
            water_unit: waterUnit,
            water_fee: waterFee,
            discount_amount: totalDiscount,
            discount_detail: discountDetails.length > 0 ? discountDetails.join(' | ') : null,
            amount: totalAmount,
            status: 'pending'
        };

        // If there's exactly one promotion, link it
        if (promos.length === 1) {
            billData.promotion_id = promos[0].id;
        }

        billsToInsert.push(billData);
    });

    try {
        const { data, error } = await supabaseClient.from('bills').insert(billsToInsert);

        if (error) {
            alert('เกิดข้อผิดพลาดในการสร้างบิล: ' + error.message);
            console.error(error);
            btn.disabled = false;
            btn.innerHTML = `<i class='bx bx-save'></i> บันทึกบิลทั้งหมด (${activeTenants.length} ห้อง)`;
        } else {
            const discountedCount = billsToInsert.filter(b => b.discount_amount > 0).length;
            const totalDiscountSum = billsToInsert.reduce((sum, b) => sum + b.discount_amount, 0);
            let msg = `สร้างบิลรายเดือนสำเร็จ ${activeTenants.length} ห้องรวด!`;
            if (discountedCount > 0) {
                msg += `\n🎉 มี ${discountedCount} ห้องได้รับโปรโมชั่น (รวมส่วนลด ${totalDiscountSum.toLocaleString()} บาท)`;
            }
            alert(msg);
            window.location.href = 'billing.html';
        }
    } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `<i class='bx bx-save'></i> บันทึกบิลทั้งหมด (${activeTenants.length} ห้อง)`;
    }
};
