import os
import re

base_path = r"c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev"

# Task 1
style_css = os.path.join(base_path, "css", "style.css")
with open(style_css, "a", encoding="utf-8") as f:
    f.write("""

/* =========================================
   GAUNTLET LOOP: Mobile Responsive Fixes
   ========================================= */

/* Header Actions - stack on mobile */
.header-actions {
    flex-wrap: wrap;
    gap: 10px;
}
@media (max-width: 767px) {
    .header-actions {
        flex-direction: column;
        align-items: flex-start !important;
    }
    .header-actions h1,
    .header-actions h2 {
        font-size: 1.3rem !important;
    }
}

/* Page Title - smaller on mobile */
@media (max-width: 767px) {
    .page-title {
        font-size: 1.3rem !important;
    }
    h1 {
        font-size: 1.3rem !important;
    }
}

/* Filter Bar - wrap on mobile */
.filter-bar {
    flex-wrap: wrap;
}

/* Dashboard Header - stack on mobile */
@media (max-width: 767px) {
    .dashboard-header {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 10px;
    }
    .month-selector {
        width: 100%;
    }
    .month-selector select {
        width: 100%;
        min-width: unset !important;
    }
}

/* Tables - better mobile touch */
@media (max-width: 767px) {
    th, td {
        padding: 10px 12px !important;
        font-size: 13px !important;
    }
}

/* Cards - reduce padding on mobile */
@media (max-width: 767px) {
    .card {
        padding: 15px !important;
    }
    .recent-section {
        padding: 15px !important;
    }
    .main-content {
        padding: 15px !important;
    }
}

/* Modal - full width on mobile */
@media (max-width: 767px) {
    .modal {
        width: 95% !important;
        max-width: none !important;
        padding: 20px !important;
    }
    .modal-content {
        width: 95% !important;
        padding: 25px !important;
    }
    .invoice-modal {
        width: 95% !important;
    }
}

/* Stat cards - ensure text doesn't overflow */
.stat-info h3 {
    word-break: break-word;
}

/* Grid-2 responsive for modal forms */
@media (min-width: 768px) {
    .grid-2 {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}

/* Sidebar overlay on mobile - close when clicking outside */
@media (max-width: 991px) {
    .sidebar {
        position: sticky !important;
        top: 0 !important;
        z-index: 9999 !important;
    }
    .sidebar-links.active {
        position: absolute;
        top: 100%;
        left: 0;
        width: 100%;
        background: inherit;
        z-index: 9999;
        box-shadow: 0 10px 20px rgba(0,0,0,0.15);
    }
}
""")
print("Task 1 done")

def replace_in_file(path, old, new):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

# Task 2
replace_in_file(os.path.join(base_path, "css", "admin", "dashboard.css"), 
    ".header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }", 
    ".header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px; }")

f_bill = os.path.join(base_path, "css", "admin", "billing.css")
replace_in_file(f_bill, 
    ".header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }", 
    ".header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }")
replace_in_file(f_bill, 
    ".filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; }", 
    ".filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap; }")

replace_in_file(os.path.join(base_path, "css", "admin", "maintenance.css"), 
    ".filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; }", 
    ".filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap; }")

replace_in_file(os.path.join(base_path, "css", "admin", "users.css"), 
    ".modal { background: #fff; width: 550px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 30px; max-height: 90vh; overflow-y: auto; }", 
    ".modal { background: #fff; width: 90%; max-width: 550px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 30px; max-height: 90vh; overflow-y: auto; }")
print("Task 2 done")

# Task 3
f_t_bill = os.path.join(base_path, "css", "tenant", "billing.css")
replace_in_file(f_t_bill, 
    ".modal-content { background-color: #fff; padding: 40px; border-radius: 15px; width: 400px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }", 
    ".modal-content { background-color: #fff; padding: 30px; border-radius: 15px; width: 90%; max-width: 400px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }")
replace_in_file(f_t_bill, 
    ".invoice-modal { background-color: #fff; padding: 0; border-radius: 16px; width: 500px; text-align: left; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #f3f4f6; }", 
    ".invoice-modal { background-color: #fff; padding: 0; border-radius: 16px; width: 90%; max-width: 500px; text-align: left; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #f3f4f6; }")
replace_in_file(f_t_bill, 
    ".recent-section { background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 1100px; margin: 0 auto; border: 1px solid #f3f4f6; }", 
    ".recent-section { background: #fff; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 1100px; margin: 0 auto; border: 1px solid #f3f4f6; }")
replace_in_file(f_t_bill, 
    ".page-title { font-size: 1.8rem; margin: 0 auto 30px auto; color: #111; max-width: 1100px; }", 
    ".page-title { font-size: 1.4rem; margin: 0 auto 20px auto; color: #111; max-width: 1100px; }")

f_t_prof = os.path.join(base_path, "css", "tenant", "profile.css")
replace_in_file(f_t_prof, 
    ".recent-section { background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 850px; margin: 0 auto; border: 1px solid #f3f4f6; }", 
    ".recent-section { background: #fff; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 850px; margin: 0 auto; border: 1px solid #f3f4f6; }")
replace_in_file(f_t_prof, 
    ".page-title { font-size: 1.8rem; margin: 0 auto 30px auto; color: #111; max-width: 850px; }", 
    ".page-title { font-size: 1.4rem; margin: 0 auto 20px auto; color: #111; max-width: 850px; }")

with open(f_t_prof, "a", encoding="utf-8") as f:
    f.write("\n@media (min-width: 768px) {\n    .recent-section { padding: 40px; }\n    .page-title { font-size: 1.8rem; }\n}")

f_t_dash = os.path.join(base_path, "css", "tenant", "dashboard.css")
with open(f_t_dash, "a", encoding="utf-8") as f:
    f.write("\n@media (max-width: 767px) {\n    .card-value { font-size: 1.4rem; }\n    .dashboard-cards { gap: 15px; }\n}")
print("Task 3 done")

# Task 4
html_files = [
    os.path.join(base_path, "tenant", "dashboard.html"),
    os.path.join(base_path, "tenant", "billing.html"),
    os.path.join(base_path, "tenant", "maintenance.html"),
    os.path.join(base_path, "tenant", "profile.html"),
    os.path.join(base_path, "tenant", "chat.html"),
    os.path.join(base_path, "admin", "dashboard.html"),
    os.path.join(base_path, "admin", "billing.html"),
    os.path.join(base_path, "admin", "maintenance.html"),
    os.path.join(base_path, "admin", "users.html"),
    os.path.join(base_path, "admin", "chat.html"),
    os.path.join(base_path, "admin", "create_bill.html")
]

for filepath in html_files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = re.sub(r'\?v=1\.1\.[01]', '?v=1.2.0', content)
    content = content.replace('style.css"', 'style.css?v=1.2.0"')
    content = content.replace('dashboard.css"', 'dashboard.css?v=1.2.0"')
    content = content.replace('billing.css"', 'billing.css?v=1.2.0"')
    content = content.replace('maintenance.css"', 'maintenance.css?v=1.2.0"')
    content = content.replace('users.css"', 'users.css?v=1.2.0"')
    content = content.replace('profile.css"', 'profile.css?v=1.2.0"')
    content = content.replace('create_bill.css"', 'create_bill.css?v=1.2.0"')
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
print("Task 4 done")

