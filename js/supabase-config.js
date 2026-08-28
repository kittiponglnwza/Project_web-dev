// ไฟล์ตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase
const { createClient } = window.supabase;

const supabaseUrl = 'https://joopkqgnknfsqwrndqnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvb3BrcWdua25mc3F3cm5kcW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MTkxMDUsImV4cCI6MjEwMzQ5NTEwNX0.TZeh-SlSMmPQOp-D2pGUN7Q2mEFWGijPWu0L_y4BRPg';

// สร้าง object สำหรับเรียกใช้งานฐานข้อมูล
const supabase = createClient(supabaseUrl, supabaseKey);
