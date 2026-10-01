/**
 * Admin Chat Enhancements:
 * 1. "Mark as Read & Replied" Feature
 * 2. "Monthly Appointment Calendar" Modal & Management
 */

(function () {
    // =========================================================================
    // PART 1: MARK AS READ & REPLIED FEATURE
    // =========================================================================

    const REPLIED_STORAGE_KEY = 'dorm_chat_replied_status_v1';

    function getRepliedData() {
        try {
            const raw = localStorage.getItem(REPLIED_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Error reading replied data from localStorage', e);
            return {};
        }
    }

    function saveRepliedData(data) {
        try {
            localStorage.setItem(REPLIED_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Error saving replied data to localStorage', e);
        }
    }

    function isEmailReplied(email) {
        if (!email) return false;
        const data = getRepliedData();
        return !!(data[email] && data[email].replied);
    }

    function setRepliedStatus(email, status) {
        if (!email) return;
        const data = getRepliedData();
        if (status) {
            data[email] = {
                replied: true,
                updatedAt: new Date().toISOString()
            };
        } else {
            delete data[email];
        }
        saveRepliedData(data);
        updateRepliedButtonUI(email);
        applyRepliedBadgesToContactList();
    }

    window.toggleRepliedStatus = function () {
        const activeEmailEl = document.getElementById('active-chat-email');
        const email = activeEmailEl ? activeEmailEl.innerText.trim() : null;
        if (!email || email === 'email@example.com') return;

        const currentStatus = isEmailReplied(email);
        setRepliedStatus(email, !currentStatus);
    };

    function updateRepliedButtonUI(email) {
        const btn = document.getElementById('btn-mark-replied');
        const label = document.getElementById('btn-replied-label');
        const pill = document.getElementById('active-chat-replied-pill');
        if (!btn) return;

        const replied = isEmailReplied(email);

        if (replied) {
            btn.classList.add('is-replied');
            btn.innerHTML = `<i class='bx bx-check-double'></i><span id="btn-replied-label">ตอบกลับแล้ว</span>`;
            btn.setAttribute('title', 'คลิกเพื่อยกเลิกสถานะตอบกลับแล้ว');
            if (pill) pill.style.display = 'inline-flex';
        } else {
            btn.classList.remove('is-replied');
            btn.innerHTML = `<i class='bx bx-check'></i><span id="btn-replied-label">ทำเครื่องหมายว่าตอบแล้ว</span>`;
            btn.setAttribute('title', 'ทำเครื่องหมายว่าแชทนี้ตอบกลับเรียบร้อยแล้ว');
            if (pill) pill.style.display = 'none';
        }
    }

    function applyRepliedBadgesToContactList() {
        const repliedMap = getRepliedData();
        const items = document.querySelectorAll('#contact-list .contact-item');

        items.forEach(item => {
            const onclickAttr = item.getAttribute('onclick') || '';
            const match = onclickAttr.match(/openChat\(['"]([^'"]+)['"]\)/);
            if (!match) return;

            const email = match[1];
            const isReplied = !!(repliedMap[email] && repliedMap[email].replied);

            let badge = item.querySelector('.badge-replied-sidebar');

            if (isReplied) {
                item.classList.add('chat-item-replied');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge-replied-sidebar';
                    badge.innerHTML = `<i class='bx bx-check-double'></i> ตอบแล้ว`;

                    const nameEl = item.querySelector('.contact-name');
                    if (nameEl) {
                        nameEl.appendChild(badge);
                    }
                }
            } else {
                item.classList.remove('chat-item-replied');
                if (badge) {
                    badge.remove();
                }
            }
        });
    }

    // Hook into existing openChat function
    function hookOpenChat() {
        if (typeof window.openChat === 'function') {
            const originalOpenChat = window.openChat;
            window.openChat = async function (tenantEmail) {
                await originalOpenChat(tenantEmail);
                updateRepliedButtonUI(tenantEmail);
            };
        }
    }

    // Hook into existing renderContactList function to avoid full re-renders and attach badges cleanly
    function hookRenderContactList() {
        if (typeof window.renderContactList === 'function') {
            const originalRender = window.renderContactList;
            let lastSignature = '';

            window.renderContactList = function (contactArray) {
                const repliedMap = getRepliedData();
                const activeEmailEl = document.getElementById('active-chat-email');
                const activeEmail = activeEmailEl ? activeEmailEl.innerText : '';
                const activeTab = document.querySelector('.chat-tab.active')?.innerText || '';

                const currentSignature = JSON.stringify(
                    contactArray.map(c => [c.email, c.lastMsg, c.time, c.unreadCount, !!repliedMap[c.email]])
                ) + '|' + activeEmail + '|' + activeTab;

                if (currentSignature === lastSignature && document.getElementById('contact-list').children.length > 0) {
                    return;
                }

                lastSignature = currentSignature;
                originalRender(contactArray);
                applyRepliedBadgesToContactList();
            };
        }
    }

    // Auto mark as replied when admin sends a message
    function hookChatFormSubmit() {
        const form = document.getElementById('chat-form');
        if (!form) return;

        form.addEventListener('submit', () => {
            const activeEmailEl = document.getElementById('active-chat-email');
            const email = activeEmailEl ? activeEmailEl.innerText.trim() : null;
            if (email && email !== 'email@example.com') {
                // Auto mark as replied upon sending message
                setRepliedStatus(email, true);
            }
        });
    }


    // =========================================================================
    // PART 2: MONTHLY APPOINTMENT CALENDAR FEATURE
    // =========================================================================

    const CALENDAR_STORAGE_KEY = 'dorm_calendar_appointments_v1';

    const THAI_MONTHS = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
        'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
        'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];

    const THAI_DAYS = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'];

    let calState = {
        year: new Date().getFullYear(),
        month: new Date().getMonth(), // 0-indexed
        selectedDate: formatDateYMD(new Date()),
        editingId: null
    };

    function formatDateYMD(d) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function parseDateYMD(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    // Pre-seed realistic appointments for new users around today's date
    function getInitialAppointments() {
        return [];
    }

    let appointmentsList = [];

    // ดึงข้อมูลจากฐานข้อมูล Supabase เมื่อเริ่มทำงาน
    async function fetchAppointments() {
        if (typeof supabaseClient === 'undefined') return;
        try {
            const { data, error } = await supabaseClient.from('appointments').select('*');
            if (error) {
                console.error('Error fetching appointments', error);
                return;
            }
            if (data) {
                appointmentsList = data;
                updateCalendarBadge();
                renderCalendar();
                renderSelectedDateSlots();
            }
        } catch (e) {
            console.error('Error in fetchAppointments', e);
        }
    }

    function getAllAppointments() {
        return appointmentsList;
    }

    // saveAllAppointments ไม่ต้องใช้แล้วสำหรับ local storage 
    // เราจะเซฟลง db โดยตรงในฟังก์ชัน handleSave และ delete

    function updateCalendarBadge() {
        const badge = document.getElementById('calendar-badge-count');
        if (!badge) return;

        const all = getAllAppointments();
        const todayStr = formatDateYMD(new Date());
        const todayCount = all.filter(a => a.date === todayStr).length;

        if (todayCount > 0) {
            badge.innerText = todayCount;
            badge.style.display = 'inline-block';
            badge.setAttribute('title', `วันนี้มี ${todayCount} นัดหมาย`);
        } else {
            badge.style.display = 'none';
        }
    }

    // Modal Control
    window.openAppointmentModal = function (bookingData) {
        const modal = document.getElementById('appointment-modal');
        if (!modal) return;

        modal.style.display = 'flex';
        // Allow display:flex to apply before adding class for smooth transition
        setTimeout(() => modal.classList.add('show'), 10);

        // หยุด polling ขณะเปิดปฏิทิน
        window.isCalendarOpen = true;

        // ถ้ามีข้อมูลจากการ์ดแจ้งเตือน ให้เลื่อนปฏิทินไปยังวันที่ของลูกค้า
        if (bookingData && bookingData.date) {
            const parsed = parseDateYMD(bookingData.date);
            if (!isNaN(parsed.getTime())) {
                calState.year = parsed.getFullYear();
                calState.month = parsed.getMonth();
                calState.selectedDate = bookingData.date;
            }
        }

        renderCalendar();
        renderSelectedDateSlots();

        // เติมข้อมูลลูกค้าจากการ์ดแจ้งเตือนลงในฟอร์มเพิ่มนัดหมาย
        if (bookingData) {
            // รีเซ็ตฟอร์มก่อน
            cancelEditAppointment();

            const nameInput = document.getElementById('apt-input-name');
            const noteInput = document.getElementById('apt-input-note');
            const typeInput = document.getElementById('apt-input-type');

            // เติมชื่อ + เบอร์โทร
            if (nameInput) {
                let nameVal = bookingData.name || '';
                if (bookingData.phone) {
                    nameVal += ` (${bookingData.phone})`;
                }
                nameInput.value = nameVal;
            }

            // เติมห้องที่สนใจลงในหมายเหตุ
            if (noteInput && bookingData.room) {
                noteInput.value = bookingData.room;
            }

            // ตั้งประเภทเป็น "นัดดูห้องพัก"
            if (typeInput) {
                typeInput.value = 'นัดดูห้องพัก';
            }
        }
    };

    window.closeAppointmentModal = function () {
        const modal = document.getElementById('appointment-modal');
        if (!modal) return;

        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            cancelEditAppointment();

            // เปิด polling ใหม่ + refresh ข้อมูลให้สดหลังปิดปฏิทิน
            window.isCalendarOpen = false;
            if (typeof loadContacts === 'function') loadContacts();
            if (typeof loadActiveChatMessages === 'function') loadActiveChatMessages(false);
        }, 250);
    };

    // Calendar Navigation
    window.changeMonth = function (delta) {
        calState.month += delta;
        if (calState.month < 0) {
            calState.month = 11;
            calState.year -= 1;
        } else if (calState.month > 11) {
            calState.month = 0;
            calState.year += 1;
        }
        renderCalendar();
    };

    window.goToToday = function () {
        const now = new Date();
        calState.year = now.getFullYear();
        calState.month = now.getMonth();
        calState.selectedDate = formatDateYMD(now);
        renderCalendar();
        renderSelectedDateSlots();
    };

    // Render Calendar Grid
    function renderCalendar() {
        const monthNameEl = document.getElementById('apt-month-name');
        const yearNameEl = document.getElementById('apt-year-name');
        const gridEl = document.getElementById('apt-days-grid');
        if (!gridEl) return;

        if (monthNameEl) monthNameEl.innerText = THAI_MONTHS[calState.month];
        if (yearNameEl) yearNameEl.innerText = calState.year;

        const appointments = getAllAppointments();

        // Calculate first day and days in month
        const firstDayIndex = new Date(calState.year, calState.month, 1).getDay(); // 0 = Sun
        const daysInMonth = new Date(calState.year, calState.month + 1, 0).getDate();

        const todayStr = formatDateYMD(new Date());

        let html = '';

        // Empty padding cells for days before the 1st
        for (let i = 0; i < firstDayIndex; i++) {
            html += `<div class="apt-day-cell empty"></div>`;
        }

        // Days of current month
        for (let d = 1; d <= daysInMonth; d++) {
            const mStr = String(calState.month + 1).padStart(2, '0');
            const dStr = String(d).padStart(2, '0');
            const dateStr = `${calState.year}-${mStr}-${dStr}`;

            const isToday = dateStr === todayStr;
            const isSelected = dateStr === calState.selectedDate;

            // Find appointments for this day
            const dayApts = appointments.filter(a => a.date === dateStr);
            const hasApt = dayApts.length > 0;

            let classes = ['apt-day-cell'];
            if (isToday) classes.push('is-today');
            if (isSelected) classes.push('is-selected');
            if (hasApt) classes.push('has-appointment');

            let badgeHtml = '';
            if (hasApt) {
                if (dayApts.length === 1) {
                    badgeHtml = `<span class="apt-badge-dot"></span>`;
                } else {
                    badgeHtml = `<span class="apt-cell-count">${dayApts.length}</span><span class="apt-badge-dot"></span>`;
                }
            }

            html += `
                <div class="${classes.join(' ')}" onclick="selectCalendarDate('${dateStr}')" title="${d} ${THAI_MONTHS[calState.month]} ${calState.year}${hasApt ? ` (${dayApts.length} นัดหมาย)` : ''}">
                    <span>${d}</span>
                    ${badgeHtml}
                </div>
            `;
        }

        gridEl.innerHTML = html;
    }

    window.selectCalendarDate = function (dateStr) {
        calState.selectedDate = dateStr;
        renderCalendar();
        renderSelectedDateSlots();
        cancelEditAppointment();
    };

    // Render Slots & Details Pane
    function renderSelectedDateSlots() {
        const labelEl = document.getElementById('apt-selected-date-label');
        const countBadge = document.getElementById('apt-date-count-badge');
        const listEl = document.getElementById('apt-slots-list');
        if (!listEl) return;

        const dateObj = parseDateYMD(calState.selectedDate);
        const dayOfWeek = THAI_DAYS[dateObj.getDay()];
        const thaiDateDisplay = `${dayOfWeek}ที่ ${dateObj.getDate()} ${THAI_MONTHS[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

        if (labelEl) labelEl.innerText = thaiDateDisplay;

        const allApts = getAllAppointments();
        const dayApts = allApts
            .filter(a => a.date === calState.selectedDate)
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        if (countBadge) {
            countBadge.innerText = `${dayApts.length} นัดหมาย`;
        }

        if (dayApts.length === 0) {
            listEl.innerHTML = `
                <div class="empty-slots">
                    <i class='bx bx-calendar-event'></i>
                    <p>ไม่มีนัดหมายในวันที่เลือก</p>
                    <small>ท่านสามารถเพิ่มนัดหมายใหม่ได้จากแบบฟอร์มด้านล่าง</small>
                </div>
            `;
            return;
        }

        let html = '';
        dayApts.forEach(apt => {
            let typeClass = 'apt-type-room';
            if (apt.type.includes('ตรวจรับ') || apt.type.includes('ย้ายเข้า')) typeClass = 'apt-type-movein';
            else if (apt.type.includes('ซ่อม')) typeClass = 'apt-type-repair';
            else if (apt.type.includes('สัญญา') || apt.type.includes('เอกสาร')) typeClass = 'apt-type-contract';
            else if (apt.type === 'อื่นๆ') typeClass = 'apt-type-other';

            html += `
                <div class="apt-slot-card" id="slot-card-${apt.id}">
                    <div class="apt-slot-main">
                        <div class="apt-slot-time-row">
                            <span class="apt-time-badge"><i class='bx bx-time'></i> ${escapeText(apt.time || '10:00')} น.</span>
                            <span class="apt-type-tag ${typeClass}">${escapeText(apt.type || 'นัดดูห้องพัก')}</span>
                        </div>
                        <h6 class="apt-slot-name">${escapeText(apt.name || 'ไม่ระบุชื่อ')}</h6>
                        ${apt.note ? `<p class="apt-slot-note">${escapeText(apt.note)}</p>` : ''}
                    </div>
                    <div class="apt-slot-actions">
                        <button type="button" class="apt-btn-icon edit" onclick="editAppointment('${apt.id}')" title="แก้ไข">
                            <i class='bx bx-edit-alt'></i>
                        </button>
                        <button type="button" class="apt-btn-icon delete" onclick="deleteAppointment('${apt.id}')" title="ลบ">
                            <i class='bx bx-trash'></i>
                        </button>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = html;
    }

    // Appointment Form Handlers
    window.handleSaveAppointment = async function (e) {
        e.preventDefault();

        const timeInput = document.getElementById('apt-input-time');
        const typeInput = document.getElementById('apt-input-type');
        const nameInput = document.getElementById('apt-input-name');
        const noteInput = document.getElementById('apt-input-note');
        const editIdInput = document.getElementById('apt-edit-id');

        const time = timeInput ? timeInput.value.trim() : '10:00';
        const type = typeInput ? typeInput.value : 'นัดดูห้องพัก';
        const name = nameInput ? nameInput.value.trim() : '';
        const note = noteInput ? noteInput.value.trim() : '';
        const editId = editIdInput ? editIdInput.value : '';

        if (!name) {
            alert('กรุณาระบุชื่อลูกค้าหรือผู้ติดต่อ');
            return;
        }

        const submitBtn = document.getElementById('apt-btn-submit');
        if (submitBtn) submitBtn.disabled = true;

        if (editId) {
            // Edit existing in Supabase
            if (typeof supabaseClient !== 'undefined') {
                const { error } = await supabaseClient
                    .from('appointments')
                    .update({ time, type, name, note })
                    .eq('id', editId);
                
                if (error) {
                    alert('เกิดข้อผิดพลาดในการแก้ไข: ' + error.message);
                } else {
                    const index = appointmentsList.findIndex(a => a.id === editId);
                    if (index !== -1) {
                        appointmentsList[index] = { ...appointmentsList[index], time, type, name, note };
                    }
                }
            }
        } else {
            // Create new in Supabase
            const newId = 'apt-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
            const newApt = {
                id: newId,
                date: calState.selectedDate,
                time: time,
                type: type,
                name: name,
                note: note
            };

            if (typeof supabaseClient !== 'undefined') {
                const { error } = await supabaseClient
                    .from('appointments')
                    .insert([newApt]);
                
                if (error) {
                    alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
                } else {
                    appointmentsList.push(newApt);
                }
            }
        }

        if (submitBtn) submitBtn.disabled = false;

        updateCalendarBadge();
        cancelEditAppointment();
        renderCalendar();
        renderSelectedDateSlots();
    };

    window.editAppointment = function (id) {
        const allApts = getAllAppointments();
        const apt = allApts.find(a => a.id === id);
        if (!apt) return;

        calState.editingId = id;

        document.getElementById('apt-edit-id').value = apt.id;
        document.getElementById('apt-input-time').value = apt.time || '10:00';
        document.getElementById('apt-input-type').value = apt.type || 'นัดดูห้องพัก';
        document.getElementById('apt-input-name').value = apt.name || '';
        document.getElementById('apt-input-note').value = apt.note || '';

        const title = document.getElementById('apt-form-title');
        if (title) title.innerHTML = `<i class='bx bx-edit'></i> แก้ไขนัดหมาย`;

        const submitText = document.getElementById('apt-btn-submit-text');
        if (submitText) submitText.innerText = 'บันทึกการแก้ไข';

        const cancelBtn = document.getElementById('apt-btn-cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        // Focus input
        document.getElementById('apt-input-name').focus();
    };

    window.cancelEditAppointment = function () {
        calState.editingId = null;

        const editId = document.getElementById('apt-edit-id');
        if (editId) editId.value = '';

        const nameInput = document.getElementById('apt-input-name');
        if (nameInput) nameInput.value = '';

        const noteInput = document.getElementById('apt-input-note');
        if (noteInput) noteInput.value = '';

        const title = document.getElementById('apt-form-title');
        if (title) title.innerHTML = `<i class='bx bx-plus-circle'></i> เพิ่มนัดหมายใหม่`;

        const submitText = document.getElementById('apt-btn-submit-text');
        if (submitText) submitText.innerText = 'บันทึกนัดหมาย';

        const cancelBtn = document.getElementById('apt-btn-cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';
    };

    window.deleteAppointment = async function (id) {
        if (!confirm('ต้องการลบนัดหมายนี้ใช่หรือไม่?')) return;

        if (typeof supabaseClient !== 'undefined') {
            const { error } = await supabaseClient
                .from('appointments')
                .delete()
                .eq('id', id);
            
            if (error) {
                alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
                return;
            }
        }

        appointmentsList = appointmentsList.filter(a => a.id !== id);
        updateCalendarBadge();

        if (calState.editingId === id) {
            cancelEditAppointment();
        }

        renderCalendar();
        renderSelectedDateSlots();
    };

    function escapeText(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Modal background click & ESC key listeners
    function initModalEventListeners() {
        const modal = document.getElementById('appointment-modal');
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAppointmentModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeAppointmentModal();
            }
        });
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    async function initEnhancements() {
        hookOpenChat();
        hookRenderContactList();
        hookChatFormSubmit();
        initModalEventListeners();
        
        await fetchAppointments();
        updateCalendarBadge();

        // Initial check for active chat email if already open
        const activeEmailEl = document.getElementById('active-chat-email');
        if (activeEmailEl && activeEmailEl.innerText) {
            updateRepliedButtonUI(activeEmailEl.innerText.trim());
        }

        // Apply badges in case contacts already loaded
        setTimeout(applyRepliedBadgesToContactList, 500);
        setTimeout(applyRepliedBadgesToContactList, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEnhancements);
    } else {
        initEnhancements();
    }
})();

