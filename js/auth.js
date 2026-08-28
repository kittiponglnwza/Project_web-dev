document.addEventListener("DOMContentLoaded", () => {
    // 1. เช็คสถานะล็อกอินทันทีที่โหลดหน้าเว็บ (ทั้งหน้า index, detail และ login)
    checkLoginStatus();

    // 2. ระบบเข้าสู่ระบบ (หน้า login.html)
    const loginForm = document.getElementById("loginForm");
    
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault(); // ป้องกันเว็บโหลดใหม่

            const emailInput = document.getElementById("l_email");
            const passwordInput = document.getElementById("l_password");
            const rememberMe = document.getElementById("rememberMe").checked;

            const emailVal = emailInput.value.trim();
            const passVal = passwordInput.value;

            // --- Front-End Validation (Rubric ข้อที่ 3) ---
            let isValid = true;
            
            // RegEx ตรวจสอบรูปแบบอีเมล
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!emailRegex.test(emailVal)) {
                emailInput.classList.add("invalid");
                document.getElementById("emailError").style.display = "block";
                isValid = false;
            } else {
                emailInput.classList.remove("invalid");
                document.getElementById("emailError").style.display = "none";
            }

            // ตรวจสอบความยาวรหัสผ่าน
            if (passVal.length < 6) {
                passwordInput.classList.add("invalid");
                document.getElementById("passwordError").style.display = "block";
                isValid = false;
            } else {
                passwordInput.classList.remove("invalid");
                document.getElementById("passwordError").style.display = "none";
            }

            // --- Session/Cookies Management (Rubric ข้อที่ 9) ---
            if (isValid) {
                // จำลองข้อมูลผู้ใช้
                const userData = { 
                    email: emailVal, 
                    loginTime: new Date().getTime() 
                };
                
                // ถ้าเลือก "จดจำการเข้าสู่ระบบ" ให้บันทึกลง LocalStorage (อยู่ถาวรคล้าย Cookie)
                // ถ้าไม่เลือก ให้บันทึกลง SessionStorage (หายไปเมื่อปิดเบราว์เซอร์)
                if (rememberMe) {
                    localStorage.setItem("userSession", JSON.stringify(userData));
                    sessionStorage.removeItem("userSession");
                } else {
                    sessionStorage.setItem("userSession", JSON.stringify(userData));
                    localStorage.removeItem("userSession");
                }

                alert("เข้าสู่ระบบสำเร็จ!");
                window.location.href = "index.html"; // กลับไปหน้าแรก
            }
        });
    }
});

// ฟังก์ชันตรวจสอบและเปลี่ยนปุ่ม Login
function checkLoginStatus() {
    // อ่านค่าจาก Session หรือ LocalStorage
    const sessionUser = sessionStorage.getItem("userSession");
    const localUser = localStorage.getItem("userSession");
    
    const user = sessionUser || localUser;
    
    // ค้นหาปุ่ม Login บนแถบเมนู (ถ้ามี)
    const loginBtn = document.querySelector(".btn-login");

    if (user) {
        // หากมีข้อมูลแสดงว่าเข้าสู่ระบบแล้ว
        const userData = JSON.parse(user);
        const username = userData.email.split('@')[0]; // ดึงชื่อหน้า @ มาแสดง
        
        if (loginBtn) {
            loginBtn.innerHTML = `<i class='bx bx-user'></i> ${username} (ออกระบบ)`;
            loginBtn.style.backgroundColor = "#d4af37"; // เปลี่ยนปุ่มเป็นสีทอง
            loginBtn.style.color = "#111";
            
            // เปลี่ยนหน้าที่ของปุ่มให้กลายเป็นปุ่ม Logout
            loginBtn.href = "#";
            loginBtn.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }
        
        // ถ้าผู้ใช้เผลอกลับมาหน้า Login ให้เด้งกลับไปหน้าแรกอัตโนมัติ
        if (window.location.pathname.includes("login.html")) {
            window.location.href = "index.html";
        }
    }
}

function logout() {
    if(confirm("คุณต้องการออกจากระบบหรือไม่?")) {
        // ล้างข้อมูล Session/Cookies
        localStorage.removeItem("userSession");
        sessionStorage.removeItem("userSession");
        window.location.reload(); // โหลดหน้าเว็บใหม่
    }
}
