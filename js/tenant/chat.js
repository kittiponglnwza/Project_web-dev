let currentUserEmail = '';
let lastMessageCount = 0;
let isFetching = false;

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    const auth = await requireTenant(); 
    if (!auth) return; 
    const user = auth.user;
    currentUserEmail = user.email;

    await loadMessages();

    setTimeout(pollMessages, 3000);
});

async function pollMessages() {
    if (!isFetching) {
        await loadMessages();
    }
    setTimeout(pollMessages, 3000);
}

async function loadMessages() {
    isFetching = true;
    try {
        const { data: messages, error } = await supabaseClient
            .from('messages')
            .select('*')
            .or(`and(sender_email.eq.${currentUserEmail},receiver_email.eq.admin),and(sender_email.eq.admin,receiver_email.eq.${currentUserEmail})`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error loading messages:", error);
            return;
        }

        if (messages.length !== lastMessageCount) {
            lastMessageCount = messages.length;
            renderMessages(messages);
        }
    } catch (error) {
        console.error("Error in loadMessages:", error);
    } finally {
        isFetching = false;
    }
}

function renderMessages(messages) {
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 

    if (messages.length === 0) {
        chatBox.innerHTML = '<div style="text-align:center; color:#94a3b8; margin-top:20px; font-size:14px;">ยังไม่มีข้อความ เริ่มต้นทักทายแอดมินได้เลย!</div>';
        return;
    }

    messages.forEach(msg => {
        const isMe = msg.sender_email === currentUserEmail;
        const d = new Date(msg.created_at);
        const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

        const div = document.createElement('div');
        div.className = `msg-row ${isMe ? 'tenant' : 'admin'}`;
        
        div.innerHTML = `
            <div class="msg-bubble">
                ${escapeHTML(msg.message)}
                <span class="msg-time">${timeStr}</span>
            </div>
        `;
        chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('msg-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = ''; 

    try {
        const { error } = await supabaseClient
            .from('messages')
            .insert([{
                sender_email: currentUserEmail,
                receiver_email: 'admin',
                message: text
            }]);

        if (error) {
            alert("ส่งข้อความไม่สำเร็จ");
            console.error(error);
        } else {
            loadMessages();
        }
    } catch (error) {
        console.error("Error sending message:", error);
    }
});
