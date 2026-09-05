$ErrorActionPreference = 'Stop'

# Task 1
$styleCss = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\style.css"
$appendContent = @"

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
"@
Add-Content -Path $styleCss -Value $appendContent -Encoding UTF8
Write-Host "Task 1 done"

# Task 2
$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\admin\dashboard.css"
(Get-Content $f -Raw) -replace '\.header-actions \{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; \}', '.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; flex-wrap: wrap; gap: 10px; }' | Set-Content $f -Encoding UTF8

$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\admin\billing.css"
(Get-Content $f -Raw) -replace '\.header-actions \{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; \}', '.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }' -replace '\.filter-bar \{ padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; \}', '.filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap; }' | Set-Content $f -Encoding UTF8

$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\admin\maintenance.css"
(Get-Content $f -Raw) -replace '\.filter-bar \{ padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; \}', '.filter-bar { padding: 15px 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; gap: 10px; flex-wrap: wrap; }' | Set-Content $f -Encoding UTF8

$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\admin\users.css"
(Get-Content $f -Raw) -replace '\.modal \{ background: #fff; width: 550px; border-radius: 16px; box-shadow: 0 10px 25px rgba\(0,0,0,0\.1\); padding: 30px; max-height: 90vh; overflow-y: auto; \}', '.modal { background: #fff; width: 90%; max-width: 550px; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); padding: 30px; max-height: 90vh; overflow-y: auto; }' | Set-Content $f -Encoding UTF8
Write-Host "Task 2 done"

# Task 3
$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\tenant\billing.css"
(Get-Content $f -Raw) -replace '\.modal-content \{ background-color: #fff; padding: 40px; border-radius: 15px; width: 400px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba\(0,0,0,0\.2\); \}', '.modal-content { background-color: #fff; padding: 30px; border-radius: 15px; width: 90%; max-width: 400px; text-align: center; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }' -replace '\.invoice-modal \{ background-color: #fff; padding: 0; border-radius: 16px; width: 500px; text-align: left; position: relative; box-shadow: 0 20px 40px rgba\(0,0,0,0\.15\); overflow: hidden; border: 1px solid #f3f4f6; \}', '.invoice-modal { background-color: #fff; padding: 0; border-radius: 16px; width: 90%; max-width: 500px; text-align: left; position: relative; box-shadow: 0 20px 40px rgba(0,0,0,0.15); overflow: hidden; border: 1px solid #f3f4f6; }' -replace '\.recent-section \{ background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba\(0,0,0,0\.02\); max-width: 1100px; margin: 0 auto; border: 1px solid #f3f4f6; \}', '.recent-section { background: #fff; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 1100px; margin: 0 auto; border: 1px solid #f3f4f6; }' -replace '\.page-title \{ font-size: 1\.8rem; margin: 0 auto 30px auto; color: #111; max-width: 1100px; \}', '.page-title { font-size: 1.4rem; margin: 0 auto 20px auto; color: #111; max-width: 1100px; }' | Set-Content $f -Encoding UTF8

$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\tenant\profile.css"
(Get-Content $f -Raw) -replace '\.recent-section \{ background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 4px 15px rgba\(0,0,0,0\.02\); max-width: 850px; margin: 0 auto; border: 1px solid #f3f4f6; \}', '.recent-section { background: #fff; padding: 20px; border-radius: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.02); max-width: 850px; margin: 0 auto; border: 1px solid #f3f4f6; }' -replace '\.page-title \{ font-size: 1\.8rem; margin: 0 auto 30px auto; color: #111; max-width: 850px; \}', '.page-title { font-size: 1.4rem; margin: 0 auto 20px auto; color: #111; max-width: 850px; }' | Set-Content $f -Encoding UTF8
Add-Content -Path $f -Value "`n@media (min-width: 768px) {`n    .recent-section { padding: 40px; }`n    .page-title { font-size: 1.8rem; }`n}" -Encoding UTF8

$f = "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\css\tenant\dashboard.css"
Add-Content -Path $f -Value "`n@media (max-width: 767px) {`n    .card-value { font-size: 1.4rem; }`n    .dashboard-cards { gap: 15px; }`n}" -Encoding UTF8
Write-Host "Task 3 done"

# Task 4
$htmlFiles = @(
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\tenant\dashboard.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\tenant\billing.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\tenant\maintenance.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\tenant\profile.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\tenant\chat.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\dashboard.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\billing.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\maintenance.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\users.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\chat.html",
    "c:\Users\HP\OneDrive\เดสก์ท็อป\project_webdev\admin\create_bill.html"
)
foreach ($file in $htmlFiles) {
    $content = Get-Content -Path $file -Raw
    $content = $content -replace '\?v=1\.1\.[01]', '?v=1.2.0'
    $content = $content -replace 'style\.css"', 'style.css?v=1.2.0"'
    $content = $content -replace 'dashboard\.css"', 'dashboard.css?v=1.2.0"'
    $content = $content -replace 'billing\.css"', 'billing.css?v=1.2.0"'
    $content = $content -replace 'maintenance\.css"', 'maintenance.css?v=1.2.0"'
    $content = $content -replace 'users\.css"', 'users.css?v=1.2.0"'
    $content = $content -replace 'profile\.css"', 'profile.css?v=1.2.0"'
    $content = $content -replace 'create_bill\.css"', 'create_bill.css?v=1.2.0"'
    Set-Content -Path $file -Value $content -Encoding UTF8
}
Write-Host "Task 4 done"
