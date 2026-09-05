document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    const auth = await requireTenant(); 
    if (!auth) return; 
    const user = auth.user;

    document.getElementById("p_email").innerText = user.email;
    if (user.user_metadata) {
        let title = user.user_metadata.title || "";
        let fName = user.user_metadata.full_name || "ไม่ระบุ";
        if (fName.trim().startsWith(title)) {
            document.getElementById("p_name").innerText = fName;
        } else {
            document.getElementById("p_name").innerText = title + " " + fName;
        }
        document.getElementById("p_phone").innerText = user.user_metadata.phone || "ไม่ระบุเบอร์โทรศัพท์";
    }
    
    try {
        const { data: profile, error } = await supabaseClient
            .from('tenant_profiles')
            .select('*')
            .eq('email', user.email)
            .single();
            
        if (profile && !error) {
            document.getElementById("p_nid").innerText = profile.national_id || "ไม่ระบุ";
            document.getElementById("p_address").innerText = profile.address || "ไม่ระบุ";
            document.getElementById("p_room").innerText = "ห้อง " + (profile.room_no || "-");
            document.getElementById("p_start").innerText = profile.start_date || "-";
            document.getElementById("p_end").innerText = profile.end_date || "-";
            document.getElementById("p_em_name").innerText = profile.emergency_contact || "-";
            document.getElementById("p_em_phone").innerText = profile.emergency_phone || "-";
            
            const statusEl = document.getElementById("p_status");
            if (profile.lease_status === "Active") {
                statusEl.innerHTML = "🟢 Active (กำลังเช่า)";
                statusEl.style.color = "#059669";
            } else {
                statusEl.innerHTML = "🔴 Inactive";
                statusEl.style.color = "#dc2626";
            }
        } else {
            document.getElementById("p_nid").innerText = "ยังไม่มีข้อมูลในระบบ";
            document.getElementById("p_address").innerText = "-";
            document.getElementById("p_room").innerText = "รอการอนุมัติห้องพัก";
            document.getElementById("p_start").innerText = "-";
            document.getElementById("p_end").innerText = "-";
            document.getElementById("p_em_name").innerText = "-";
            document.getElementById("p_em_phone").innerText = "-";
            document.getElementById("p_status").innerText = "รอการทำสัญญา";
            document.getElementById("p_status").style.color = "#d97706";
        }
    } catch (error) {
        console.error("Error fetching profile:", error);
    }
});
