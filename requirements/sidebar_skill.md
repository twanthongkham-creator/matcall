# Sidebar & Layout Design Standard
> มาตรฐานการออกแบบ Layout สำหรับระบบ MATCALL  
> ใช้เป็น Blueprint สำหรับ Project อื่นที่มีโครงสร้างเดียวกัน

---

## 1. โครงสร้าง Layout Shell

ระบบใช้โครงสร้าง **Sidebar + Main Content** แบบ Fixed Sidebar บน Desktop และแปลงเป็น **Bottom Floating Pill Nav** บน Mobile

```
┌─────────────────────────────────────────────────┐
│  #app-wrapper  (display: flex)                  │
│ ┌───────────┐ ┌───────────────────────────────┐ │
│ │ #sidebar  │ │       #main-content           │ │
│ │ (fixed)   │ │  ┌─────────────────────────┐  │ │
│ │  240px    │ │  │  #topbar  (sticky top)  │  │ │
│ │           │ │  └─────────────────────────┘  │ │
│ │           │ │  ┌─────────────────────────┐  │ │
│ │           │ │  │  #page-body             │  │ │
│ │           │ │  └─────────────────────────┘  │ │
│ └───────────┘ └───────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### CSS Variables (Root Tokens)

```css
:root {
  /* Brand Colors */
  --primary:        #1d3a70;   /* Navy - ใช้กับ Sidebar, หัวข้อ */
  --primary-dark:   #152d57;
  --primary-light:  #2a528f;
  --teal:           #0c8a7e;   /* Teal - ใช้กับ Active, CTA Button */
  --teal-dark:      #096b61;
  --teal-light:     #12a99a;
  --accent-gold:    #d4af37;   /* สำหรับ Highlight พิเศษ */

  /* Backgrounds */
  --bg-body:        #f0f4f8;   /* พื้นหลังหน้า */
  --bg-card:        rgba(255,255,255,0.75); /* Glass card */
  --bg-sidebar:     #1d3a70;
  --bg-topbar:      rgba(255,255,255,0.92); /* Frosted glass topbar */

  /* Text */
  --text-primary:   #0f172a;
  --text-secondary: #475569;
  --text-muted:     #94a3b8;
  --text-white:     #ffffff;

  /* Borders & Shadows */
  --border-color:   rgba(226,232,240,0.8);
  --border-focus:   #0c8a7e;
  --shadow-sm:      0 1px 3px rgba(0,0,0,0.08);
  --shadow-md:      0 4px 16px rgba(29,58,112,0.10);
  --shadow-lg:      0 8px 32px rgba(29,58,112,0.14);

  /* Layout Dimensions */
  --sidebar-width:  240px;
  --topbar-height:  56px;

  /* Border Radius */
  --radius-sm:      8px;
  --radius-md:      12px;
  --radius-lg:      18px;

  /* Animation */
  --transition:     all 0.22s cubic-bezier(0.4,0,0.2,1);
}
```

---

## 2. HTML โครงสร้างหลัก

```html
<body>
<div id="app-wrapper">

  <!-- ── Sidebar ── -->
  <nav id="sidebar">
    <!-- 2.1 Brand Logo -->
    <div class="sidebar-brand">
      <div class="brand-logo">
        <div class="brand-icon"><!-- SVG หรือ img logo --></div>
        <div class="brand-text">
          <span class="brand-name">APP NAME</span>
          <span class="brand-sub">SYSTEM SUBTITLE</span>
        </div>
      </div>
    </div>

    <!-- 2.2 Section Label (optional) -->
    <div class="sidebar-section-label">MAIN MENU</div>

    <!-- 2.3 Navigation -->
    <ul class="sidebar-nav">
      <!-- Magic Pill Indicator (Mobile only) -->
      <div class="nav-indicator-bg"></div>

      <!-- Nav Items -->
      <li>
        <a class="nav-item" data-page="index.html" href="index.html">
          <span class="nav-icon"><!-- SVG Icon --></span>
          <span class="nav-label">หน้าหลัก</span>
        </a>
      </li>
      <li>
        <a class="nav-item" data-page="page2.html" href="page2.html">
          <span class="nav-icon"><!-- SVG Icon --></span>
          <span class="nav-label">หน้าที่ 2</span>
        </a>
      </li>

      <!-- Mobile profile item (hidden on desktop) -->
      <li class="mobile-profile-item">
        <a class="nav-item" href="#" onclick="Auth.logout()">
          <span class="nav-icon"><!-- User SVG --></span>
          <span class="nav-label">โปรไฟล์</span>
        </a>
      </li>
    </ul>

    <!-- 2.4 Sidebar Footer (User Badge) -->
    <div class="sidebar-footer">
      <div class="user-badge">
        <div class="user-avatar">AB</div>
        <div class="user-info">
          <div class="user-name">ชื่อผู้ใช้งาน</div>
          <div class="user-role">บทบาท</div>
        </div>
      </div>
    </div>
  </nav>

  <!-- Overlay (mobile) -->
  <div id="sidebar-overlay"></div>

  <!-- ── Main Content ── -->
  <div id="main-content">

    <!-- 2.5 Topbar / Header -->
    <header id="topbar">
      <button id="btn-sidebar-toggle"><!-- Hamburger SVG --></button>
      <div class="topbar-title">
        <div class="topbar-page-name">ชื่อหน้า</div>
        <div class="topbar-breadcrumb">APPNAME / Page</div>
      </div>
      <div class="topbar-actions">
        <!-- Action Buttons (เช่น ปุ่ม export, สร้าง, filter) -->
        <button class="btn btn-primary" id="btn-action">สร้างใหม่</button>
      </div>
    </header>

    <!-- 2.6 Page Body -->
    <main id="page-body">

      <!-- Page Header (Title + Actions) -->
      <div class="page-header">
        <div class="page-header-left">
          <h1>ชื่อหน้า</h1>
          <p>คำอธิบาย Subtitle</p>
        </div>
        <div class="page-header-right">
          <!-- Buttons ด้านขวา -->
        </div>
      </div>

      <!-- เนื้อหา -->

    </main>
  </div><!-- end #main-content -->
</div><!-- end #app-wrapper -->

<!-- Toast Container -->
<div id="toast-container"></div>

<!-- Scripts -->
<script src="js/app.js"></script>
</body>
```

---

## 3. Sidebar Specification

### 3.1 Desktop Sidebar

| Property | Value |
|---|---|
| Width | `240px` (var `--sidebar-width`) |
| Position | `fixed` left |
| Background | `linear-gradient(180deg, #1d3a70, #152d57)` |
| Z-index | `1000` |
| Shadow | `4px 0 24px rgba(29,58,112,0.18)` |

### 3.2 Sidebar Sections

```
┌────────────────────────┐
│  .sidebar-brand        │  ← Logo + App Name (padding: 20px)
│  border-bottom: 0.1    │     border-bottom: 1px solid rgba(255,255,255,0.1)
├────────────────────────┤
│  .sidebar-section-label│  ← Section Label (10px, uppercase, opacity 0.4)
├────────────────────────┤
│  .sidebar-nav          │  ← ul list, flex: 1, padding: 8px 10px
│    .nav-item (×N)      │
├────────────────────────┤
│  .sidebar-footer       │  ← User Badge (padding: 12px 10px)
│  border-top: 0.1       │     border-top: 1px solid rgba(255,255,255,0.1)
└────────────────────────┘
```

### 3.3 Collapsed State (Desktop)

```css
body.collapsed #sidebar {
  width: 60px; /* icon-only mode */
}
body.collapsed #main-content {
  margin-left: 60px;
  width: calc(100% - 60px);
}
body.collapsed .nav-label,
body.collapsed .brand-text,
body.collapsed .sidebar-section-label,
body.collapsed .sidebar-footer {
  display: none;
}
```

---

## 4. Nav Item (Button Nav)

### 4.1 Desktop Nav Item

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;                   /* --radius-sm */
  color: rgba(255,255,255,0.7);
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.22s cubic-bezier(0.4,0,0.2,1),
              transform 0.22s cubic-bezier(0.4,0,0.2,1);
  margin-bottom: 2px;
}

/* Hover */
.nav-item:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  transform: translateX(2px);         /* slight right nudge */
}

/* Active / Current Page */
.nav-item.active {
  background: linear-gradient(90deg, #0c8a7e, #12a99a);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(12,138,126,0.35);
}
```

### 4.2 Nav Item Structure

```html
<a class="nav-item" data-page="page.html" href="page.html">
  <span class="nav-icon">
    <svg>...</svg>   <!-- icon เป็น SVG เสมอ ห้ามใช้ emoji -->
  </span>
  <span class="nav-label">ชื่อเมนู</span>
</a>
```

> **กฎสำคัญ:** Icon ใน Nav ต้องเป็น **SVG เท่านั้น** — ห้ามใช้ emoji หรือ icon class font

### 4.3 การ Activate Active State (JavaScript)

```js
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.page === path) el.classList.add('active');
  });
}
// เรียกใน DOMContentLoaded
```

---

## 5. Topbar / Header

### 5.1 Layout Structure

```
┌──────────────────────────────────────────────────────┐
│ [☰]  [Page Name / Breadcrumb]  →  [Actions] [Logout] │
│  36px      flex: 1 grow                    auto       │
└──────────────────────────────────────────────────────┘
```

### 5.2 CSS

```css
#topbar {
  height: 56px;                            /* --topbar-height */
  background: rgba(255,255,255,0.92);      /* --bg-topbar */
  backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(226,232,240,0.8);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 900;
}

/* Hamburger Toggle */
#btn-sidebar-toggle {
  width: 36px; height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 18px;
  color: var(--primary);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.22s;
  cursor: pointer;
}
#btn-sidebar-toggle:hover { background: rgba(29,58,112,0.08); }

/* Title Block */
.topbar-title { flex: 1; }
.topbar-page-name {
  font-size: 16px; font-weight: 700;
  color: var(--primary);
}
.topbar-breadcrumb {
  font-size: 11px; color: var(--text-muted);
  margin-top: 1px;
}

/* Action Buttons Zone */
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

### 5.3 Topbar HTML Pattern

```html
<header id="topbar">
  <!-- ① Hamburger (Desktop: collapse sidebar | Mobile: hidden) -->
  <button id="btn-sidebar-toggle">
    <svg>...</svg>
  </button>

  <!-- ② Page Identity -->
  <div class="topbar-title">
    <div class="topbar-page-name">ชื่อหน้า</div>
    <div class="topbar-breadcrumb">SYSTEM / ชื่อหน้า</div>
  </div>

  <!-- ③ Action Buttons (optional) -->
  <div class="topbar-actions">
    <button class="btn btn-teal" id="btn-export">
      <svg>...</svg> <span>Export</span>
    </button>
  </div>

  <!-- ④ Switch User (Dev/Testing Only) - injected by app.js -->
  <!-- ⑤ Logout Button - injected by app.js -->
</header>
```

---

## 6. Mobile Layout — Bottom Floating Pill Nav

### 6.1 พฤติกรรมบน Mobile (≤ 768px)

| Element | Desktop | Mobile |
|---|---|---|
| `#sidebar` | Fixed left, 240px wide | **Floating pill** ล่างหน้าจอ |
| `.sidebar-brand` | แสดง | **ซ่อน** |
| `.sidebar-footer` | แสดง User Badge | **ซ่อน** |
| `.nav-label` | แสดง | **ซ่อน** (icon-only) |
| `#btn-sidebar-toggle` | แสดง | **ซ่อน** |
| `#main-content` | margin-left: 240px | margin-left: 0, padding-bottom: 96px |

### 6.2 Mobile Pill CSS

```css
@media (max-width: 768px) {
  #sidebar {
    position: fixed !important;
    bottom: 14px !important;
    top: auto !important;
    left: 14px !important;
    right: 14px !important;
    width: auto !important;
    height: 64px !important;
    flex-direction: row !important;
    border-radius: 22px !important;
    box-shadow: 0 10px 28px rgba(0,0,0,0.35) !important;
    overflow: visible !important;
  }

  .sidebar-nav {
    display: flex !important;
    flex-direction: row !important;
    justify-content: space-around !important;
    align-items: center !important;
    width: 100% !important;
    height: 100% !important;
    padding: 0 4px !important;
  }

  .nav-item {
    flex-direction: column !important;
    gap: 2px !important;
    font-size: 10px !important;
    border-radius: 16px !important;
  }

  .nav-item .nav-label { display: none !important; }
  .nav-item .nav-icon  { font-size: 21px !important; }

  /* Prevent iOS auto-zoom */
  input, select, textarea { font-size: 16px !important; }

  /* Space for floating pill */
  #main-content { padding-bottom: 96px !important; }
}
```

### 6.3 Magic Spring Pill Indicator (Mobile Active State)

ใส่ `<div class="nav-indicator-bg"></div>` เป็น **ลูกแรก** ของ `.sidebar-nav` (ก่อน `<li>` ทั้งหมด)

```css
.nav-indicator-bg {
  display: none; /* hidden on desktop */
}

@media (max-width: 768px) {
  .nav-indicator-bg {
    display: block;
    position: absolute;
    top: 6px;
    left: 0;
    height: calc(100% - 12px);
    width: 44px;
    border-radius: 16px;
    background: linear-gradient(135deg, #0c8a7e, #12a99a);
    box-shadow: 0 4px 12px rgba(12,138,126,0.45);
    transition:
      transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1),
      width     400ms cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity   200ms ease;
    opacity: 0;
    z-index: 1;
    pointer-events: none;
  }

  .nav-indicator-bg.is-visible { opacity: 1; }
}
```

**JavaScript — คำนวณตำแหน่ง Pill:**

```js
function positionNavIndicator() {
  const indicator = document.querySelector('.nav-indicator-bg');
  if (!indicator || window.innerWidth > 768) {
    indicator?.classList.remove('is-visible');
    return;
  }
  const activeLi = document.querySelector('.sidebar-nav li > .nav-item.active')?.closest('li');
  if (!activeLi || activeLi.style.display === 'none') {
    indicator.classList.remove('is-visible');
    return;
  }
  const inset = 4;
  indicator.style.width     = `${activeLi.offsetWidth - inset * 2}px`;
  indicator.style.transform = `translateX(${activeLi.offsetLeft + inset}px)`;
  indicator.classList.add('is-visible');
}

// เรียกหลัง setActiveNav() และ resize
window.addEventListener('resize', () => {
  clearTimeout(window._navIndicatorTimer);
  window._navIndicatorTimer = setTimeout(positionNavIndicator, 120);
});
```

---

## 7. Button Variants

```css
/* Primary (Navy) */
.btn-primary {
  background: linear-gradient(135deg, #1d3a70, #2a528f);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(29,58,112,0.25);
}

/* Teal (CTA) */
.btn-teal {
  background: linear-gradient(135deg, #0c8a7e, #12a99a);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(12,138,126,0.25);
}

/* Ghost (Outlined) */
.btn-ghost {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

/* Base Button */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.22s cubic-bezier(0.4,0,0.2,1);
}

.btn:hover    { opacity: 0.88; transform: translateY(-1px); }
.btn:active   { transform: translateY(0); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
```

---

## 8. Permission-based Nav Visibility

เมนูแต่ละรายการถูกควบคุมการแสดงผลตาม **department** ของ User ที่ล็อกอิน:

```js
// ใน Auth.checkAuth() — กำหนดเมนูที่แต่ละ department มองเห็น
const menuRules = {
  production: ['index.html', 'request.html', 'history.html'],
  warehouse:  ['index.html', 'receive.html', 'history.html'],
  admin:      ['index.html', 'request.html', 'receive.html', 'history.html', 'po.html', 'settings.html'],
};

const dept = user.department || (user.role === 'Admin' ? 'admin' : 'production');
const allowed = menuRules[dept] || menuRules['production'];

document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
  const page = el.dataset.page;
  const li   = el.closest('li');
  if (page && !allowed.includes(page)) {
    li?.style.setProperty('display', 'none');
  }
});
```

**วิธีกำหนด `data-page` ใน HTML:**

```html
<a class="nav-item" data-page="settings.html" href="settings.html">
  ...
</a>
```

---

## 9. File Structure (CSS)

```
css/
├── main.css        ← Layout shell, sidebar, topbar, cards, buttons, forms
├── components.css  ← Toast, Modal, Table, Tabs, Badge
└── responsive.css  ← Mobile breakpoints (768px, 480px) + print
```

### Import Order ใน HTML

```html
<link rel="stylesheet" href="css/main.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/responsive.css">
```

### Script Order ใน HTML

```html
<!-- ก่อนปิด </body> -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase.js"></script>   <!-- API, Auth, DB -->
<script src="js/app.js"></script>        <!-- Sidebar, Toast, Modal, Auth.checkAuth -->
<script src="js/page-specific.js"></script>  <!-- Logic เฉพาะหน้า -->
```

---

## 10. Checklist สำหรับ Project ใหม่

- [ ] คัดลอก `css/main.css`, `css/components.css`, `css/responsive.css`
- [ ] คัดลอก `js/app.js` (ลบ logic เฉพาะ MATCALL ออก เช่น MatMap)
- [ ] อัปเดต CSS Variables (`--primary`, `--teal`, ฯลฯ) ตาม Brand ใหม่
- [ ] กำหนด `--sidebar-width` และ `--topbar-height` ตามต้องการ
- [ ] วาง HTML Shell ตาม Section 2 (app-wrapper → sidebar → main-content)
- [ ] เพิ่ม `data-page="..."` ให้ทุก `.nav-item`
- [ ] เรียก `Sidebar.init()`, `setActiveNav()`, `positionNavIndicator()` ใน `DOMContentLoaded`
- [ ] กำหนด `menuRules` ใน `Auth.checkAuth()` ตามสิทธิ์ของระบบใหม่
- [ ] ใส่ `<div id="toast-container"></div>` ก่อนปิด `</body>`
- [ ] Font: `Prompt` (Thai) หรือ `Inter` (English) จาก Google Fonts
- [ ] ทุก Icon ใช้ SVG เท่านั้น ห้ามใช้ emoji

---

## 11. Magic Spring Animation — Bottom Nav (จาก skill_nav.md)

เอกสารส่วนนี้อธิบายการนำ **"Magic Spring Animation"** (ไอคอนเด้งดึ๋งและลอยเหนือแถบเมนู) ไปประยุกต์ใช้กับระบบอื่นที่มีโครงสร้าง Bottom Nav แบบ Classic (ไม่ใช่ Pill Sidebar ของ MATCALL)

### 11.1 โครงสร้าง HTML (Classic Bottom Nav)

```html
<div class="nav-container">
    <!-- 1. วงกลมพื้นหลังที่จะวิ่งตามไอคอน (ต้องอยู่ก่อน nav-items) -->
    <div class="nav-indicator-bg"></div>

    <!-- 2. กลุ่มปุ่มนำทาง -->
    <nav class="nav-items">
        <button class="nav-button" aria-current="page">
            <div class="nav-icon-frame">
                <i class="icon-home"></i> <!-- แทนที่ด้วยแท็กไอคอนของระบบเดิม -->
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-user"></i>
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-heart"></i>
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-settings"></i>
            </div>
        </button>
    </nav>
</div>
```

> **ข้อกำหนด HTML:**
> 1. Container (`.nav-items`) ต้องเป็น `position: absolute` หรือ `relative` เพื่อควบคุมระยะลอยตัว
> 2. ทุกปุ่มต้องมี `.nav-icon-frame` ครอบ Icon ไว้ภายใน
> 3. `.nav-indicator-bg` ต้องอยู่ **ก่อน** `<nav class="nav-items">` เสมอ (z-order)

### 11.2 CSS Variables สำหรับ Spring Animation

```css
:root {
  --shape-rise:     15px;     /* ระยะความสูงที่ขยับขึ้นของแผงเมนู */
  --icon-muted:     #a6a6a6;  /* สีไอคอนปกติ (ยังไม่ถูกเลือก) */
  --icon-active:    #ffffff;  /* สีไอคอนเมื่อ Active */
  --move-duration:  400ms;    /* ความเร็วในการเคลื่อนที่ */

  /* จังหวะสปริงเด้งดึ๋ง — หัวใจหลักของเอฟเฟกต์ */
  --spring: cubic-bezier(0.68, -0.6, 0.32, 1.6);

  --nav-bg:         #1e1e24;  /* สีพื้นหลังแถบเมนู */
  --accent-color:   #6c5ce7;  /* สีวงกลมไฮไลท์ (ปรับตาม Brand ได้) */
}
```

### 11.3 CSS Layout & Animation

```css
/* ── Container ── */
.nav-container {
  position: relative;
  width: 100%;
  height: 70px;
  background-color: var(--nav-bg);
  border-radius: 20px;
}

/* ── Grid ปุ่ม ── */
.nav-items {
  position: absolute;
  inset: calc(-1 * var(--shape-rise)) 0 0 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* เปลี่ยนเลขตามจำนวนปุ่มจริง */
  width: 100%;
  z-index: 10;
}

/* ── ปุ่ม ── */
.nav-button {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

/* ── Icon Frame ── */
.nav-icon-frame {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 50%;
  color: var(--icon-muted);
  transform: translateY(0) scale(1);
  transition:
    transform var(--move-duration) var(--spring),
    color 220ms ease;
}

/* ── Active State: ไอคอนลอยตัว ── */
.nav-button[aria-current="page"] .nav-icon-frame {
  color: var(--icon-active);
  transform: translateY(-31px) scale(1.06);
}

/* ── วงกลมไฮไลท์สีวิ่งตามไอคอน ── */
.nav-indicator-bg {
  position: absolute;
  top: -20px;
  left: 24px; /* จุดเริ่มต้นปุ่มแรก (ปรับตาม Grid ของระบบ) */
  width: 42px;
  height: 42px;
  background-color: var(--accent-color);
  border-radius: 50%;
  transition: transform var(--move-duration) var(--spring);
  z-index: 5;
}

/* ── เทคนิคสร้างขอบโค้งเว้าด้วย Box Shadow ── */
.nav-indicator-bg::before,
.nav-indicator-bg::after {
  content: '';
  position: absolute;
  top: 25px;
  width: 20px;
  height: 20px;
  background-color: transparent;
}

.nav-indicator-bg::before {
  left: -20px;
  border-bottom-right-radius: 20px;
  box-shadow: 6px 6px 0 0 var(--nav-bg);
}

.nav-indicator-bg::after {
  right: -20px;
  border-bottom-left-radius: 20px;
  box-shadow: -6px 6px 0 0 var(--nav-bg);
}
```

### 11.4 JavaScript — คำนวณตำแหน่งวงกลม

```js
const buttons  = document.querySelectorAll('.nav-button');
const indicator = document.querySelector('.nav-indicator-bg');

// stepSize = ความกว้าง Container ÷ จำนวนปุ่ม
// ตัวอย่าง: Container 360px ÷ 4 ปุ่ม = 90px ต่อปุ่ม
const stepSize = 90;

buttons.forEach((button, index) => {
  button.addEventListener('click', () => {
    // 1. เคลียร์ active ทั้งหมด
    buttons.forEach(btn => btn.removeAttribute('aria-current'));

    // 2. ให้ active กับปุ่มที่คลิก
    button.setAttribute('aria-current', 'page');

    // 3. เลื่อนวงกลมตามตำแหน่ง
    indicator.style.transform = `translateX(${index * stepSize}px)`;
  });
});
```

> **Tip — Responsive Width:** หาก Container มีความกว้างยืดหยุ่น (`width: 100%`) ให้ใช้ `button.offsetLeft` แทนการคูณ `stepSize` เพื่อความแม่นยำ:
> ```js
> indicator.style.transform = `translateX(${button.offsetLeft}px)`;
> ```

### 11.5 เปรียบเทียบ: Classic Bottom Nav vs MATCALL Pill Nav

| Feature | Classic Bottom Nav (Section 11) | MATCALL Pill Nav (Section 6) |
|---|---|---|
| **โครงสร้าง** | `nav-container` + `nav-items` + `nav-button` | `#sidebar` + `sidebar-nav` + `nav-item` |
| **Active State** | `aria-current="page"` | `.active` class |
| **Indicator** | วงกลม (`.nav-indicator-bg`) ลอยขึ้น | Pill สีไล่ gradient เลื่อนซ้าย-ขวา |
| **Icon Float** | `translateY(-31px) scale(1.06)` | `scale(1.08)` เท่านั้น |
| **Position Calc** | `index × stepSize` (pixel) | `offsetLeft` (dynamic) |
| **Spring Curve** | `cubic-bezier(0.68, -0.6, 0.32, 1.6)` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |
| **เหมาะกับ** | App Style, Mobile-first | Web Dashboard, Desktop+Mobile |

---

## 12. ข้อแนะนำเพิ่มเติม

1. **Responsive Width:** หาก Bottom Nav ยืดหยุ่นตามหน้าจอ ให้คำนวณตำแหน่งจาก `button.offsetLeft` แทนค่าตายตัว
2. **Icon Size:** หากไอคอนใหญ่/เล็กเกินไป ปรับที่ `width/height` ของ `.nav-icon-frame`
3. **Browser Support:** `cubic-bezier` ที่มีค่าลบ (Spring Overshoot) รองรับทุก Modern Browser (Chrome, Safari, Firefox, Edge รวม Mobile)
4. **SVG Only:** ทุก Icon ต้องเป็น SVG ห้ามใช้ emoji หรือ icon font class
5. **iOS Auto-zoom:** ต้องกำหนด `font-size: 16px !important` ให้ `input, select, textarea` ใน Mobile breakpoint
