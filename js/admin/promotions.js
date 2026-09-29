let allPromotions = [];

document.addEventListener('DOMContentLoaded', async () => {
    renderAdminSidebar();
    initSidebar();

    const auth = await requireAdmin();
    if (!auth) return;

    await loadPromotions();
});

async function loadPromotions() {
    try {
        const { data, error } = await supabaseClient
            .from('promotions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            return;
        }

        allPromotions = data || [];
        renderPromotions();
    } catch (err) {
        console.error(err);
    }
}

function getTypeLabel(type) {
    const labels = {
        'new_tenant': 'โปรผู้เช่าใหม่',
        'seasonal': 'โปรตามช่วงเวลา',
        'free_common_fee': 'ฟรีค่าส่วนกลาง'
    };
    return labels[type] || type;
}

function getDiscountDisplay(promo) {
    if (promo.type === 'free_common_fee') {
        return '<span>FREE</span><small>ฟรีค่าส่วนกลาง (other_fee)</small>';
    }
    if (promo.discount_type === 'percent') {
        return `<span>ลด ${promo.discount_value}%</span><small>จากค่าเช่าห้อง</small>`;
    }
    return `<span>ลด ${Number(promo.discount_value).toLocaleString()} ฿</span><small>จำนวนเงินคงที่</small>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderPromotions() {
    const activeContainer = document.getElementById('active-promos');
    const inactiveContainer = document.getElementById('inactive-promos');

    const activePromos = allPromotions.filter(p => p.is_active);
    const inactivePromos = allPromotions.filter(p => !p.is_active);

    activeContainer.innerHTML = activePromos.length === 0
        ? '<div style="text-align: center; color: #94a3b8; padding: 40px; grid-column: 1 / -1;">ยังไม่มีโปรโมชั่นที่เปิดใช้งาน</div>'
        : activePromos.map(p => renderPromoCard(p)).join('');

    inactiveContainer.innerHTML = inactivePromos.length === 0
        ? '<div style="text-align: center; color: #94a3b8; padding: 40px; grid-column: 1 / -1;">ไม่มีโปรโมชั่นที่ปิดอยู่</div>'
        : inactivePromos.map(p => renderPromoCard(p)).join('');
}

function renderPromoCard(promo) {
    const toggleBtn = promo.is_active
        ? `<button class="btn-toggle-inactive" onclick="togglePromotion(${promo.id}, false)"><i class='bx bx-pause'></i> ปิด</button>`
        : `<button class="btn-toggle-active" onclick="togglePromotion(${promo.id}, true)"><i class='bx bx-play'></i> เปิด</button>`;

    return `
        <div class="promo-card ${promo.is_active ? '' : 'inactive'}">
            <span class="promo-type-badge ${promo.type}">${escapeHTML(getTypeLabel(promo.type))}</span>
            <h3 class="promo-name">${escapeHTML(promo.name)}</h3>
            <p class="promo-desc">${escapeHTML(promo.description || '-')}</p>
            <div class="promo-discount-display">${getDiscountDisplay(promo)}</div>
            <div class="promo-meta">
                <div class="promo-meta-item"><i class='bx bx-calendar'></i> ${formatDate(promo.start_date)} - ${formatDate(promo.end_date)}</div>
                <div class="promo-meta-item"><i class='bx bx-${promo.auto_apply ? 'check-circle' : 'x-circle'}'></i> ${promo.auto_apply ? 'อัตโนมัติ' : 'เลือกเอง'}</div>
            </div>
            <div class="promo-actions">
                ${toggleBtn}
                <button class="btn-edit" onclick="editPromotion(${promo.id})"><i class='bx bx-edit'></i> แก้ไข</button>
                <button class="btn-delete" onclick="deletePromotion(${promo.id})"><i class='bx bx-trash'></i> ลบ</button>
            </div>
        </div>
    `;
}

function openCreateModal() {
    document.getElementById('modal-title').innerHTML = '<i class="bx bx-gift"></i> สร้างโปรโมชั่นใหม่';
    document.getElementById('promo-form').reset();
    document.getElementById('promo-id').value = '';
    updateDiscountUI();
    document.getElementById('promoModal').style.display = 'flex';
}

function closePromoModal() {
    document.getElementById('promoModal').style.display = 'none';
}

function updateDiscountUI() {
    const type = document.getElementById('promo-type').value;
    const discountFields = document.getElementById('discount-fields');
    if (type === 'free_common_fee') {
        discountFields.style.display = 'none';
    } else {
        discountFields.style.display = 'grid';
    }
}

window.editPromotion = function(id) {
    const promo = allPromotions.find(p => p.id === id);
    if (!promo) return;

    document.getElementById('modal-title').innerHTML = '<i class="bx bx-edit"></i> แก้ไขโปรโมชั่น';
    document.getElementById('promo-id').value = promo.id;
    document.getElementById('promo-name').value = promo.name;
    document.getElementById('promo-type').value = promo.type;
    document.getElementById('promo-desc').value = promo.description || '';
    document.getElementById('promo-discount-type').value = promo.discount_type;
    document.getElementById('promo-discount-value').value = promo.discount_value;
    document.getElementById('promo-start').value = promo.start_date;
    document.getElementById('promo-end').value = promo.end_date;
    document.getElementById('promo-active').value = promo.is_active ? 'true' : 'false';
    updateDiscountUI();
    document.getElementById('promoModal').style.display = 'flex';
};

window.togglePromotion = async function(id, newState) {
    const action = newState ? 'เปิดใช้งาน' : 'ปิดการใช้งาน';
    if (!confirm(`ต้องการ${action}โปรโมชั่นนี้ใช่หรือไม่?`)) return;

    try {
        const { error } = await supabaseClient
            .from('promotions')
            .update({ is_active: newState })
            .eq('id', id);

        if (error) {
            alert('เกิดข้อผิดพลาด: ' + error.message);
        } else {
            await loadPromotions();
        }
    } catch (err) {
        console.error(err);
    }
};

window.deletePromotion = async function(id) {
    if (!confirm('ต้องการลบโปรโมชั่นนี้ใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)')) return;

    try {
        const { error } = await supabaseClient.from('promotions').delete().eq('id', id);
        if (error) {
            alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
        } else {
            await loadPromotions();
        }
    } catch (err) {
        console.error(err);
    }
};

window.savePromotion = async function(e) {
    e.preventDefault();
    const id = document.getElementById('promo-id').value;
    const type = document.getElementById('promo-type').value;

    const promoData = {
        name: document.getElementById('promo-name').value.trim(),
        description: document.getElementById('promo-desc').value.trim(),
        type: type,
        discount_type: type === 'free_common_fee' ? 'free_field' : document.getElementById('promo-discount-type').value,
        discount_value: type === 'free_common_fee' ? 0 : parseFloat(document.getElementById('promo-discount-value').value) || 0,
        discount_field: type === 'free_common_fee' ? 'other_fee' : 'rent_fee',
        start_date: document.getElementById('promo-start').value,
        end_date: document.getElementById('promo-end').value,
        is_active: document.getElementById('promo-active').value === 'true',
        auto_apply: true
    };

    try {
        let result;
        if (id) {
            result = await supabaseClient.from('promotions').update(promoData).eq('id', id);
        } else {
            result = await supabaseClient.from('promotions').insert([promoData]);
        }

        if (result.error) {
            alert('เกิดข้อผิดพลาด: ' + result.error.message);
        } else {
            alert(id ? 'แก้ไขโปรโมชั่นสำเร็จ!' : 'สร้างโปรโมชั่นสำเร็จ!');
            closePromoModal();
            await loadPromotions();
        }
    } catch (err) {
        console.error(err);
    }
};
