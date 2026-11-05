# Rubric Checklist: 040613411 Web Development

ตารางนี้ระบุจุดที่ใช้สาธิตเกณฑ์แต่ละข้อ ทุกข้อทำครบถึงระดับ Big Bonus

| ข้อ | เกณฑ์ | Basic | Bonus | Big Bonus |
|---|---|---|---|---|
| 1 | Wireframe และ System Architecture | [WIREFRAME.md](WIREFRAME.md), [SYSTEM-ARCHITECTURE.md](SYSTEM-ARCHITECTURE.md) | - | - |
| 2 | CSS Selector | `css/style.css` ส่วน "Rubric Requirements" | Descendant, Child, Adjacent-Sibling ในส่วนเดียวกัน | ส่วน "Rubric 2: Specificity Weight" ท้าย `css/style.css` |
| 3 | Form Validation | `required`, `type`, `minlength` ที่ `login.html`, `register.html`, `room-detail.html` | `pattern` ของอีเมลและเบอร์โทรในฟอร์มเดียวกัน | ตรวจด้วย JS ที่ `js/auth.js`, `js/detail.js`, `js/admin/users.js` (Regular Expression) และ `js/admin/promotions.js` (ตรวจช่วงวันที่/ส่วนลดด้วย JS) |
| 4 | Semantic Layout | `header`, `nav`, `main`, `section`, `article`, `aside`, `footer` | มี `main` ครบทั้ง 16 หน้า | Grid และ Flexbox เช่น `.stats-grid`, `.login-wrapper` |
| 5 | Mobile First | `@media (min-width: 768px)` และ `(min-width: 992px)` | ทุกไฟล์ CSS ใช้ `min-width` ทั้งหมด | เมนูแฮมเบอร์เกอร์ `.menu-toggle`, `.sidebar-toggle`, ปุ่มย้อนกลับ `.mobile-back-btn` ซ่อน/แสดงตามขนาดจอ |
| 6 | DOM ด้วย JS | เปลี่ยน Style ด้วย `getElementById` เช่น `js/script.js` (`hero-availability`), `js/admin/promotions.js` | `window` load event เพิ่มข้อความใน `hero-content` ที่ `js/script.js` | ฟอร์มจองซ่อนตัวเองและเพิ่มรายการสรุปใน `bookingSummary` ที่ `js/detail.js` |
| 7 | JSON | ดึงและแสดงข้อมูลห้องที่ `js/script.js` (`fetchRooms`) | คำนวณราคาเฉลี่ยและห้องว่างใน `renderRoomSummary` | ปุ่ม "นำเข้าจาก rooms.json" ที่ `admin/users.html` (`importRoomsFromJson`) เก็บลงตาราง `rooms` |
| 8 | ฐานข้อมูล | CRUD บิล: `js/admin/create-bill.js`, `js/admin/billing.js` | ค้นหาและกรองหลายเงื่อนไข: `applyUserFilters`, `applyBillFilters` พร้อมเชื่อมข้อมูลบิลกับผู้เช่า | แบ่งหน้า `renderPager` ที่ `admin/users.html`, `admin/billing.html` |
| 9 | Cookie และ Session | ครบ 6 ขั้นใน `js/shared/session.js` และ Cookie จดจำอีเมลใน `js/auth.js` | `loadSessionProfile` อ่านโปรไฟล์จากฐานข้อมูล | `js/tenant/dashboard.js` ใช้ `user_email` และ `room_no` จาก Session คำนวณยอดเงิน |
| 10 | Ajax | `ajaxGetJSON` ใช้ `XMLHttpRequest` และ `responseText` ใน `js/shared/utils.js` | `fetchRoomDetail` ใน `js/detail.js` ดึงจากฐานข้อมูล | 3 จุดในหน้า `room-detail.html` และ Fetch 2 จุดใน `index.html` |
| 11 | รายงานสถิติ | ตารางรายงานใน `admin/dashboard.html` (`renderReportTable`) | กราฟ Chart.js (`renderChart`) | กรองตามปี ขนาดห้อง และสถานะบิล (`updateReport`) |

## วงจร Session ตามเกณฑ์ข้อ 9

| ขั้นตอน | ฟังก์ชันใน `js/shared/session.js` | จุดที่เรียกใช้ |
|---|---|---|
| Initialize a session object | `DormSession.init()` | `loadSessionProfile`, `js/script.js` |
| Store information/state | `DormSession.set()` | `loadSessionProfile`, `js/auth.js` |
| Get values | `DormSession.get()` | `js/tenant/dashboard.js` |
| Retrieve a session ID | `DormSession.id()` | Footer ของ `tenant/dashboard.html` |
| Remove a session variable | `DormSession.remove()` | ข้อความ `flash` ใน `js/tenant/dashboard.js` |
| Terminate a session | `DormSession.terminate()` | `logout()` ใน `js/shared/auth-guard.js` |

## ลำดับการสาธิตที่แนะนำ

1. เปิด `index.html` แล้วชี้ตารางสรุปห้องและข้อความเข้าชม จากนั้นย่อจอเพื่อแสดงเมนูแฮมเบอร์เกอร์
2. เปิด `room-detail.html` ดู Network แท็บ XHR แล้วทดลองกรอกเบอร์ผิด จากนั้นกรอกถูกเพื่อแสดงการซ่อนฟอร์ม
3. เข้าสู่ระบบแบบเลือก "จดจำ" แล้วเปิด DevTools แท็บ Application เพื่อแสดง Cookie และ Session
4. ที่หน้าผู้เช่า ชี้ยอด "ชำระแล้วสำหรับห้องนี้" และ Session ID จากนั้นออกจากระบบให้เห็นว่า Session ถูกล้าง
5. เข้าสู่ระบบเป็นผู้ดูแล เปิดรายงานแล้วเปลี่ยนตัวกรอง จากนั้นเปิดหน้าจัดการผู้เช่าเพื่อค้นหา แบ่งหน้า และนำเข้า JSON
