
        let allBills = [];
        let tenantProfiles = [];

        document.addEventListener("DOMContentLoaded", async () => {
            await loadTenants();
            await loadBills();

            
        });

        async function loadTenants() {
            const { data } = await supabaseClient.from('tenant_profiles').select('*').neq('role', 'admin');
            if(data) {
                tenantProfiles = data;
                const select = document.getElementById('b_email');
                data.forEach(t => {
                    const roomStr = t.room_no ? `ห้อง ${t.room_no}` : 'ยังไม่ระบุห้อง';
                    select.innerHTML += `<option value="${t.email}">${roomStr} (${t.email})</option>`;
                });
            }
        }

        async function loadBills() {
            const { data, error } = await supabaseClient
                .from('bills')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                // อัปเดตเลขห้องแบบเรียลไทม์เผื่อตอนสร้างบิลลูกบ้านยังไม่มีห้อง
                data.forEach(bill => {
                    if (!bill.room_no || bill.room_no === 'null') {
                        const tenant = tenantProfiles.find(t => t.email === bill.email);
                        if (tenant && tenant.room_no) {
                            bill.room_no = tenant.room_no;
                        }
                    }
                });
                
                allBills = data;
                renderBills(data);
            }
        }

        function filterBills(status, btnElement) {
            // สลับสีปุ่ม
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            btnElement.classList.add('active');

            // กรองข้อมูล
            if(status === 'all') renderBills(allBills);
            else renderBills(allBills.filter(b => b.status === status));
        }

        function renderBills(bills) {
            const tbody = document.getElementById('bills-table-body');
            tbody.innerHTML = '';

            if (bills.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">ไม่มีข้อมูลบิลในระบบ</td></tr>';
                return;
            }

            bills.forEach(bill => {
                const utilTotal = (bill.elec_fee || 0) + (bill.water_fee || 0);
                
                let badge = '';
                let actionBtn = '';

                if (bill.status === 'paid') {
                    badge = '<span class="status-badge st-paid">ชำระแล้ว</span>';
                    actionBtn = `<button class="action-btn" title="ดูรายละเอียด" onclick="alert('ยอดเยี่ยม! บิลนี้เคลียร์แล้ว')"><i class='bx bx-check-double'></i></button>`;
                } else if (bill.status === 'checking') {
                    badge = '<span class="status-badge st-checking">รอตรวจสลิป</span>';
                    // ดึง bill.id ไปหา slip_image ในฟังก์ชันแทนเพื่อกัน string ยาวเกินไปใน HTML
                    actionBtn = `<button class="action-btn btn-approve" title="ตรวจสลิป & อนุมัติ" onclick="viewSlip(${bill.id})"><i class='bx bx-search-alt'></i> ดูสลิป</button>`;
                } else {
                    badge = '<span class="status-badge st-unpaid">ค้างชำระ</span>';
                    actionBtn = `<button class="action-btn" title="ลบบิลทิ้ง" onclick="deleteBill(${bill.id})" style="color:#ef4444;"><i class='bx bx-trash'></i></button>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight: 500;">${bill.room_no || 'ไม่ระบุ'}</td>
                        <td>${bill.month}</td>
                        <td>${(bill.rent_fee || 0).toLocaleString()}</td>
                        <td>${utilTotal.toLocaleString()}</td>
                        <td style="font-weight: 600; color: #0f172a;">${bill.amount.toLocaleString()}</td>
                        <td>${badge}</td>
                        <td style="text-align: center;">${actionBtn}</td>
                    </tr>
                `;
            });
        }

        let currentSlipBillId = null;

        function viewSlip(billId) {
            currentSlipBillId = billId;
            const bill = allBills.find(b => b.id === billId);
            const slipImage = bill ? bill.slip_image : null;
            
            const imgEl = document.getElementById('slip-image-preview');
            if (slipImage && slipImage !== 'undefined') {
                imgEl.src = slipImage;
            } else {
                imgEl.src = 'https://via.placeholder.com/400x600?text=No+Slip+Image';
            }
            const modal = document.getElementById('slip-modal');
            modal.style.setProperty('display', 'flex', 'important');
            modal.style.setProperty('z-index', '9999', 'important');
        }

        function closeSlipModal() {
            document.getElementById('slip-modal').style.setProperty('display', 'none', 'important');
        }

        document.getElementById('approve-slip-btn').addEventListener('click', async () => {
            if (currentSlipBillId) {
                await approveSlip(currentSlipBillId);
                closeSlipModal();
            }
        });

        document.getElementById('reject-slip-btn').addEventListener('click', async () => {
            if (currentSlipBillId) {
                await rejectSlip(currentSlipBillId);
                closeSlipModal();
            }
        });

        // --- ระบบปฏิเสธสลิป ---
        async function rejectSlip(billId) {
            if(confirm('คุณแน่ใจหรือไม่ว่าต้องการ "ปฏิเสธ" สลิปนี้? \nบิลจะถูกเปลี่ยนกลับเป็น "ค้างชำระ" เพื่อให้ลูกบ้านส่งสลิปใหม่')) {
                const { error } = await supabaseClient
                    .from('bills')
                    .update({ status: 'pending', slip_image: null })
                    .eq('id', billId);
                
                if(!error) {
                    alert('ปฏิเสธสลิปเรียบร้อยแล้ว ลูกบ้านสามารถส่งสลิปใหม่ได้');
                    loadBills();
                } else {
                    alert('เกิดข้อผิดพลาด: ' + error.message);
                }
            }
        }

        // --- ระบบตรวจสลิป (อนุมัติ) ---
        async function approveSlip(billId) {
            if(confirm('ยืนยันว่าตรวจสอบสลิปโอนเงินถูกต้อง และต้องการเปลี่ยนสถานะเป็น "ชำระแล้ว" ใช่หรือไม่?')) {
                const { error } = await supabaseClient
                    .from('bills')
                    .update({ status: 'paid' })
                    .eq('id', billId);
                
                if(!error) {
                    alert('อนุมัติบิลเรียบร้อย!');
                    loadBills(); // รีเฟรชหน้าต่าง
                }
            }
        }

        // --- ระบบลบบิล ---
        async function deleteBill(billId) {
            if(confirm('ต้องการลบบิลนี้ทิ้งใช่หรือไม่? (ลบแล้วกู้คืนไม่ได้)')) {
                const { error } = await supabaseClient.from('bills').delete().eq('id', billId);
                if(!error) loadBills();
            }
        }

        async function logout() {
            await supabaseClient.auth.signOut();
            window.location.href = "../login.html";
        }
    