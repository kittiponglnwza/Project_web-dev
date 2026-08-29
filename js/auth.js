document.addEventListener("DOMContentLoaded", () => {
    // --- Rubric 9: Cookie + Session (Initialize / Get) ---
    const isRemembered = document.cookie.includes("rememberMe=true");
    const savedEmail = sessionStorage.getItem("savedEmail");
    const sessID = sessionStorage.getItem("sessionID");
    
    if (isRemembered && savedEmail) {
        const emailInput = document.getElementById("l_email");
        const rememberCheckbox = document.getElementById("rememberMe");
        if (emailInput && rememberCheckbox) {
            emailInput.value = savedEmail;
            rememberCheckbox.checked = true;
            console.log("Session Restored:", sessID);
        }
    }
    // ---------------------------------------------------
    // ==========================================
    // ดักจับ Event เมื่อกดลิงก์ "กู้รหัสผ่าน" จากอีเมล
    // ==========================================
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            // เมื่อตรวจพบว่ามาจากลิงก์กู้รหัสผ่าน ให้เด้งหน้าต่างถามรหัสใหม่
            const newPassword = prompt("🔑 ระบบตรวจสอบพบการขอกู้คืนบัญชี!\nกรุณากรอก 'รหัสผ่านใหม่' ที่คุณต้องการตั้ง (ขั้นต่ำ 6 ตัวอักษร):");
            
            if (newPassword && newPassword.length >= 6) {
                // ส่งคำสั่งอัปเดตรหัสผ่านใหม่ไปที่ Supabase
                const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
                
                if (error) {
                    alert("❌ เปลี่ยนรหัสผ่านไม่สำเร็จ: " + error.message);
                } else {
                    alert("✅ ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว! ระบบจะนำคุณเข้าสู่เว็บไซต์ทันที");
                    window.location.href = "tenant/dashboard.html"; // เปลี่ยนรหัสเสร็จกลับไปหน้า Dashboard
                }
            } else {
                alert("❌ คุณไม่ได้กรอกรหัสผ่าน หรือรหัสผ่านสั้นเกินไป (ยกเลิกการตั้งรหัสผ่านใหม่)");
            }
        }
    });

    // 1. เช็คสถานะล็อกอินทันทีที่โหลดหน้าเว็บผ่าน Supabase Auth
    checkLoginStatus();

    // ==========================================
    // ระบบเข้าสู่ระบบ (หน้า login.html)
    // ==========================================
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault(); 

            const emailInput = document.getElementById("l_email");
            const passwordInput = document.getElementById("l_password");
            const btnSubmit = loginForm.querySelector("button[type='submit']");

            const emailVal = emailInput.value.trim();
            const passVal = passwordInput.value;

            // รัน Loader ที่ปุ่ม
            const originalBtnText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = "กำลังเข้าสู่ระบบ... <i class='bx bx-loader-alt bx-spin'></i>";
            btnSubmit.disabled = true;

            try {
                // เรียกใช้ Supabase Auth ของจริง!
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal,
                });

                if (error) throw error;

                // เช็ค Role จากตารางโปรไฟล์
                const { data: profile } = await supabaseClient.from('tenant_profiles').select('role').eq('email', data.user.email).single();
                const isAdmin = profile && profile.role === 'admin';

                alert("เข้าสู่ระบบสำเร็จ!");
                if(isAdmin) {
                    window.location.href = "admin/dashboard.html";
                } else {
                    window.location.href = "tenant/dashboard.html";
                }

            } catch (error) {
                console.error("Login Error:", error);
                document.getElementById("emailError").innerText = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                document.getElementById("emailError").style.display = "block";
                emailInput.classList.add("invalid");
                passwordInput.classList.add("invalid");
            } finally {
                btnSubmit.innerHTML = originalBtnText;
                btnSubmit.disabled = false;
            }
        });

        // ==========================================
        // ระบบลืมรหัสผ่าน (Forgot Password)
        // ==========================================
        const forgotBtn = document.getElementById("forgotPasswordBtn");
        if (forgotBtn) {
            forgotBtn.addEventListener("click", async (e) => {
                e.preventDefault();
                
                // ให้ผู้ใช้กรอกอีเมลผ่านหน้าต่าง Prompt ของ Browser
                const email = prompt("กรุณากรอก 'อีเมล' ของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน:\n(ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่อีเมลนี้)");
                
                if (email) {
                    try {
                        const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email);
                        if (error) throw error;
                        
                        alert("✅ ส่งลิงก์รีเซ็ตรหัสผ่านสำเร็จ!\n\nกรุณาตรวจสอบกล่องข้อความ (Inbox) หรือโฟลเดอร์สแปมในอีเมลของคุณ");
                    } catch (error) {
                        alert("❌ เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถส่งลิงก์ได้"));
                    }
                }
            });
        }
    }

    // ==========================================
    // ระบบสมัครสมาชิก (หน้า register.html)
    // ==========================================
    const registerForm = document.getElementById("registerForm");

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            // ดึงค่าจากฟอร์ม
            const title = document.getElementById("r_title").value;
            const fullName = document.getElementById("r_fullname").value.trim();
            const phone = document.getElementById("r_phone").value.trim();
            const email = document.getElementById("r_email").value.trim();
            const password = document.getElementById("r_password").value;
            const confirmPassword = document.getElementById("r_confirm_password").value;

            const phoneError = document.getElementById("phoneError");
            const matchError = document.getElementById("passwordMatchError");
            const mainError = document.getElementById("registerError");
            const btnRegister = document.getElementById("btnRegister");

            // รีเซ็ตแจ้งเตือน
            phoneError.style.display = "none";
            matchError.style.display = "none";
            mainError.style.display = "none";

            // Validation: ตรวจสอบเบอร์โทรด้วย RegEx
            const phoneRegex = /^0\d{9}$/;
            if (!phoneRegex.test(phone)) {
                phoneError.style.display = "block";
                return;
            }

            // Validation: รหัสผ่านตรงกันไหม
            if (password !== confirmPassword) {
                matchError.style.display = "block";
                return;
            }

            // รัน Loader
            const originalBtnText = btnRegister.innerHTML;
            btnRegister.innerHTML = "กำลังสร้างบัญชี... <i class='bx bx-loader-alt bx-spin'></i>";
            btnRegister.disabled = true;

            try {
                // สมัครสมาชิกผ่าน Supabase Auth
                // และแนบข้อมูลส่วนตัว (Metadata) ไปเก็บไว้ด้วยเพื่อใช้อ้างอิง
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            title: title,
                            full_name: fullName,
                            phone: phone
                        }
                    }
                });

                if (error) throw error;

                // นำอีเมลของผู้ใช้ใหม่ไปบันทึกในตารางโปรไฟล์
                // (Role จะถูกเซ็ตเป็น 'tenant' อัตโนมัติจาก Default ของ Database เพื่อความปลอดภัย)
                await supabaseClient.from('tenant_profiles').insert([{ 
                    email: email
                }]);

                alert("สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่านที่คุณตั้งไว้");
                window.location.href = "login.html";

            } catch (error) {
                console.error("Register Error:", error);
                mainError.innerText = "เกิดข้อผิดพลาด: " + (error.message || "ไม่สามารถสมัครสมาชิกได้");
                mainError.style.display = "block";
            } finally {
                btnRegister.innerHTML = originalBtnText;
                btnRegister.disabled = false;
            }
        });
    }
});

// ฟังก์ชันตรวจสอบการเข้าสู่ระบบผ่าน Supabase (ทำงานอัตโนมัติ)
async function checkLoginStatus() {
    const loginBtn = document.querySelector(".btn-login");

    // ดึง Session ของผู้ใช้ปัจจุบันจาก Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        // หากเข้าสู่ระบบแล้ว
        const user = session.user;
        
        // ดึงชื่อเต็มมาจาก user_metadata (ที่เราแนบไปตอนสมัคร)
        // ถ้าไม่มีให้ดึงชื่อจากอีเมล
        let displayName = user.email.split('@')[0];
        if (user.user_metadata && user.user_metadata.full_name) {
            displayName = user.user_metadata.full_name.split(' ')[0]; // เอาแค่ชื่อแรก
        }
        
        // เช็ค Role จาก Database
        const { data: profile } = await supabaseClient.from('tenant_profiles').select('role').eq('email', user.email).single();
        const isAdmin = profile && profile.role === 'admin';

        if (loginBtn) {
            loginBtn.innerHTML = `<i class='bx bxs-dashboard'></i> แผงควบคุม`;
            loginBtn.style.backgroundColor = "#d4af37";
            loginBtn.style.color = "#111";
            
            // ให้กดแล้วเด้งไปหน้า Dashboard ตามสิทธิ์
            loginBtn.href = isAdmin ? "admin/dashboard.html" : "tenant/dashboard.html";
            loginBtn.onclick = null; 
        }
        
        // ถ้าเผลอกลับมาหน้า login หรือ register ให้เด้งไปหน้าแผงควบคุมเลย
        if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
            window.location.href = isAdmin ? "admin/dashboard.html" : "tenant/dashboard.html";
        }
    }
}

async function logout() {
    if(confirm("คุณต้องการออกจากระบบหรือไม่?")) {
        // สั่ง Logout ออกจากระบบ Supabase
        const { error } = await supabaseClient.auth.signOut();
        if (!error) {
            window.location.reload(); 
        }
    }
}
