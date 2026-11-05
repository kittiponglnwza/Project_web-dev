/**
 * js/shared/session.js
 * Rubric 9: จัดการ Cookie และ Session ตามวงจรการทำงานของ Session
 * ใช้ sessionStorage เป็น Session ฝั่ง Client ควบคู่กับ Supabase Auth
 */

const DormSession = {
    // 1. Initialize a session object
    init() {
        if (!this.id()) {
            sessionStorage.setItem('dorm_session_id', 'sess_' + crypto.randomUUID());
            this.set('started_at', new Date().toISOString());
        }
        return this.id();
    },

    // 2. Store information/state in the session object
    set(key, value) {
        sessionStorage.setItem('dorm_' + key, value == null ? '' : String(value));
    },

    // 3. Get values from session objects
    get(key) {
        return sessionStorage.getItem('dorm_' + key);
    },

    // 4. Retrieve a session ID
    id() {
        return sessionStorage.getItem('dorm_session_id');
    },

    // 5. Remove a session variable
    remove(key) {
        sessionStorage.removeItem('dorm_' + key);
    },

    // 6. Terminate a session
    terminate() {
        sessionStorage.clear();
    }
};

function setCookie(name, value, days) {
    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

function getCookie(name) {
    const row = document.cookie.split('; ').find(item => item.startsWith(name + '='));
    return row ? decodeURIComponent(row.slice(name.length + 1)) : null;
}

function deleteCookie(name) {
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}

/**
 * เก็บอีเมล สิทธิ์ และเลขห้องจากฐานข้อมูลลง Session
 * หน้าอื่นจะนำค่าเหล่านี้ไปใช้ประมวลผลข้อมูลในฐานข้อมูลต่อ
 * @param {string} email - อีเมลของผู้ใช้ที่เข้าสู่ระบบ
 * @returns {Promise<object|null>} - แถวข้อมูลจาก tenant_profiles
 */
async function loadSessionProfile(email) {
    DormSession.init();
    DormSession.set('user_email', email);

    const { data: profile, error } = await supabaseClient
        .from('tenant_profiles')
        .select('role, room_no')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Session profile error:', error);
        return null;
    }

    DormSession.set('user_role', profile ? profile.role : 'tenant');
    DormSession.set('room_no', profile ? profile.room_no : '');
    return profile;
}
