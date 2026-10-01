let contacts = {}; 
let activeChatEmail = null;
let tenantProfiles = {}; 
let isFetching = false;
let lastMessageCount = 0;
let currentChatTab = 'tenants'; // 'tenants' or 'guests'

function isMessageContactedHelper(msgId) {
    if (!msgId) return false;
    try {
        const localStatus = JSON.parse(localStorage.getItem('dorm_messages_contacted_status_v1') || '{}');
        return !!localStatus[msgId];
    } catch(e) {
        return false;
    }
}

function getMockBookingMessages() {
    const key = 'dorm_mock_booking_messages_v1';
    let stored = localStorage.getItem(key);
    if (!stored) {
        const today = new Date();
        const initial = [
            {
                id: 'msg-seed-booking-1',
                sender_email: 'system_booking@mydorm.com',
                receiver_email: 'admin',
                message: '🔔 แจ้งเตือน! มีลูกค้าสนใจจอง/ดูห้องพัก\nชื่อ: คุณพงศกร ธนโชติ\nเบอร์โทร: 081-445-6789\nวันที่คาดว่าจะเข้าอยู่: 2026-09-10\nID ห้องที่สนใจ: 302',
                is_read: false,
                is_contacted: false,
                created_at: new Date(today.getTime() - 3600000 * 2).toISOString()
            },
            {
                id: 'msg-seed-booking-2',
                sender_email: 'system_booking@mydorm.com',
                receiver_email: 'admin',
                message: '🔔 แจ้งเตือน! มีลูกค้าสนใจจอง/ดูห้องพัก\nชื่อ: คุณสุดารัตน์ พิมพากร\nเบอร์โทร: 089-987-6543\nวันที่คาดว่าจะเข้าอยู่: 2026-09-15\nID ห้องที่สนใจ: 105',
                is_read: false,
                is_contacted: false,
                created_at: new Date(today.getTime() - 1800000).toISOString()
            }
        ];
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
    }
    try {
        return JSON.parse(stored);
    } catch(e) {
        return [];
    }
}

window.switchChatTab = function(tabName) {
    currentChatTab = tabName;
    document.querySelectorAll('.chat-tab').forEach(btn => btn.classList.remove('active'));
    const targetBtn = document.querySelector(`.chat-tab[onclick*="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    loadContacts(); // reload list with new filter
};
function switchChatTab(tabName) {
    window.switchChatTab(tabName);
}

document.addEventListener("DOMContentLoaded", async () => {
    renderAdminSidebar();
    initSidebar();
    
    // ================= ADMIN GUARD =================
    const auth = await requireAdmin(); 
    if (!auth) return;
    // ===============================================

    try {
        // ดึงข้อมูลห้องพักของผู้เช่าทุกคนมาเก็บไว้ในหน่วยความจำ
        const { data: profiles, error } = await supabaseClient.from('tenant_profiles').select('email, room_no');
        if (profiles) {
            profiles.forEach(p => {
                tenantProfiles[p.email] = p.room_no || 'ไม่ระบุห้อง';
            });
        } else if (error) {
            console.error(error);
        }

        await loadContacts();

        // Back Button Logic for Mobile
        const backBtn = document.getElementById("back-to-list");
        if (backBtn) {
            backBtn.addEventListener("click", () => {
                document.getElementById("main-wrapper").classList.remove("chat-active");
            });
        }

        // locked setTimeout polling pattern
        const pollData = async () => {
            if (!isFetching) {
                isFetching = true;
                try {
                    await loadContacts();
                    if (activeChatEmail) {
                        await loadActiveChatMessages();
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    isFetching = false;
                }
            }
            setTimeout(pollData, 3000);
        };
        setTimeout(pollData, 3000);

        // ระบบค้นหา
        document.getElementById('search-input').addEventListener('input', (e) => {
            const keyword = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.contact-item');
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(keyword) ? 'flex' : 'none';
            });
        });
    } catch (err) {
        console.error(err);
    }
});

// ดึงรายชื่อผู้ติดต่อ (รวมประวัติแชทและลูกบ้านทั้งหมด)
async function loadContacts() {
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or('sender_email.eq.admin,receiver_email.eq.admin')
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
            return;
        }

        let newContacts = {};

        // 1. นำรายชื่อลูกบ้านทั้งหมดมาใส่ไว้ก่อน (เพื่อให้แอดมินทักไปก่อนได้)
        Object.keys(tenantProfiles).forEach(email => {
            newContacts[email] = {
                email: email,
                lastMsg: 'เริ่มสนทนา...',
                time: '1970-01-01T00:00:00.000Z', // ค่าเริ่มต้นเพื่อให้ไปอยู่ท้ายสุด
                unreadCount: 0
            };
        });

        // 2. นำประวัติการแชทมาอัปเดตทับ
        messages.forEach(msg => {
            const tenantEmail = msg.sender_email === 'admin' ? msg.receiver_email : msg.sender_email;
            if (!newContacts[tenantEmail]) {
                newContacts[tenantEmail] = {
                    email: tenantEmail,
                    lastMsg: msg.message,
                    time: msg.created_at,
                    unreadCount: 0
                };
            } else {
                newContacts[tenantEmail].lastMsg = msg.message;
                newContacts[tenantEmail].time = msg.created_at;
            }

            if (msg.sender_email === tenantEmail && msg.receiver_email === 'admin' && !msg.is_read) {
                newContacts[tenantEmail].unreadCount++;
                const isContacted = isMessageContactedHelper(msg.id) || msg.is_contacted === true;
                if (!isContacted) {
                    newContacts[tenantEmail].unreadCount++;
                }
            }
        });

        // Ensure system_booking appears even if messages table has no records yet (local fallback)
        if (!newContacts['system_booking@mydorm.com']) {
            const mockBookings = getMockBookingMessages();
            if (mockBookings.length > 0) {
                const uncontactedCount = mockBookings.filter(m => !isMessageContactedHelper(m.id) && m.is_contacted !== true).length;
                newContacts['system_booking@mydorm.com'] = {
                    email: 'system_booking@mydorm.com',
                    lastMsg: mockBookings[mockBookings.length - 1].message,
                    time: mockBookings[mockBookings.length - 1].created_at,
                    unreadCount: uncontactedCount
                };
            }
        }

        const contactArray = Object.values(newContacts).sort((a, b) => new Date(b.time) - new Date(a.time));
        
        renderContactList(contactArray);
    } catch (err) {
        console.error(err);
    }
}

function renderContactList(contactArray) {
    const listDiv = document.getElementById('contact-list');
    
    // กรองข้อมูลตาม Tab ที่เลือก
    const filteredContacts = contactArray.filter(c => {
        const isTenant = !!tenantProfiles[c.email];
        if (currentChatTab === 'tenants') return isTenant;
        if (currentChatTab === 'guests') return !isTenant;
        return true;
    });

    if(filteredContacts.length === 0) {
        if(!listDiv.innerHTML.includes('ไม่มีรายชื่อในหมวดนี้')) {
            listDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;">ไม่มีรายชื่อในหมวดนี้</div>';
        }
        return;
    }

    let html = '';
    filteredContacts.forEach(c => {
        let displayName = c.email.split('@')[0];
        let roleBadge = '';
        let isOutsider = !tenantProfiles[c.email];
        
        if (!isOutsider) {
            const roomNo = tenantProfiles[c.email];
            roleBadge = `<span class="contact-room" style="background:#3b82f6;">ห้อง ${escapeHTML(roomNo)}</span>`;
        } else {
            if (c.email === 'system_booking@mydorm.com') {
                displayName = "ระบบแจ้งเตือน";
                roleBadge = `<span class="contact-room" style="background:#f59e0b;">ลูกค้านัดดูห้อง</span>`;
            } else {
                roleBadge = `<span class="contact-room" style="background:#8b5cf6;">ผู้ติดต่อภายนอก</span>`;
            }
        }

        const isActive = activeChatEmail === c.email ? 'active' : '';
        const unreadBadge = c.unreadCount > 0 ? `<span class="unread-badge">${c.unreadCount}</span>` : '';
        
        const d = new Date(c.time);
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="contact-item ${isActive}" onclick="openChat('${escapeHTML(c.email)}')">
                <div class="contact-avatar" style="${isOutsider ? 'background:#f59e0b;' : ''}"><i class='bx ${isOutsider ? 'bxs-bell-ring' : 'bx-user'}'></i></div>
                <div class="contact-info">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 class="contact-name">${escapeHTML(displayName)} ${roleBadge}</h4>
                        <span style="font-size:10px; color:#94a3b8;">${timeStr}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <p class="contact-msg">${escapeHTML(c.lastMsg)}</p>
                        ${unreadBadge}
                    </div>
                </div>
            </div>
        `;
    });

    if(listDiv.innerHTML !== html) {
        listDiv.innerHTML = html;
    }
}

window.openChat = async function(tenantEmail) {
    document.getElementById("main-wrapper").classList.add("chat-active");
    activeChatEmail = tenantEmail;
    
    let chatTitle = "";
    let isOutsider = !tenantProfiles[tenantEmail];
    
    if (!isOutsider) {
        chatTitle = `ผู้เช่าห้อง ${tenantProfiles[tenantEmail]}`;
        document.getElementById('chat-form').style.display = 'flex';
    } else {
        if (tenantEmail === 'system_booking@mydorm.com') {
            chatTitle = `ลูกค้านัดดูห้อง (ระบบอัตโนมัติ)`;
            document.getElementById('chat-form').style.display = 'none';
        } else {
            chatTitle = `ผู้ติดต่อภายนอก`;
            document.getElementById('chat-form').style.display = 'flex';
        }
    }

    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('chat-header').style.display = 'flex';
    document.getElementById('chat-box').style.display = 'flex';

    document.getElementById('active-chat-name').innerText = chatTitle;
    document.getElementById('active-chat-email').innerText = tenantEmail;

    const items = document.querySelectorAll('.contact-item');
    items.forEach(item => item.classList.remove('active'));
    
    try {
        // Do NOT bulk mark all booking notifications as read on open
        // Per-card action specifically marks individual message as acknowledged & contacted!
        if (tenantEmail !== 'system_booking@mydorm.com') {
            await supabaseClient
                .from('messages')
                .update({ is_read: true })
                .eq('sender_email', tenantEmail)
                .eq('receiver_email', 'admin')
                .eq('is_read', false);
        }

        await loadActiveChatMessages(true);
        loadContacts(); 
    } catch (err) {
        console.error(err);
    }
};

async function loadActiveChatMessages(forceScroll = false) {
    if (!activeChatEmail) return;

    try {
        let messages = [];
        const { data, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_email.eq.admin,receiver_email.eq.${activeChatEmail}),and(sender_email.eq.${activeChatEmail},receiver_email.eq.admin)`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
        } else if (data) {
            messages = data;
        }

        // Fallback for system_booking if empty or offline
        if (activeChatEmail === 'system_booking@mydorm.com' && messages.length === 0) {
            messages = getMockBookingMessages();
        }

        if (messages.length !== lastMessageCount || forceScroll) {
            lastMessageCount = messages.length;
            renderMessages(messages, forceScroll);
        }
    } catch (err) {
        console.error(err);
        if (activeChatEmail === 'system_booking@mydorm.com') {
            const mock = getMockBookingMessages();
            renderMessages(mock, forceScroll);
        }
    }
}

function formatBookingMessageBody(rawMessage) {
    const nameMatch = rawMessage.match(/ชื่อ:\s*([^\n\r]+)/);
    const phoneMatch = rawMessage.match(/เบอร์โทร:\s*([^\n\r]+)/);
    const dateMatch = rawMessage.match(/วันที่คาดว่าจะเข้าอยู่:\s*([^\n\r]+)/);
    const roomMatch = rawMessage.match(/ID ห้องที่สนใจ:\s*([^\n\r]+)/);

    if (nameMatch || phoneMatch || dateMatch || roomMatch) {
        const name = nameMatch ? nameMatch[1].trim() : 'ไม่ระบุชื่อ';
        const phone = phoneMatch ? phoneMatch[1].trim() : '-';
        const dateVal = dateMatch ? dateMatch[1].trim() : 'ไม่ได้ระบุ';
        const roomId = roomMatch ? roomMatch[1].trim() : '-';

        return `
            <div class="booking-grid">
                <div class="booking-field">
                    <span class="field-label"><i class='bx bx-user'></i> ผู้สนใจ / นัดดู:</span>
                    <strong class="field-value">${escapeHTML(name)}</strong>
                </div>
                <div class="booking-field">
                    <span class="field-label"><i class='bx bx-phone'></i> เบอร์โทรศัพท์:</span>
                    <span class="field-value"><a href="tel:${escapeHTML(phone)}" class="phone-link">${escapeHTML(phone)}</a></span>
                </div>
                <div class="booking-field">
                    <span class="field-label"><i class='bx bx-calendar'></i> คาดว่าจะเข้าอยู่:</span>
                    <span class="field-value">${escapeHTML(dateVal)}</span>
                </div>
                <div class="booking-field">
                    <span class="field-label"><i class='bx bx-door-open'></i> ห้องที่สนใจ:</span>
                    <span class="field-value"><span class="room-pill">ห้อง ${escapeHTML(roomId)}</span></span>
                </div>
            </div>
        `;
    }

    return `<div style="white-space: pre-line; line-height: 1.5;">${escapeHTML(rawMessage)}</div>`;
}

function renderMessages(messages, forceScroll) {
    const chatBox = document.getElementById('chat-box');
    let html = '';

    messages.forEach(msg => {
        const isAdmin = msg.sender_email === 'admin';
        const isBookingNotif = msg.sender_email === 'system_booking@mydorm.com' || (msg.message && msg.message.includes('🔔 แจ้งเตือน'));
        const isContacted = msg.is_contacted === true || isMessageContactedHelper(msg.id);
        const d = new Date(msg.created_at);
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        if (isBookingNotif) {
            html += `
                <div class="msg-row tenant booking-row" style="position: relative;">
                    <button onclick="deleteMessage('${escapeHTML(msg.id)}')" title="ลบข้อความนี้" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer; align-self:flex-start; margin-top:14px; margin-right:8px;"><i class='bx bx-trash'></i></button>
                    
                    <div class="booking-notif-card ${isContacted ? 'is-contacted' : ''}" id="booking-card-${escapeHTML(msg.id)}">
                        <div class="booking-notif-header">
                            <div class="booking-notif-type">
                                <i class='bx bxs-bell-ring'></i>
                                <span>แจ้งเตือนจอง / นัดดูห้องพัก</span>
                            </div>
                            <div class="booking-notif-status ${isContacted ? 'contacted' : 'uncontacted'}" id="status-badge-${escapeHTML(msg.id)}">
                                <i class='bx ${isContacted ? 'bx-check-double' : 'bx-time-five'}'></i>
                                <span>${isContacted ? 'ติดต่อเรียบร้อยแล้ว' : 'รอดำเนินการติดต่อ'}</span>
                            </div>
                        </div>

                        <div class="booking-notif-body">
                            ${formatBookingMessageBody(msg.message)}
                        </div>

                        <div class="booking-notif-footer">
                            <button type="button" 
                                    class="btn-contact-action ${isContacted ? 'is-contacted' : ''}" 
                                    id="btn-contact-${escapeHTML(msg.id)}" 
                                    onclick="toggleMessageContactStatus('${escapeHTML(msg.id)}', event)"
                                    title="${isContacted ? 'คลิกเพื่อสลับกลับเป็นยังไม่ติดต่อ' : 'คลิกเพื่อบันทึกว่าติดต่อลูกค้าแล้ว'}">
                                <i class='bx ${isContacted ? 'bxs-check-circle' : 'bx-check-circle'}'></i>
                                <span class="btn-contact-text">${isContacted ? 'รับทราบและติดต่อเรียบร้อยแล้ว' : 'รับทราบและติดต่อเรียบร้อย'}</span>
                            </button>
                            <span class="msg-time" style="margin:0;">${timeStr}</span>
                        </div>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="msg-row ${isAdmin ? 'admin' : 'tenant'}" style="position: relative;">
                    ${!isAdmin ? `<button onclick="deleteMessage('${escapeHTML(msg.id)}')" title="ลบข้อความนี้" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer; align-self:center; margin-right:8px;"><i class='bx bx-trash'></i></button>` : ''}
                    
                    <div class="msg-bubble">
                        ${escapeHTML(msg.message)}
                        <span class="msg-time">${timeStr}</span>
                    </div>
                    
                    ${isAdmin ? `<button onclick="deleteMessage('${escapeHTML(msg.id)}')" title="ลบข้อความนี้" style="background:none; border:none; color:#ef4444; font-size:16px; cursor:pointer; align-self:center; margin-left:8px;"><i class='bx bx-trash'></i></button>` : ''}
                </div>
            `;
        }
    });

    chatBox.innerHTML = html;

    if (forceScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

window.toggleMessageContactStatus = async function(msgId, event) {
    if (event) event.stopPropagation();

    let localStatus = {};
    try {
        localStatus = JSON.parse(localStorage.getItem('dorm_messages_contacted_status_v1') || '{}');
    } catch(e) {}

    const card = document.getElementById(`booking-card-${msgId}`);
    const currentlyContacted = card ? card.classList.contains('is-contacted') : !!localStatus[msgId];
    const newStatus = !currentlyContacted;

    // 1. Update local state fallback
    localStatus[msgId] = newStatus;
    localStorage.setItem('dorm_messages_contacted_status_v1', JSON.stringify(localStatus));

    // Update in mock list if applicable
    try {
        const mockKey = 'dorm_mock_booking_messages_v1';
        let mockList = JSON.parse(localStorage.getItem(mockKey) || '[]');
        const target = mockList.find(m => m.id === msgId);
        if (target) {
            target.is_contacted = newStatus;
            target.is_read = newStatus;
            localStorage.setItem(mockKey, JSON.stringify(mockList));
        }
    } catch(e) {}

    // 2. Update card in DOM immediately for instant UI feedback
    if (card) {
        const statusBadge = document.getElementById(`status-badge-${msgId}`);
        const btn = document.getElementById(`btn-contact-${msgId}`);

        if (newStatus) {
            card.classList.add('is-contacted');
            if (statusBadge) {
                statusBadge.className = 'booking-notif-status contacted';
                statusBadge.innerHTML = `<i class='bx bx-check-double'></i> <span>ติดต่อเรียบร้อยแล้ว</span>`;
            }
            if (btn) {
                btn.classList.add('is-contacted');
                btn.innerHTML = `<i class='bx bxs-check-circle'></i> <span class="btn-contact-text">รับทราบและติดต่อเรียบร้อยแล้ว</span>`;
                btn.setAttribute('title', 'คลิกเพื่อสลับกลับเป็นยังไม่ติดต่อ');
            }

            // ดึงข้อมูลจากการ์ดแจ้งเตือนแล้วส่งไปเติมในปฏิทิน
            const bookingData = {};
            const fields = card.querySelectorAll('.booking-field');
            fields.forEach(field => {
                const label = field.querySelector('.field-label');
                const value = field.querySelector('.field-value');
                if (label && value) {
                    const labelText = label.innerText.trim();
                    if (labelText.includes('ผู้สนใจ')) {
                        bookingData.name = value.innerText.trim();
                    } else if (labelText.includes('เบอร์โทร')) {
                        bookingData.phone = value.innerText.trim();
                    } else if (labelText.includes('เข้าอยู่')) {
                        bookingData.date = value.innerText.trim();
                    } else if (labelText.includes('ห้อง')) {
                        bookingData.room = value.innerText.trim();
                    }
                }
            });

            // เปิดหน้าต่างปฏิทินนัดหมาย พร้อมเติมข้อมูลลูกค้า
            if (typeof window.openAppointmentModal === 'function') {
                window.openAppointmentModal(bookingData);
            }
        } else {
            card.classList.remove('is-contacted');
            if (statusBadge) {
                statusBadge.className = 'booking-notif-status uncontacted';
                statusBadge.innerHTML = `<i class='bx bx-time-five'></i> <span>รอดำเนินการติดต่อ</span>`;
            }
            if (btn) {
                btn.classList.remove('is-contacted');
                btn.innerHTML = `<i class='bx bx-check-circle'></i> <span class="btn-contact-text">รับทราบและติดต่อเรียบร้อย</span>`;
                btn.setAttribute('title', 'คลิกเพื่อบันทึกว่าติดต่อลูกค้าแล้ว');
            }
        }
    }

    // 3. Supabase update query for the specific message
    if (window.supabaseClient) {
        try {
            const { error } = await supabaseClient
                .from('messages')
                .update({ is_contacted: newStatus, is_read: true })
                .eq('id', msgId);

            if (error) {
                console.warn('Supabase update returned error, kept in local state:', error);
            }
        } catch (err) {
            console.warn('Supabase update offline or failed, kept in local state:', err);
        }
    }

    // 4. Update sidebar list unread counts
    if (typeof loadContacts === 'function') {
        loadContacts();
    }
};

window.deleteMessage = async function(msgId) {
    if (confirm("แน่ใจหรือไม่ว่าต้องการลบข้อความนี้? (ผู้เช่าก็จะมองไม่เห็นเช่นกัน)")) {
        try {
            if (window.supabaseClient) {
                const { error } = await supabaseClient.from('messages').delete().eq('id', msgId);
                if (error) console.warn(error);
            }
        } catch (err) {
            console.warn(err);
        }
        try {
            const mockKey = 'dorm_mock_booking_messages_v1';
            let mockList = JSON.parse(localStorage.getItem(mockKey) || '[]');
            mockList = mockList.filter(m => m.id !== msgId);
            localStorage.setItem(mockKey, JSON.stringify(mockList));
        } catch(e) {}

        loadActiveChatMessages(true);
        loadContacts();
    }
};

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!activeChatEmail) return;

    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = ''; 

    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{
                sender_email: 'admin',
                receiver_email: activeChatEmail,
                message: text,
                is_read: false
            }]);

        if (!error) {
            loadActiveChatMessages(true);
            loadContacts();
        } else {
            console.error(error);
        }
    } catch (err) {
        console.error(err);
    }
});
