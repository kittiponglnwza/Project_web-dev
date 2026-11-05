let allUsers = [];

document.addEventListener("DOMContentLoaded", async () => {
    renderAdminSidebar();
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    document.getElementById('user-search').addEventListener('input', () => {
        currentPage = 1;
        applyUserFilters();
    });
    document.getElementById('room-filter').addEventListener('change', () => {
        currentPage = 1;
        applyUserFilters();
    });
    document.getElementById('user-archive-filter').addEventListener('change', () => {
        currentPage = 1;
        document.getElementById('room-filter').value = 'all';
        applyUserFilters();
    });

    await loadRoomInventory();
    loadUsers();
    loadRoomTypes();
});

async function loadRoomInventory() {
    try {
        const { data, error } = await supabaseClient
            .from('room_inventory')
            .select('room_no, room_size')
            .order('room_no', { ascending: true });
        if (error) throw error;
        setRoomInventory(data);
    } catch (err) {
        console.error('Room inventory load error:', err);
        setRoomInventory([]);
    }
}

async function loadUsers() {
    try {
        const { data: users, error } = await supabaseClient
            .from('tenant_profiles')
            .select('*')
            .order('role', { ascending: true }) 
            .order('room_no', { ascending: true });

        if (error) {
            console.error("Error fetching users:", error);
            return;
        }

        // Calculate Room Stats (นับเฉพาะผู้เช่าที่มีห้องจริง ไม่นับห้องทำงานของแอดมิน)
        if (users) {
            let rooms = users.filter(u => u.role !== 'admin' && !u.archived_at && getRoomSize(u.room_no)).map(u => u.room_no.trim());
            let occupiedRooms = new Set(rooms).size;
            document.getElementById('stat-occupied').innerText = occupiedRooms;
            document.getElementById('stat-available').innerText = Math.max(0, roomInventory.length - occupiedRooms);
        }

        allUsers = users || [];
        applyUserFilters();
    } catch (err) {
        console.error(err);
    }
}

let currentPage = 1;
const rowsPerPage = 5;
let filteredUsers = [];

// Rubric 8: ค้นหาจากหลายคอลัมน์ร่วมกับตัวกรองสถานะห้อง
function applyUserFilters() {
    const keyword = document.getElementById('user-search').value.trim().toLowerCase();
    const roomFilter = document.getElementById('room-filter').value;
    const archiveFilter = document.getElementById('user-archive-filter').value;

    filteredUsers = allUsers.filter(user => {
        const isArchived = Boolean(user.archived_at);
        if (archiveFilter === 'archived' && !isArchived) return false;
        if (archiveFilter !== 'archived' && isArchived) return false;
        const text = [user.email, user.room_no, user.national_id, user.role].join(' ').toLowerCase();
        const hasRoom = Boolean(user.room_no && user.room_no.trim());
        if (roomFilter === 'has-room' && !hasRoom) return false;
        if (roomFilter === 'no-room' && hasRoom) return false;
        return text.includes(keyword);
    });

    // ป้องกันหน้าว่างเมื่อจำนวนรายการลดลงหลังกรองหรือค้นหา
    const lastPage = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
    currentPage = Math.min(currentPage, lastPage);
    renderTable(filteredUsers, currentPage);
}

function generateRoomOptions(selectedRoom) {
    let options = '<option value="">ยังไม่ระบุห้อง</option>';
    roomInventory.forEach(room => {
        const roomNo = room.room_no;
        let isOccupied = allUsers.some(u => u.role !== 'admin' && !u.archived_at && u.room_no === roomNo);
        if (!isOccupied || roomNo === selectedRoom) {
            let selected = roomNo === selectedRoom ? 'selected' : '';
            options += `<option value="${escapeHTML(roomNo)}" ${selected}>ห้อง ${escapeHTML(roomNo)} (${escapeHTML(room.room_size)})</option>`;
        }
    });
    return options;
}

function renderTable(data, page) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    if (paginatedData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px;">ไม่พบผู้ใช้ตามเงื่อนไขที่ค้นหา</td></tr>';
    }

    paginatedData.forEach(user => {
        const isAdmin = user.role === 'admin';
        const isArchived = Boolean(user.archived_at);
        const roleBadge = isAdmin ? '<span class="role-badge role-admin">Admin</span>' : '<span class="role-badge">ผู้เช่า (Tenant)</span>';
        
        const roomVal = escapeHTML(user.room_no || '');
        const roomDisplay = isArchived
            ? `<span class="room-badge no-room">เก็บเข้าคลัง</span>`
            : roomVal
            ? `<span class="room-badge">${roomVal}</span>` 
            : `<span class="room-badge no-room">ยังไม่ระบุ</span>`;
        const roomControls = isArchived
            ? '<span style="color:#94a3b8;">—</span>'
            : `<div style="display:flex; justify-content:center; align-items:center;">
                <select id="room_input_${escapeHTML(user.id)}" class="input-room" style="padding: 5px; border-radius: 4px; border: 1px solid #cbd5e1; width: 80px; font-family: 'Prompt';">
                    ${generateRoomOptions(user.room_no || '')}
                </select>
                <button class="btn-save" style="margin-left:5px;" onclick="updateRoom('${escapeHTML(user.id)}', '${escapeHTML(user.email)}')">บันทึก</button>
            </div>`;
        const actions = isArchived
            ? `<button class="action-btn btn-restore" title="กู้คืนผู้ใช้นี้" onclick="restoreUser('${escapeHTML(user.id)}', '${escapeHTML(user.email)}')"><i class='bx bx-undo'></i></button>`
            : `<button class="action-btn btn-edit" title="ดู/แก้ไขโปรไฟล์" onclick="openEditModal('${escapeHTML(user.id)}')"><i class='bx bx-edit'></i></button>
               ${isAdmin ? '' : `<button class="action-btn btn-archive" title="เก็บเข้าคลังและคืนห้อง" onclick="archiveUser('${escapeHTML(user.id)}', '${escapeHTML(user.email)}')"><i class='bx bx-archive-in'></i></button>`}`;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;">${escapeHTML(user.email)}</td>
                <td>${roleBadge}</td>
                <td style="text-align: center;">${roomDisplay}</td>
                <td style="text-align: center;">
                    ${roomControls}
                </td>
                <td>${escapeHTML(user.national_id || '-')}</td>
                <td style="text-align: right;">
                    ${actions}
                </td>
            </tr>
        `;
    });
    renderPager('pagination-container', data.length, page, rowsPerPage, newPage => {
        currentPage = newPage;
        renderTable(filteredUsers, currentPage);
    });
}

// =========================================
//  Rubric 7: นำข้อมูลจากไฟล์ JSON ไปเก็บลงฐานข้อมูล
// =========================================

async function loadRoomTypes() {
    const tbody = document.getElementById('room-types-body');
    try {
        const { data, error } = await supabaseClient.from('rooms').select('*').order('id');
        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">ยังไม่มีข้อมูลในฐานข้อมูล กดปุ่มนำเข้าจาก JSON ได้เลย</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(room => `
            <tr>
                <td>${escapeHTML(room.id)}</td>
                <td>${escapeHTML(room.type)}</td>
                <td>${Number(room.price).toLocaleString()} บาท</td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #ef4444;">โหลดข้อมูลประเภทห้องไม่สำเร็จ</td></tr>';
    }
}

window.importRoomsFromJson = async function() {
    if (!confirm('นำเข้าข้อมูลจาก data/rooms.json ลงฐานข้อมูล?\nประเภทห้องที่มี id ซ้ำจะถูกเขียนทับ รวมถึงราคาห้องที่ใช้คิดบิลด้วย')) return;

    const btn = document.getElementById('btn-import-rooms');
    const result = document.getElementById('import-result');
    btn.disabled = true;
    result.style.color = '#64748b';
    result.textContent = 'กำลังนำเข้าข้อมูล...';

    try {
        const response = await fetch('../data/rooms.json');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const rooms = await response.json();

        const rows = rooms.map(room => ({
            id: room.id,
            type: room.type,
            description: room.description,
            price: room.price,
            images: room.images
            
        }));

        const { error } = await supabaseClient.from('rooms').upsert(rows, { onConflict: 'id' });
        if (error) throw error;

        result.style.color = '#15803d';
        result.textContent = `นำเข้าสำเร็จ ${rows.length} ประเภทห้อง`;
        await loadRoomTypes();
    } catch (err) {
        console.error(err);
        result.style.color = '#ef4444';
        result.textContent = 'นำเข้าไม่สำเร็จ: ' + err.message;
    } finally {
        btn.disabled = false;
    }
};

function validateRoomNumber(newRoom, userId) {
    if (!newRoom) return true; // อนุญาตให้เว้นว่าง (ยกเลิกการกำหนดห้อง)
    
    // 1. ตรวจว่ามีเลขห้องนี้อยู่ใน SQL inventory
    if (!getRoomSize(newRoom)) {
        alert("ไม่พบเลขห้องนี้ใน inventory ของฐานข้อมูล");
        return false;
    }

    // 2. ตรวจสอบห้องซ้ำ
    // id จาก HTML เป็นข้อความ แต่ id จากฐานข้อมูลเป็นตัวเลข จึงต้องแปลงก่อนเทียบ
    const isDuplicate = allUsers.some(u => u.role !== 'admin' && !u.archived_at && u.room_no === newRoom && String(u.id) !== String(userId));
    if (isDuplicate) {
        alert(`เลขห้อง ${newRoom} มีผู้เช่าคนอื่นใช้อยู่แล้ว! ไม่สามารถตั้งซ้ำได้`);
        return false;
    }

    return true;
}

window.updateRoom = async function(id, email) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user || user.archived_at) {
        alert('ไม่สามารถกำหนดห้องให้ผู้ใช้นี้ได้');
        return;
    }
    const newRoom = document.getElementById(`room_input_${id}`).value.trim();
    
    // ตรวจสอบเงื่อนไขห้อง
    if (!validateRoomNumber(newRoom, id)) return;

    try {
        const { data, error } = await supabaseClient
            .from('tenant_profiles')
            .update({ room_no: newRoom || null })
            .eq('id', id)
            .is('archived_at', null)
            .select('id')
            .maybeSingle();
        
        if (error) {
            alert('อัปเดตข้อมูลล้มเหลว: ' + error.message);
            console.error(error);
        } else if (data) {
            alert(`อัปเดตห้องพักของ ${email} เป็น ${newRoom || 'ว่าง'} สำเร็จ!`); 
            loadUsers(); 
        } else {
            alert('ไม่สามารถกำหนดห้องให้ผู้ใช้นี้ได้ อาจถูกเก็บเข้าคลังไปแล้ว');
        }
    } catch (err) {
        console.error(err);
    }
};

window.openEditModal = function(userId) {
    try {
        const user = allUsers.find(u => u.id == userId);
        
        if(!user) {
            alert("เกิดข้อผิดพลาด: หาข้อมูลผู้ใช้ไม่พบในระบบ (ID: " + userId + ")");
            return;
        }
        if (user.archived_at) return;

        document.getElementById('e_id').value = user.id;
        document.getElementById('e_email').value = user.email || '';
        document.getElementById('e_room').innerHTML = generateRoomOptions(user.room_no || '');
        document.getElementById('e_national_id').value = user.national_id || '';
        document.getElementById('e_address').value = user.address || '';
        document.getElementById('e_start_date').value = user.start_date || '';
        document.getElementById('e_end_date').value = user.end_date || '';
        document.getElementById('e_emergency_contact').value = user.emergency_contact || '';
        document.getElementById('e_emergency_phone').value = user.emergency_phone || '';
        const overlay = document.getElementById('edit-modal');
        overlay.style.setProperty('display', 'flex', 'important');
        overlay.style.setProperty('z-index', '9999', 'important');
        overlay.style.setProperty('opacity', '1', 'important');
        
        const modalBox = overlay.querySelector('.modal');
        if(modalBox) {
            modalBox.style.setProperty('display', 'block', 'important');
            modalBox.style.setProperty('opacity', '1', 'important');
            modalBox.style.setProperty('visibility', 'visible', 'important');
        }
    } catch (err) {
        alert("เกิดข้อผิดพลาดในระบบ Javascript: " + err.message);
        console.error(err);
    }
};

window.closeModal = function() {
    document.getElementById('edit-modal').style.setProperty('display', 'none', 'important');
};

window.onclick = function(event) {
    const overlay = document.getElementById('edit-modal');
    if (event.target == overlay) {
        window.closeModal();
    }
};

document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('e_id').value;
    const newRoom = document.getElementById('e_room').value.trim();
    
    // ตรวจสอบเงื่อนไขห้อง
    if (!validateRoomNumber(newRoom, id)) return;

    // Rubric 3: ตรวจสอบรูปแบบและความสัมพันธ์ของข้อมูลด้วย JS
    const nationalId = document.getElementById('e_national_id').value.trim();
    const emergencyPhone = document.getElementById('e_emergency_phone').value.trim();
    const startDate = document.getElementById('e_start_date').value;
    const endDate = document.getElementById('e_end_date').value;

    if (nationalId && !DORM_PATTERNS.nationalId.test(nationalId)) {
        alert('เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก');
        return;
    }
    if (emergencyPhone && !DORM_PATTERNS.phone.test(emergencyPhone)) {
        alert('เบอร์โทรฉุกเฉินต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0');
        return;
    }
    if (startDate && endDate && endDate < startDate) {
        alert('วันสิ้นสุดสัญญาต้องไม่อยู่ก่อนวันเริ่มสัญญา');
        return;
    }

    const updates = {
        room_no: newRoom || null,
        national_id: nationalId,
        address: document.getElementById('e_address').value.trim(),
        start_date: startDate || null,
        end_date: endDate || null,
        emergency_contact: document.getElementById('e_emergency_contact').value.trim(),
        emergency_phone: emergencyPhone,
    };

    try {
        const { data, error } = await supabaseClient
            .from('tenant_profiles')
            .update(updates)
            .eq('id', id)
            .is('archived_at', null)
            .select('id')
            .maybeSingle();
        
        if (error) {
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
            console.error(error);
        } else if (data) {
            alert("อัปเดตข้อมูลส่วนตัวผู้เช่าเรียบร้อยแล้ว!");
            window.closeModal();
            loadUsers();
        } else {
            alert('บันทึกไม่ได้ โปรไฟล์นี้อาจถูกเก็บเข้าคลังไปแล้ว');
        }
    } catch (err) {
        console.error(err);
    }
});

window.archiveUser = async function(id, email) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user || user.role === 'admin' || user.archived_at) return;
    if (!confirm(`เก็บผู้ใช้ "${email}" เข้าคลังและคืนห้องหรือไม่?\n\nประวัติบิลเดิมจะยังคงอยู่ และสามารถกู้คืนโปรไฟล์ได้ภายหลัง`)) return;

    try {
        const { data, error } = await supabaseClient
            .from('tenant_profiles')
            .update({ archived_at: new Date().toISOString(), room_no: null })
            .eq('id', id)
            .is('archived_at', null)
            .select('id')
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('ไม่พบโปรไฟล์หรือไม่มีสิทธิ์ดำเนินการ');
        alert(`เก็บ ${email} เข้าคลังแล้ว ประวัติบิลเดิมยังอยู่`);
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('เก็บผู้ใช้เข้าคลังไม่สำเร็จ: ' + err.message);
    }
};

window.restoreUser = async function(id, email) {
    const user = allUsers.find(u => String(u.id) === String(id));
    if (!user || user.role === 'admin' || !user.archived_at) return;
    if (!confirm(`กู้คืนโปรไฟล์ "${email}" หรือไม่?\n\nโปรไฟล์ที่กู้คืนจะยังไม่มีเลขห้อง ต้องกำหนดห้องใหม่จากรายการผู้ใช้ปัจจุบัน`)) return;

    try {
        const { data, error } = await supabaseClient
            .from('tenant_profiles')
            .update({ archived_at: null, room_no: null })
            .eq('id', id)
            .not('archived_at', 'is', null)
            .select('id')
            .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('ไม่พบโปรไฟล์หรือไม่มีสิทธิ์ดำเนินการ');
        alert(`กู้คืน ${email} แล้ว กรุณากำหนดห้องใหม่หากต้องการ`);
        document.getElementById('user-archive-filter').value = 'active';
        await loadUsers();
    } catch (err) {
        console.error(err);
        alert('กู้คืนผู้ใช้ไม่สำเร็จ: ' + err.message);
    }
};
