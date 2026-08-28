document.addEventListener("DOMContentLoaded", () => {
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
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: emailVal,
                    password: passVal,
                });

                if (error) throw error;

                alert("เข้าสู่ระบบสำเร็จ!");
                window.location.href = "index.html"; // กลับไปหน้าแรก

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
                const { data, error } = await supabase.auth.signUp({
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
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        // หากเข้าสู่ระบบแล้ว
        const user = session.user;
        
        // ดึงชื่อเต็มมาจาก user_metadata (ที่เราแนบไปตอนสมัคร)
        // ถ้าไม่มีให้ดึงชื่อจากอีเมล
        let displayName = user.email.split('@')[0];
        if (user.user_metadata && user.user_metadata.full_name) {
            displayName = user.user_metadata.full_name.split(' ')[0]; // เอาแค่ชื่อแรก
        }
        
        if (loginBtn) {
            loginBtn.innerHTML = `<i class='bx bx-user'></i> ${displayName} (ออกระบบ)`;
            loginBtn.style.backgroundColor = "#d4af37";
            loginBtn.style.color = "#111";
            
            loginBtn.href = "#";
            loginBtn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
        
        // ถ้าเผลอกลับมาหน้า login หรือ register ให้เด้งไปหน้าแรก
        if (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html")) {
            window.location.href = "index.html";
        }
    }
}

async function logout() {
    if(confirm("คุณต้องการออกจากระบบหรือไม่?")) {
        // สั่ง Logout ออกจากระบบ Supabase
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.reload(); 
        }
    }
}
