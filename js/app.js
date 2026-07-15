/* ============================================================
   MATCALL - App Shared Utilities
   Sidebar, navigation, toast, modal, formatters
   ============================================================ */

/* ── Sidebar Toggle ─────────────────────────────────────────── */
const Sidebar = {
  init() {
    const btn     = document.getElementById('btn-sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => {
      if (window.innerWidth > 768) {
        document.body.classList.toggle('collapsed');
        const isCollapsed = document.body.classList.contains('collapsed');
        localStorage.setItem('sidebar_collapsed', isCollapsed ? '1' : '0');
      } else {
        this.open();
      }
    });
    overlay?.addEventListener('click', () => this.close());
  },
  open() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('show');
  },
  close() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
  },
};

/* ── Active Nav ─────────────────────────────────────────────── */
function setActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.page === path) el.classList.add('active');
  });
}

/* ── Toast Notifications ────────────────────────────────────── */
const Toast = {
  show(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
      success: '<i class="bi bi-check-circle-fill"></i>',
      error:   '<i class="bi bi-x-circle-fill"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
      info:    '<i class="bi bi-info-circle-fill"></i>',
    };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] ?? icons.info}</span>
                    <span class="toast-msg">${msg}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateX(100%)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },
  success(msg)  { this.show(msg, 'success'); },
  error(msg)    { this.show(msg, 'error', 5000); },
  warning(msg)  { this.show(msg, 'warning'); },
  info(msg)     { this.show(msg, 'info'); },
};

/* ── Modal ──────────────────────────────────────────────────── */
const Modal = {
  show(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },
  hide(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },
  confirm(title, body, onConfirm, type = 'danger') {
    // Use Bootstrap modal or generic confirm
    const btnLabel  = type === 'danger' ? 'ยืนยัน / ลบ' : 'ยืนยัน';
    const btnClass  = type === 'danger' ? 'btn-danger' : 'btn-primary';
    const iconMap = {
      danger:  '<i class="bi bi-trash-fill"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill"></i>',
      info:    '<i class="bi bi-info-circle-fill"></i>',
    };
    const icon = iconMap[type] ?? '<i class="bi bi-question-circle-fill"></i>';

    // Remove previous
    document.getElementById('__confirm_modal')?.remove();

    const html = `
    <div id="__confirm_modal" class="modal-backdrop" style="display:flex">
      <div class="modal-box" style="max-width:420px">
        <div class="modal-header">
          <span class="modal-title">${icon} ${title}</span>
          <button class="modal-close" onclick="document.getElementById('__confirm_modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size:14px;color:var(--text-secondary);line-height:1.6">${body}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('__confirm_modal').remove()">ยกเลิก</button>
          <button class="btn ${btnClass}" id="__confirm_ok">${btnLabel}</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('__confirm_ok').onclick = () => {
      document.getElementById('__confirm_modal').remove();
      onConfirm();
    };
  },
};

/* ── Date / Number Formatters ───────────────────────────────── */
const Fmt = {
  /** "2026-06-11" → "11/06/2026" */
  date(str) {
    if (!str) return '-';
    const d = new Date(str);
    if (isNaN(d)) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  },

  /** "2026-06-11" → "จันทร์ 11/06/2026" */
  dateWithDay(str) {
    if (!str) return '-';
    const d = new Date(str);
    if (isNaN(d)) return str;
    const dayName = d.toLocaleDateString('th-TH', { weekday: 'short' });
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${dayName} ${day}/${month}/${year}`;
  },

  /** 1234567.89 → "1,234,568" */
  num(n, decimals = 0) {
    if (n === null || n === undefined || n === '') return '-';
    return Number(n).toLocaleString('th-TH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  /** WeekNum Monday-based */
  weekNum(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  },

  /** "Active" → badge HTML */
  statusBadge(val) {
    if (!val) return '<span class="badge badge-draft">-</span>';
    const map = {
      'Active':        'badge-active',
      'Sent':          'badge-sent',
      'Pending':       'badge-pending',
      'Received':      'badge-received',
      'SAP Completed': 'badge-sap',
      'Cancelled':     'badge-cancelled',
    };
    const cls = map[val] ?? 'badge-draft';
    return `<span class="badge ${cls}">${val}</span>`;
  },

  /** ISO date → "YYYY-MM-DD" for input[type=date] */
  toInputDate(str) {
    if (!str) return '';
    return str.substring(0, 10);
  },
};

/* ── Spinner Helpers ────────────────────────────────────────── */
function showSpinner(containerId, msg = 'กำลังโหลดข้อมูล...') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `<div class="spinner-wrap"><div class="spinner"></div><span>${msg}</span></div>`;
}

function showEmpty(containerId, msg = 'ไม่พบข้อมูล', sub = '') {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = `
    <div class="table-empty">
      <div class="empty-icon"><i class="bi bi-inbox" style="font-size:2rem;color:var(--text-muted)"></i></div>
      <div class="empty-text">${msg}</div>
      ${sub ? `<div class="empty-sub">${sub}</div>` : ''}
    </div>`;
}

/* ── Populate Select ─────────────────────────────────────────── */
function populateSelect(selectEl, items, valueKey, labelKey, placeholder = 'เลือก...', includeAll = false) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (placeholder) {
    const opt = document.createElement('option');
    opt.value = ''; opt.textContent = placeholder;
    selectEl.appendChild(opt);
  }
  if (includeAll) {
    const opt = document.createElement('option');
    opt.value = 'all'; opt.textContent = 'ทั้งหมด';
    selectEl.appendChild(opt);
  }
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = typeof item === 'string' ? item : item[valueKey];
    opt.textContent = typeof item === 'string' ? item : item[labelKey];
    selectEl.appendChild(opt);
  });
}

/* ── Current FY ─────────────────────────────────────────────── */
function getCurrentFY() {
  const m = new Date().getMonth() + 1;
  const y = new Date().getFullYear();
  return m >= 10 ? y + 1 : y;
}

/* ── Debounce ───────────────────────────────────────────────── */
function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/* ── Authentication & Profile Session ────────────────────────── */
const Auth = {
  // ─── Department helpers ────────────────────────────────────
  /** Department values: 'production' | 'warehouse' | 'admin' */
  getDept() {
    const u = this.getUser();
    // Fallback: Admin role without explicit dept → treat as admin
    if (!u) return null;
    return u.department || (u.role === 'Admin' ? 'admin' : 'production');
  },
  isAdmin() {
    const u = this.getUser();
    if (!u) return false;
    return u.role === 'Admin' || this.getDept() === 'admin';
  },
  isProduction() {
    return this.getDept() === 'production';
  },
  isWarehouse() {
    return this.getDept() === 'warehouse';
  },

  /**
   * Returns true if the user can navigate to the given page.
   * Admin → all pages
   * production → dashboard, request (RW), history, po (RO)
   * warehouse  → dashboard, receive (RW), history, po (RO)
   */
  canAccess(page) {
    if (this.isAdmin()) return true;
    const dept = this.getDept();
    const access = {
      production: ['index.html', 'request.html', 'history.html', 'po.html'],
      warehouse:  ['index.html', 'receive.html', 'history.html', 'po.html'],
    };
    return (access[dept] || []).includes(page);
  },

  /**
   * Returns true if the user can see the page but should NOT perform write actions.
   * e.g., warehouse sees request page in read-only.
   */
  isReadOnly(page) {
    if (this.isAdmin()) return false;
    const dept = this.getDept();
    const readOnly = {
      production: ['receive.html'],
      warehouse:  ['request.html'],
    };
    return (readOnly[dept] || []).includes(page);
  },

  // ─── Core auth ────────────────────────────────────────────
  getUser() {
    try {
      const u = localStorage.getItem('matcall_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      console.error("Error parsing user session, clearing...", e);
      localStorage.removeItem('matcall_user');
      return null;
    }
  },
  setUser(userObj) {
    if (userObj) {
      localStorage.setItem('matcall_user', JSON.stringify(userObj));
    } else {
      localStorage.removeItem('matcall_user');
    }
  },
  logout() {
    this.setUser(null);
    window.location.href = 'login.html';
  },
  checkAuth() {
    const path = location.pathname.split('/').pop() || 'index.html';
    if (path === 'login.html') return;

    const user = this.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // ── Sidebar menu visibility based on department ──────────
    const menuRules = {
      production: ['index.html', 'request.html', 'history.html', 'po.html'],
      warehouse:  ['index.html', 'receive.html', 'history.html', 'po.html'],
      admin:      ['index.html', 'request.html', 'receive.html', 'history.html', 'po.html', 'settings.html'],
    };
    const dept = user.department || (user.role === 'Admin' ? 'admin' : 'production');
    const allowed = menuRules[dept] || menuRules['production'];

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      const page = el.dataset.page || el.getAttribute('data-page');
      const li = el.closest('li');
      if (!li) return;
      if (page) {
        // Only touch style.display when it actually needs to change.
        if (!allowed.includes(page)) {
          if (li.style.display !== 'none') li.style.display = 'none';
        } else {
          if (li.style.display === 'none') li.style.display = '';
        }
      }
    });

    // ── Add logout button to topbar dynamically ──────────────
    const topbar = document.getElementById('topbar');
    if (topbar && !document.getElementById('topbar-logout')) {
      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'btn btn-sm';
      logoutBtn.id = 'topbar-logout';
      logoutBtn.style.padding = '5px 10px';
      logoutBtn.style.fontSize = '12px';
      logoutBtn.style.fontWeight = '700';
      logoutBtn.style.marginLeft = '8px';
      logoutBtn.style.border = '1px solid #dc2626';
      logoutBtn.style.color = '#dc2626';
      logoutBtn.style.background = 'rgba(220, 38, 38, 0.05)';
      logoutBtn.style.borderRadius = '6px';
      logoutBtn.style.transition = 'all 0.2s';
      logoutBtn.style.display = 'inline-flex';
      logoutBtn.style.alignItems = 'center';
      logoutBtn.style.gap = '4px';

      logoutBtn.onmouseenter = () => {
        logoutBtn.style.background = '#dc2626';
        logoutBtn.style.color = '#ffffff';
      };
      logoutBtn.onmouseleave = () => {
        logoutBtn.style.background = 'rgba(220, 38, 38, 0.05)';
        logoutBtn.style.color = '#dc2626';
      };

      logoutBtn.innerHTML = '<i class="bi bi-box-arrow-right"></i> <span>ออกจากระบบ</span>';
      logoutBtn.onclick = () => {
        if (confirm('ต้องการลงชื่อออกจากระบบ (Log out) หรือไม่?')) {
          Auth.logout();
        }
      };

      // Always append to the end of topbar to ensure it is at the far right
      topbar.appendChild(logoutBtn);
    }

    // ── Sidebar footer user badge ─────────────────────────────
    const deptLabel = {
      production: '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(52,211,153,0.15);color:#34d399;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700"><i class="bi bi-gear-fill"></i>แผนกผลิต</span>',
      warehouse:  '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(129,140,248,0.2);color:#a5b4fc;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700"><i class="bi bi-box-seam-fill"></i>แผนกคลัง</span>',
      admin:      '<span style="display:inline-flex;align-items:center;gap:3px;background:rgba(251,191,36,0.15);color:#fbbf24;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700"><i class="bi bi-shield-fill-check"></i>Admin</span>',
    };

    const footer = document.querySelector('.sidebar-footer');
    if (footer) {
      const avatar = user.plant_code ? user.plant_code : (user.role === 'Admin' ? 'SA' : (user.name ? user.name.substring(0, 2).toUpperCase() : 'US'));
      const deptBadge = deptLabel[dept] || '';

      footer.innerHTML = `
        <div class="user-badge" style="cursor:pointer; position:relative; flex-direction:column; align-items:flex-start; gap:6px;" onclick="if(confirm('ต้องการสลับบัญชี/Log out?')) Auth.logout()">
          <div style="display:flex;align-items:center;gap:8px;width:100%">
            <div class="user-avatar" style="background:#0c8a7e; color:#fff; font-size: 11px; letter-spacing: -0.3px; flex-shrink:0">${avatar}</div>
            <div class="user-info" style="flex:1;min-width:0">
              <div class="user-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name}</div>
              <div class="user-role" style="font-size:10px;color:#a0aec0">${user.plant_code ? `โรงงาน ${user.plant_code}` : 'ส่วนกลาง'}</div>
            </div>
            <div style="color:#a0aec0; flex-shrink:0"><i class="bi bi-box-arrow-right"></i></div>
          </div>
          <div style="padding-left:4px">${deptBadge}</div>
        </div>
      `;
    }
  }
};

/* ── Init on DOM ready ──────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Dynamic global logo replacement
  const brandIcon = document.querySelector('.brand-icon');
  if (brandIcon) {
    brandIcon.innerHTML = `<img src="matcall_logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 6px;">`;
    brandIcon.style.background = 'none';
    brandIcon.style.boxShadow = 'none';
  }
  const loginLogo = document.querySelector('.login-logo');
  if (loginLogo) {
    loginLogo.innerHTML = `<img src="matcall_logo.png" alt="Logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 10px;">`;
    loginLogo.style.background = 'none';
    loginLogo.style.boxShadow = 'none';
  }

  Auth.checkAuth();
  // Restore collapsed sidebar state on desktop
  if (localStorage.getItem('sidebar_collapsed') === '1' && window.innerWidth > 768) {
    document.body.classList.add('collapsed');
  }
  Sidebar.init();
  setActiveNav();

  // Initialize Flatpickr globally to display date as dd/mm/yyyy (d/m/Y)
  if (typeof flatpickr !== 'undefined') {
    document.querySelectorAll('input[type="date"]').forEach(el => {
      const isMultiple = el.id === 'inp-delivery-date';
      flatpickr(el, {
        mode: isMultiple ? "multiple" : "single",
        altInput: true,
        altFormat: "d/m/Y",
        dateFormat: "Y-m-d",
        allowInput: true,
        conjunction: ", "
      });
    });
  }
});
