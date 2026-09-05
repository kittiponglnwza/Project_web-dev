let contacts = {}; 
let activeChatEmail = null;
let tenantProfiles = {}; 
let isFetching = false;
let lastMessageCount = 0;

document.addEventListener("DOMContentLoaded", async () => {
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

// ดึงรายชื่อผู้ติดต่อ (คนที่เคยแชทกับแอดมิน)
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
            }
        });

        const contactArray = Object.values(newContacts).sort((a, b) => new Date(b.time) - new Date(a.time));
        
        renderContactList(contactArray);
    } catch (err) {
        console.error(err);
    }
}

function renderContactList(contactArray) {
    const listDiv = document.getElementById('contact-list');
    if(contactArray.length === 0) {
        if(!listDiv.innerHTML.includes('ไม่มีประวัติ')) {
            listDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;">ยังไม่มีประวัติการแชท</div>';
        }
        return;
    }

    let html = '';
    contactArray.forEach(c => {
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
        await supabaseClient
            .from('messages')
            .update({ is_read: true })
            .eq('sender_email', tenantEmail)
            .eq('receiver_email', 'admin')
            .eq('is_read', false);

        await loadActiveChatMessages(true);
        loadContacts(); 
    } catch (err) {
        console.error(err);
    }
};

async function loadActiveChatMessages(forceScroll = false) {
    if (!activeChatEmail) return;

    try {
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_email.eq.admin,receiver_email.eq.${activeChatEmail}),and(sender_email.eq.${activeChatEmail},receiver_email.eq.admin)`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error(error);
            return;
        }

        if (messages.length !== lastMessageCount || forceScroll) {
            lastMessageCount = messages.length;
            renderMessages(messages, forceScroll);
        }
    } catch (err) {
        console.error(err);
    }
}

function renderMessages(messages, forceScroll) {
    const chatBox = document.getElementById('chat-box');
    let html = '';

    messages.forEach(msg => {
        const isAdmin = msg.sender_email === 'admin';
        const d = new Date(msg.created_at);
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

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
    });

    chatBox.innerHTML = html;

    if (forceScroll) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

window.deleteMessage = async function(msgId) {
    if(confirm("แน่ใจหรือไม่ว่าต้องการลบข้อความนี้? (ผู้เช่าก็จะมองไม่เห็นเช่นกัน)")) {
        try {
            const { error } = await supabaseClient.from('messages').delete().eq('id', msgId);
            if(!error) {
                loadActiveChatMessages(true);
            } else {
                console.error(error);
            }
        } catch (err) {
            console.error(err);
        }
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
