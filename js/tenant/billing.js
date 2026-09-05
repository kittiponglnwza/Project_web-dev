let currentBillId = null;
let globalBills = [];
let globalProfile = null;
let globalUserName = "-";

function downloadPDF() {
    const bill = globalBills.find(b => b.id == currentBillId);
    if (!bill) {
        alert("ไม่พบบิลที่ต้องการ");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const stripThai = (str) => {
        if(!str) return '-';
        return str.replace(/[ก-๙เแโใไ]/g, '').trim() || '(Omitted)';
    };

    const d = new Date(bill.created_at);
    const invNo = "INV-" + d.getFullYear() + (d.getMonth()+1).toString().padStart(2,'0') + "-" + bill.id;
    const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    
    const room = (globalProfile && globalProfile.room_no) ? globalProfile.room_no : '-';
    const address = stripThai((globalProfile && globalProfile.address) ? globalProfile.address : '-');
    const engName = stripThai(globalUserName);

    const thaiMonths = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
    const engMonths = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    
    let billMonthEng = bill.month;
    thaiMonths.forEach((th, i) => { billMonthEng = billMonthEng.replace(th, engMonths[i]); });
    const matchYear = billMonthEng.match(/\d{4}/);
    if(matchYear && parseInt(matchYear[0]) > 2500) {
        billMonthEng = billMonthEng.replace(matchYear[0], (parseInt(matchYear[0]) - 543).toString());
    }

    const pageW = 210;
    const marginL = 20;
    const marginR = 20;
    const contentW = pageW - marginL - marginR;
    let y = 20; 

    doc.setFontSize(18);
    doc.setTextColor(17, 17, 17);
    doc.text('K. Dormitory', marginL, y);

    doc.setFontSize(16);
    doc.setTextColor(30, 64, 175); 
    doc.text('INVOICE', pageW - marginR, y, { align: 'right' });

    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('123/45 Sukhumvit Rd., Saensuk, Mueang, Chonburi 20130', marginL, y);
    
    doc.setTextColor(50,50,50);
    doc.text('No: ' + invNo, pageW - marginR, y, { align: 'right' });
    y += 5;
    doc.text('Tel: 080-123-4567', marginL, y);
    doc.text('Date: ' + dateStr, pageW - marginR, y, { align: 'right' });
    y += 5;
    doc.text('Tax ID: 0-1234-56789-01-2', marginL, y);

    y += 5;
    doc.setDrawColor(200,200,200);
    doc.setLineWidth(0.5);
    doc.line(marginL, y, pageW - marginR, y);

    y += 10;
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text('Billed To', marginL, y);

    doc.setFontSize(10);
    doc.setTextColor(30, 64, 175);
    doc.text('Billing Period', pageW - marginR - 50, y);

    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('Name: ' + engName, marginL, y);

    doc.setFillColor(240, 244, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(pageW - marginR - 55, y - 6, 55, 20, 3, 3, 'FD');
    doc.setFontSize(12);
    doc.setTextColor(30, 64, 175);
    doc.text(billMonthEng, pageW - marginR - 52, y + 6);

    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    y += 6;
    doc.text('Room: ' + room, marginL, y);
    y += 6;
    doc.text('Address: ' + address, marginL, y);

    y += 15;

    doc.autoTable({
        startY: y,
        head: [['No.', 'Description', 'Unit', 'Amount (THB)']],
        body: [
            ['1', 'Room Rent', '1 Month', (bill.rent_fee || 0).toLocaleString()],
            ['2', 'Electricity', (bill.elec_unit || 0) + ' Units', (bill.elec_fee || 0).toLocaleString()],
            ['3', 'Water', (bill.water_unit || 0) + ' Units', (bill.water_fee || 0).toLocaleString()],
            ['4', 'Others / Fines', '-', (bill.other_fee || 0).toLocaleString()]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], halign: 'center' },
        columnStyles: {
            0: { halign: 'center', cellWidth: 20 },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 40 },
            3: { halign: 'right', cellWidth: 40 }
        },
        styles: { fontSize: 10, textColor: [50, 50, 50] }
    });

    y = doc.lastAutoTable.finalY + 10;

    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(229, 231, 235);
    doc.rect(marginL, y, contentW, 15, 'FD');
    
    doc.setFontSize(12);
    doc.setTextColor(17, 17, 17);
    doc.text('Grand Total', marginL + 5, y + 10);
    
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text(bill.amount.toLocaleString() + ' THB', pageW - marginR - 5, y + 10, { align: 'right' });

    y += 30;

    doc.setFontSize(14);
    let statusTxt = 'UNPAID';
    let statusColor = [220, 38, 38];
    if(bill.status === 'paid') {
        statusTxt = 'PAID';
        statusColor = [5, 150, 105];
    } else if(bill.status === 'checking') {
        statusTxt = 'PENDING (Checking Slip)';
        statusColor = [79, 70, 229];
    }
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text('STATUS: ' + statusTxt, pageW / 2, y, { align: 'center' });

    y += 30;
    doc.setDrawColor(150, 150, 150);
    doc.line(marginL, y, marginL + 50, y);
    doc.line(pageW - marginR - 50, y, pageW - marginR, y);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Tenant Signature', marginL + 25, y + 5, { align: 'center' });
    doc.text('Authorized Signature', pageW - marginR - 25, y + 5, { align: 'center' });
    
    doc.text('( ' + engName + ' )', marginL + 25, y + 10, { align: 'center' });
    doc.text('( Admin )', pageW - marginR - 25, y + 10, { align: 'center' });

    doc.text('Date: ...../...../.....', marginL + 25, y + 15, { align: 'center' });
    doc.text('Date: ...../...../.....', pageW - marginR - 25, y + 15, { align: 'center' });

    y += 20;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Please pay within the 5th of every month to avoid late fees.', pageW / 2, y, { align: 'center' });
    doc.text('This document is automatically generated by K. Dormitory Management System.', pageW / 2, y + 4, { align: 'center' });

    doc.save('Invoice_' + billMonthEng.replace(' ','_') + '.pdf');
}

document.addEventListener("DOMContentLoaded", async () => {
    initSidebar();
    
    const auth = await requireTenant(); 
    if (!auth) return; 
    const user = auth.user;

    globalUserName = user.user_metadata?.full_name || user.email;
    
    fetchBills(user.email);
});

async function fetchBills(email) {
    try {
        const { data: profile, error: profileError } = await supabaseClient
            .from('tenant_profiles')
            .select('address, room_no')
            .eq('email', email)
            .single();
            
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        globalProfile = profile;

        const { data: bills, error } = await supabaseClient
            .from('bills')
            .select('*')
            .eq('email', email)
            .order('created_at', { ascending: false });
            
        const list = document.getElementById("billing-list");
        list.innerHTML = "";
        
        if (error || !bills || bills.length === 0) {
            list.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#6b7280;">ไม่มียอดค้างชำระ</td></tr>`;
            return;
        }
        
        globalBills = bills;

        bills.forEach(bill => {
            let statusHtml = "";
            let actionHtml = "";
            
            if (bill.status === "pending" || bill.status === "unpaid") {
                statusHtml = `<span class="status-badge status-pending">ค้างชำระ</span>`;
                actionHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="pay-btn" style="background:#f3f4f6; color:#111; border:1px solid #e5e7eb;" onclick="openDetailModal('${bill.id}')">รายละเอียด</button>
                        <button class="pay-btn" onclick="openPaymentModal('${bill.id}', '${escapeHTML(bill.month)}', ${bill.amount})">ชำระเงิน</button>
                    </div>
                `;
            } else if (bill.status === "checking") {
                statusHtml = `<span class="status-badge status-pending" style="background:#e0e7ff; color:#4f46e5;">รอตรวจสอบสลิป</span>`;
                actionHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="pay-btn" style="background:#f3f4f6; color:#111; border:1px solid #e5e7eb;" onclick="openDetailModal('${bill.id}')">รายละเอียด</button>
                    </div>
                `;
            } else {
                statusHtml = `<span class="status-badge status-paid">ชำระแล้ว</span>`;
                actionHtml = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="pay-btn" style="background:#f3f4f6; color:#111; border:1px solid #e5e7eb;" onclick="openDetailModal('${bill.id}')">ดูใบเสร็จ</button>
                    </div>
                `;
            }
            
            list.innerHTML += `
                <tr>
                    <td>${escapeHTML(bill.month)}</td>
                    <td>ค่าเช่าห้อง + สาธารณูปโภค</td>
                    <td>${bill.amount.toLocaleString()}</td>
                    <td>${statusHtml}</td>
                    <td>${actionHtml}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error fetching bills:", error);
    }
}

function openDetailModal(id) {
    currentBillId = id;
    const bill = globalBills.find(b => b.id == id);
    if(!bill) return;

    document.getElementById('detail-month').innerText = bill.month;
    document.getElementById('detail-room').innerText = bill.room_no || '-';
    document.getElementById('detail-rent').innerText = (bill.rent_fee || 0).toLocaleString();
    document.getElementById('detail-elec-unit').innerText = (bill.elec_unit || 0).toLocaleString();
    document.getElementById('detail-elec-fee').innerText = (bill.elec_fee || 0).toLocaleString();
    document.getElementById('detail-water-unit').innerText = (bill.water_unit || 0).toLocaleString();
    document.getElementById('detail-water-fee').innerText = (bill.water_fee || 0).toLocaleString();
    
    let utility = (bill.elec_fee || 0) + (bill.water_fee || 0);
    document.getElementById('detail-utility').innerText = utility.toLocaleString();
    document.getElementById('detail-other').innerText = (bill.other_fee || 0).toLocaleString();
    document.getElementById('detail-total').innerText = bill.amount.toLocaleString();

    let d = new Date(bill.created_at);
    let dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    document.getElementById('detail-date').innerText = dateStr;

    document.getElementById('billDetailModal').style.display = 'flex';
}

function closeDetailModal() {
    document.getElementById('billDetailModal').style.display = 'none';
}

function openPaymentModal(id, month, amount) {
    currentBillId = id;
    document.getElementById('modal-bill-details').innerText = `รอบบิล: ${month} | ยอดชำระ: ${amount.toLocaleString()} บาท`;
    
    const promptPayID = "0638498495"; 
    document.getElementById('qr-image').src = `https://promptpay.io/${promptPayID}/${amount}.png`;

    document.getElementById('paymentModal').style.display = 'flex';
    document.getElementById('slipUpload').value = ""; 
}

function closeModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

async function confirmPayment() {
    const fileInput = document.getElementById('slipUpload');
    if(!fileInput.files.length) {
        alert("กรุณาแนบสลิปโอนเงินก่อนยืนยันครับ");
        return;
    }

    const btn = document.getElementById('confirmPayBtn');
    btn.innerHTML = "กำลังบันทึกข้อมูล...";
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const img = new Image();
        img.onload = async function() {
            try {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const base64Slip = canvas.toDataURL('image/jpeg', 0.6); 

                const { error } = await supabaseClient
                    .from('bills')
                    .update({ status: 'checking', slip_image: base64Slip })
                    .eq('id', currentBillId);
                    
                if(error) {
                    alert("เกิดข้อผิดพลาด: " + error.message);
                } else {
                    alert("แจ้งโอนเงินสำเร็จ! แอดมินจะทำการตรวจสอบสลิปของคุณเร็วๆ นี้");
                    closeModal();
                    
                    const { data: { session } } = await supabaseClient.auth.getSession();
                    if(session) fetchBills(session.user.email);
                }
            } catch (err) {
                console.error("Error processing payment:", err);
            }

            btn.innerHTML = "ยืนยันการโอนเงิน";
            btn.disabled = false;
        }
        img.src = event.target.result;
    }
    reader.readAsDataURL(file);
}
