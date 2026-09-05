/**
 * js/shared/auth-guard.js
 * Shared authentication guard and logout functions for the Dorminator project.
 * Loaded globally before page-specific scripts.
 * Requires: supabase-config.js (for supabaseClient)
 */

// =========================================
//  Admin Guard
// =========================================

/**
 * Checks if the current user is an authenticated admin.
 * Redirects to login if no session, or to index if not an admin.
 * @returns {Promise<{session: object, profile: object}|null>} - Session and profile if admin, null if redirected
 */
async function requireAdmin() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = '../login.html';
            return null;
        }

        const { data: profile, error } = await supabaseClient
            .from('tenant_profiles')
            .select('role')
            .eq('email', session.user.email)
            .single();

        if (error || !profile || profile.role !== 'admin') {
            alert('⛔ ไม่อนุญาตให้เข้าถึง! คุณไม่มีสิทธิ์ผู้ดูแลระบบ');
            window.location.href = '../index.html';
            return null;
        }

        return { session, profile };
    } catch (err) {
        console.error('Auth guard error:', err);
        window.location.href = '../login.html';
        return null;
    }
}

// =========================================
//  Tenant Guard
// =========================================

/**
 * Checks if the current user is an authenticated tenant.
 * Redirects to login if no session.
 * @returns {Promise<{session: object, user: object}|null>} - Session and user if authenticated, null if redirected
 */
async function requireTenant() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
            window.location.href = '../login.html';
            return null;
        }

        return { session, user: session.user };
    } catch (err) {
        console.error('Auth guard error:', err);
        window.location.href = '../login.html';
        return null;
    }
}

// =========================================
//  Unified Logout
// =========================================

/**
 * Signs the user out of Supabase, clears cookies and session storage,
 * and redirects to the login page.
 * This replaces 8 separate logout() implementations across the project.
 */
async function logout() {
    if (!confirm('คุณต้องการออกจากระบบหรือไม่?')) return;

    // --- Rubric 9: Clear Cookie & Session ---
    document.cookie = 'rememberMe=; max-age=0; path=/;';
    sessionStorage.removeItem('savedEmail');
    sessionStorage.removeItem('sessionID');
    sessionStorage.clear();
    // ----------------------------------------

    try {
        await supabaseClient.auth.signOut();
    } catch (err) {
        // Sign out failed, but we still redirect
    }

    // Redirect based on current location
    if (window.location.pathname.includes('tenant') || window.location.pathname.includes('admin')) {
        window.location.href = '../login.html';
    } else {
        window.location.reload();
    }
}
