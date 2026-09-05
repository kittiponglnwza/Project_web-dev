let allUsers = [];

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    loadUsers();
});

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

        // Calculate Room Stats
        if (users) {
            let rooms = users.filter(u => (u.role === 'admin') || (u.role === 'tenant' && u.room_no && u.room_no.trim() !== '')).map(u => u.room_no.trim());
            let occupiedRooms = [...new Set(rooms)].length;
            document.getElementById('stat-occupied').innerText = occupiedRooms;
            document.getElementById('stat-available').innerText = (16 - occupiedRooms);
        }

        allUsers = users;
        renderTable(allUsers, currentPage);
    } catch (err) {
        console.error(err);
    }
}

let currentPage = 1;
const rowsPerPage = 5;

function generateRoomOptions(selectedRoom) {
    let options = '<option value="">ยังไม่ระบุห้อง</option>';
    let f = 1; // ตึกที่ 1
    for(let r = 1; r <= 16; r++) {
        let roomNo = `${f}${r.toString().padStart(2, '0')}`;
        let isOccupied = allUsers.some(u => u.room_no === roomNo);
        if (!isOccupied || roomNo === selectedRoom) {
            let selected = roomNo === selectedRoom ? 'selected' : '';
            options += `<option value="${roomNo}" ${selected}>ห้อง ${roomNo}</option>`;
        }
    }
    return options;
}

function renderTable(data, page) {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = data.slice(startIndex, endIndex);

    paginatedData.forEach(user => {
        const isAdmin = user.role === 'admin';
        const roleBadge = isAdmin ? '<span class="role-badge role-admin">Admin</span>' : '<span class="role-badge">ผู้เช่า (Tenant)</span>';
        
        const roomVal = escapeHTML(user.room_no || '');
        const roomDisplay = roomVal 
            ? `<span class="room-badge">${roomVal}</span>` 
            : `<span class="room-badge no-room">ยังไม่ระบุ</span>`;

        tbody.innerHTML += `
            <tr>
                <td style="font-weight: 500;">${escapeHTML(user.email)}</td>
                <td>${roleBadge}</td>
                <td style="text-align: center;">${roomDisplay}</td>
                <td style="text-align: center;">
                    <div style="display:flex; justify-content:center; align-items:center;">
                        <select id="room_input_${escapeHTML(user.id)}" class="input-room" style="padding: 5px; border-radius: 4px; border: 1px solid #cbd5e1; width: 80px; font-family: 'Prompt';">
                            ${generateRoomOptions(user.room_no || '')}
                        </select>
                        <button class="btn-save" style="margin-left:5px;" onclick="updateRoom('${escapeHTML(user.id)}', '${escapeHTML(user.email)}')">บันทึก</button>
                    </div>
                </td>
                <td>${escapeHTML(user.national_id || '-')}</td>
                <td style="text-align: right;">
                    <button class="action-btn btn-edit" title="ดู/แก้ไขโปรไฟล์" onclick="openEditModal('${escapeHTML(user.id)}')"><i class='bx bx-edit'></i></button>
                    ${isAdmin ? '' : `<button class="action-btn btn-delete" title="ลบผู้ใช้นี้ถาวร" onclick="deleteUser('${escapeHTML(user.id)}', '${escapeHTML(user.email)}')"><i class='bx bx-trash'></i></button>`}
                </td>
            </tr>
        `;
    });
    renderPagination(data.length, page);
}

function renderPagination(totalItems, currentPage) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `<div style="font-size: 14px; color: #64748b; margin-top: 15px;">แสดงข้อมูลหน้า ${currentPage} จาก ${totalPages} (${totalItems} รายการ)</div><div style="display: flex; gap: 5px; margin-top: 10px;">`;
    
    if (currentPage > 1) {
        html += `<button onclick="changePage(${currentPage - 1})" class="action-btn" style="padding: 5px 15px;">ก่อนหน้า</button>`;
    }
    
    if (currentPage < totalPages) {
        html += `<button onclick="changePage(${currentPage + 1})" class="action-btn" style="padding: 5px 15px;">ถัดไป</button>`;
    }
    
    html += `</div>`;
    container.innerHTML = html;
}

window.changePage = function(newPage) {
    currentPage = newPage;
    renderTable(allUsers, currentPage);
};

function validateRoomNumber(newRoom, userId) {
    if (!newRoom) return true; // อนุญาตให้เว้นว่าง (ยกเลิกการกำหนดห้อง)
    
    // 1. ตรวจสอบรูปแบบ: ตึก 1 + เลขห้อง (01-16)
    const roomRegex = /^1(0[1-9]|1[0-6])$/;
    if (!roomRegex.test(newRoom)) {
        alert("รูปแบบเลขห้องไม่ถูกต้อง!\nต้องเป็นตึก 1 ตามด้วยเลขห้อง 2 หลัก (01-16)\nตัวอย่าง: 101, 109, 116");
        return false;
    }

    // 2. ตรวจสอบห้องซ้ำ
    const isDuplicate = allUsers.some(u => u.room_no === newRoom && u.id !== userId);
    if (isDuplicate) {
        alert(`เลขห้อง ${newRoom} มีผู้เช่าคนอื่นใช้อยู่แล้ว! ไม่สามารถตั้งซ้ำได้`);
        return false;
    }

    return true;
}

window.updateRoom = async function(id, email) {
    const newRoom = document.getElementById(`room_input_${id}`).value.trim();
    
    // ตรวจสอบเงื่อนไขห้อง
    if (!validateRoomNumber(newRoom, id)) return;

    try {
        const { error } = await supabaseClient.from('tenant_profiles').update({ room_no: newRoom || null }).eq('id', id);
        
        if (error) {
            alert('อัปเดตข้อมูลล้มเหลว: ' + error.message);
            console.error(error);
        } else { 
            alert(`อัปเดตห้องพักของ ${email} เป็น ${newRoom || 'ว่าง'} สำเร็จ!`); 
            loadUsers(); 
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

        document.getElementById('e_id').value = user.id;
        document.getElementById('e_email').value = user.email || '';
        document.getElementById('e_room').innerHTML = generateRoomOptions(user.room_no || '');
        document.getElementById('e_national_id').value = user.national_id || '';
        document.getElementById('e_address').value = user.address || '';
        document.getElementById('e_start_date').value = user.start_date || '';
        document.getElementById('e_end_date').value = user.end_date || '';
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
    
    const updates = {
        room_no: newRoom || null,
        national_id: document.getElementById('e_national_id').value.trim(),
        address: document.getElementById('e_address').value.trim(),
        start_date: document.getElementById('e_start_date').value || null,
        end_date: document.getElementById('e_end_date').value || null,
        emergency_contact: document.getElementById('e_emergency_contact').value.trim(),
        emergency_phone: document.getElementById('e_emergency_phone').value.trim(),
    };

    try {
        const { error } = await supabaseClient.from('tenant_profiles').update(updates).eq('id', id);
        
        if (error) {
            alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error.message);
            console.error(error);
        } else {
            alert("อัปเดตข้อมูลส่วนตัวผู้เช่าเรียบร้อยแล้ว!");
            window.closeModal();
            loadUsers();
        }
    } catch (err) {
        console.error(err);
    }
});

window.deleteUser = async function(id, email) {
    const confirmMsg = `คำเตือน! คุณต้องการลบผู้ใช้ "${email}" ออกจากระบบหอพักอย่างถาวรใช่หรือไม่?\n\n(การลบข้อมูลนี้จะไม่สามารถกู้คืนได้)`;
    
    if (confirm(confirmMsg)) {
        try {
            const { error } = await supabaseClient.from('tenant_profiles').delete().eq('id', id);
            
            if (error) {
                alert("ไม่สามารถลบผู้ใช้ได้: " + error.message);
                console.error(error);
            } else {
                alert(`ลบผู้ใช้ ${email} ออกจากระบบเรียบร้อยแล้ว`);
                loadUsers();
            }
        } catch (err) {
            console.error(err);
        }
    }
};
