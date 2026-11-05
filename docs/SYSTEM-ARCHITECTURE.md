# System Architecture: Dorminator

Dorminator เป็นเว็บแอปจัดการหอพักแบบ Client-Server หน้าเว็บทั้งหมดเป็นไฟล์ HTML, CSS และ JavaScript ที่ทำงานบนเบราว์เซอร์ และเรียกใช้ Supabase เป็น Backend สำหรับฐานข้อมูลและการยืนยันตัวตน

## ภาพรวมระบบ

```mermaid
flowchart LR
    subgraph Client["เบราว์เซอร์ (HTML / CSS / JavaScript)"]
        Public["หน้าสาธารณะ<br/>index, room-detail, login, register"]
        Tenant["หน้าผู้เช่า<br/>tenant/*.html"]
        Admin["หน้าผู้ดูแล<br/>admin/*.html"]
        Shared["โมดูลที่ใช้ร่วมกัน<br/>js/shared/*"]
        Storage[("Cookie และ sessionStorage")]
    end

    subgraph Backend["Supabase"]
        Auth["Auth<br/>เข้าสู่ระบบ / สมัครสมาชิก"]
        Rest["REST API<br/>(PostgREST)"]
        DB[("PostgreSQL<br/>พร้อม Row Level Security")]
    end

    JSON["data/rooms.json"]
    CDN["CDN<br/>Chart.js, jsPDF, Boxicons"]

    Public --> Shared
    Tenant --> Shared
    Admin --> Shared
    Shared <--> Storage
    Shared -->|"JWT"| Auth
    Shared -->|"Fetch / XMLHttpRequest / SDK"| Rest
    Rest --> DB
    Auth --> DB
    Public -->|"Fetch / XMLHttpRequest"| JSON
    Admin -->|"นำเข้าข้อมูลห้องพัก"| JSON
    Client -.-> CDN
```

## ส่วนประกอบของระบบ

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| หน้าเว็บ | `*.html`, `admin/`, `tenant/` | โครงสร้างหน้าแบบ Semantic HTML |
| สไตล์ | `css/style.css`, `css/admin/`, `css/tenant/` | สไตล์ส่วนกลางและรายหน้าแบบ Mobile First |
| การเชื่อมต่อ | `js/supabase-config.js` | สร้าง Supabase client |
| โมดูลร่วม | `js/shared/utils.js` | Validation, Ajax, คำนวณห้องว่าง, แบ่งหน้า, จัดรูปแบบข้อมูล |
| Session | `js/shared/session.js` | วงจร Session และ Cookie |
| สิทธิ์การเข้าถึง | `js/shared/auth-guard.js` | ตรวจสิทธิ์ผู้เช่าและผู้ดูแล, ออกจากระบบ |
| เมนู | `js/shared/components.js` | สร้าง Sidebar |
| ตรรกะรายหน้า | `js/admin/`, `js/tenant/`, `js/script.js`, `js/detail.js`, `js/auth.js` | ทำงานเฉพาะของแต่ละหน้า |
| ฐานข้อมูล | `data/setup_database.sql`, `data/migration_rubric.sql` | สร้างตาราง, Policy และ Trigger |
| ข้อมูล JSON | `data/rooms.json` | ข้อมูลตั้งต้นของห้องพัก และข้อมูลสำรองเมื่อฐานข้อมูลใช้งานไม่ได้ |

## บทบาทผู้ใช้

| บทบาท | สิ่งที่ทำได้ |
|---|---|
| บุคคลทั่วไป | ดูห้องพักและจำนวนห้องว่าง, ส่งคำขอนัดดูห้อง, สมัครสมาชิก |
| ผู้เช่า | ดูบิล, ส่งสลิป, ดาวน์โหลดใบแจ้งหนี้, แจ้งซ่อม, ดูโปรไฟล์, แชทกับผู้ดูแล |
| ผู้ดูแล | จัดการบิล, ผู้เช่า, โปรโมชั่น, แจ้งซ่อม, ประกาศ, นัดหมาย, แชท และดูรายงาน |

## ขั้นตอนการเข้าสู่ระบบและ Session

```mermaid
sequenceDiagram
    actor U as ผู้ใช้
    participant L as login.html
    participant S as session.js
    participant A as Supabase Auth
    participant D as ฐานข้อมูล

    U->>L: กรอกอีเมลและรหัสผ่าน
    L->>L: ตรวจสอบด้วย HTML และ RegEx
    L->>A: signInWithPassword()
    A-->>L: JWT
    L->>S: จดจำอีเมลใน Cookie เมื่อผู้ใช้เลือก
    L->>S: loadSessionProfile(email)
    S->>S: สร้าง Session ID และเก็บอีเมล
    S->>D: อ่าน role และ room_no
    D-->>S: ข้อมูลโปรไฟล์
    L->>U: ไปหน้าผู้เช่าหรือผู้ดูแลตาม role
    Note over S,D: หน้าภาพรวมผู้เช่าใช้อีเมลและเลขห้องใน Session คำนวณยอดเงิน
    U->>S: ออกจากระบบ
    S->>S: terminate() ล้าง Session
```

## ขั้นตอนการชำระค่าเช่า

```mermaid
flowchart LR
    A["ผู้ดูแลสร้างบิล<br/>status: pending"] --> B["ผู้เช่าโอนเงิน<br/>และส่งสลิป"]
    B --> C["status: checking"]
    C --> D{"ผู้ดูแลตรวจสลิป"}
    D -->|อนุมัติ| E["status: paid<br/>นับเป็นรายรับในรายงาน"]
    D -->|ปฏิเสธ| A
```

## ความปลอดภัย

- **Row Level Security:** ผู้เช่าเข้าถึงได้เฉพาะข้อมูลของตัวเอง ส่วนผู้ดูแลตรวจสอบผ่านฟังก์ชัน `is_admin()`
- **Trigger:** ผู้เช่าเปลี่ยนสิทธิ์ เลขห้อง ยอดเงิน หรืออนุมัติบิลของตัวเองผ่าน API ไม่ได้
- **View `occupied_rooms`:** เปิดเผยเฉพาะเลขห้องให้บุคคลทั่วไป โดยไม่เปิดเผยข้อมูลผู้เช่า
- **XSS:** ข้อมูลจากฐานข้อมูลผ่าน `escapeHTML()` ก่อนแสดงผลด้วย `innerHTML`
