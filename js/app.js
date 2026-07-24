/* ============================================================
   MATCALL - App Shared Utilities
   Sidebar, navigation, toast, modal, formatters
   ============================================================ */

/* ── Material / Supplier name mapping (SAP code-prefixed <-> bare DB form) ──
   Shared between request.js (creates plans, bare DB form) and history.js
   (assigns PO numbers against po_data, which is keyed by the SAP form). */
const MatMap = {
  toDB(sapName) {
    if (sapName === '120001706 CO2 Gas' || sapName === 'CO2 Gas') return 'CO2';
    if (sapName === '120001687 น้ำตาลเหลว' || sapName === 'น้ำตาลเหลว') return 'Liquid Sugar';
    if (sapName === '120001688 High Fructose Syrup 42%' || sapName === 'High Fructose Syrup 42%') return 'HFS42%';
    if (sapName === '120001474 Bioligo (IMO)' || sapName === 'Bioligo (IMO)') return 'Bioligo IMO';
    return sapName;
  },
  toSAP(dbName) {
    if (dbName === 'CO2') return '120001706 CO2 Gas';
    if (dbName === 'Liquid Sugar' || dbName === 'Liquid Sugar ') return '120001687 น้ำตาลเหลว';
    if (dbName === 'HFS42%') return '120001688 High Fructose Syrup 42%';
    if (dbName === 'Bioligo IMO') return '120001474 Bioligo (IMO)';
    return dbName;
  }
};

const SupplierMap = {
  toSAP(dbName) {
    if (dbName === 'เจ้าคุณเกษตรพืชผล' || dbName === 'บจก.เจ้าคุณเกษตรพืชผล') return 'เจ้าคุณเกษตรพืชผล';
    if (dbName === 'WGC' || dbName === 'ดับเบิ้ลยูจีซี') return 'ดับเบิ้ลยูจีซี';
    if (dbName === 'ลินเด้ (ประเทศไทย)') return 'ลินเด้ (ประเทศไทย)';
    if (dbName === 'พี.เอส.ซี.สตาร์ช โปรดักส์') return 'พี.เอส.ซี.สตาร์ช โปรดักส์';
    if (dbName === 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น') return 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น';
    if (dbName === 'ไทยรุ่งเรืองอุตสาหกรรม') return 'ไทยรุ่งเรืองอุตสาหกรรม';
    return dbName;
  },
  toDB(sapName) {
    if (sapName === 'เจ้าคุณเกษตรพืชผล' || sapName === 'บจก.เจ้าคุณเกษตรพืชผล') return 'เจ้าคุณเกษตรพืชผล';
    if (sapName === 'ดับเบิ้ลยูจีซี' || sapName === 'WGC') return 'ดับเบิ้ลยูจีซี';
    if (sapName === 'ลินเด้ (ประเทศไทย)') return 'ลินเด้ (ประเทศไทย)';
    if (sapName === 'พี.เอส.ซี.สตาร์ช โปรดักส์') return 'พี.เอส.ซี.สตาร์ช โปรดักส์';
    if (sapName === 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น') return 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น';
    if (sapName === 'ไทยรุ่งเรืองอุตสาหกรรม') return 'ไทยรุ่งเรืองอุตสาหกรรม';
    return sapName;
  }
};

// Bioligo (IMO) is called off in IBC, but its PO (po_data.qty_pending) is
// tracked in KG like every other PO material. 1 IBC = 1,350 KG.
const BIOLIGO_IMO_KG_PER_IBC = 1350;
// Convert an entered/basket quantity to the KG amount to deduct from the PO.
// Only Bioligo (IMO) needs conversion; everything else is already in KG.
function toPoDeductionKg(material, qty) {
  return MatMap.toDB(material) === 'Bioligo IMO' ? (parseFloat(qty) || 0) * BIOLIGO_IMO_KG_PER_IBC : (parseFloat(qty) || 0);
}

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

/* ── Magic Spring bottom-nav indicator ─────────────────────────
   Moves the .nav-indicator-bg circle under whichever .nav-item is
   currently active/visible in the mobile bottom bar. Uses offsetLeft
   so it stays correct regardless of how many items are shown for the
   logged-in user's department (see Auth.checkAuth). No-op on desktop
   since the indicator is hidden there via CSS. */
function positionNavIndicator() {
  const indicator = document.querySelector('.nav-indicator-bg');
  if (!indicator) return;

  if (window.innerWidth > 768) {
    indicator.classList.remove('is-visible');
    return;
  }

  const activeLi = document.querySelector('.sidebar-nav li > .nav-item.active')?.closest('li');
  if (!activeLi || activeLi.style.display === 'none') {
    indicator.classList.remove('is-visible');
    return;
  }

  const inset = 4; // matches the pill's visual gap from each li's edges
  const width = activeLi.offsetWidth - (inset * 2);
  const x = activeLi.offsetLeft + inset;
  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${x}px)`;
  indicator.classList.add('is-visible');
}

let _navIndicatorResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_navIndicatorResizeTimer);
  _navIndicatorResizeTimer = setTimeout(positionNavIndicator, 120);
});

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

/* ── Reschedule / Cancel (already-notified call-off items) ──────
   Shared by request.html (production dept — owns the plan) so they can
   amend a call-off item that's already been e-mailed to the supplier:
   reschedule its delivery date, or cancel it outright. Both actions keep
   the ORIGINAL row (voided visually — red text, quantity shown as "-")
   for an audit trail, and reschedule additionally creates a new row for
   the new date (mail_status reset to Pending so it shows up for a fresh
   notification). No DB schema changes needed: `status` is set to
   'Rescheduled'/'Cancelled' (existing free-text column), and a bracketed
   machine-readable tag is prefixed onto `remark` — see parseChangeTag(). */
function parseChangeTag(remark) {
  if (!remark) return null;
  const m = remark.match(/^\[(RESCHED_TO|RESCHED_FROM|CANCELLED):?([^\]]*)\]\s*/);
  if (!m) return null;
  return { type: m[1], value: m[2], rest: remark.slice(m[0].length).trim() };
}

/**
 * Open the reschedule/cancel modal for a call-off row.
 * @param {object} row - the full calloff_plan row being amended
 * @param {function} onSaved - called after the DB update succeeds, to let
 *   the calling page refresh its own list (e.g. loadRequestList)
 */
function openRescheduleModal(row, onSaved) {
  document.getElementById('__resched_modal')?.remove();

  const todayStr = new Date().toISOString().slice(0, 10);
  const html = `
  <div id="__resched_modal" class="modal-backdrop" style="display:flex">
    <div class="modal-box" style="max-width:460px">
      <div class="modal-header">
        <span class="modal-title"><i class="bi bi-calendar2-week"></i> แก้ไขแผนการเรียกเข้า</span>
        <button class="modal-close" onclick="document.getElementById('__resched_modal').remove()">✕</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">
          <strong>${row.material_name ?? '-'}</strong> — ${row.supplier_name ?? '-'}<br>
          วันที่ส่งมอบเดิม: <strong>${Fmt.dateWithDay(row.delivery_date)}</strong>
          &nbsp;|&nbsp; จำนวน: <strong>${Fmt.num(row.quantity)} ${row.unit ?? ''}</strong>
        </p>
        <div class="form-group">
          <label class="form-check">
            <input type="radio" name="resched-action" value="reschedule" checked onchange="__toggleReschedFields()"> เลื่อนวันที่ส่งมอบ
          </label>
          <label class="form-check">
            <input type="radio" name="resched-action" value="cancel" onchange="__toggleReschedFields()"> ยกเลิกรายการนี้
          </label>
        </div>
        <div class="form-group" id="resched-date-group">
          <label class="filter-label">วันที่ส่งมอบใหม่</label>
          <input type="date" class="form-control" id="resched-new-date" min="${todayStr}">
        </div>
        <div class="form-group">
          <label class="filter-label">หมายเหตุ (ถ้ามี)</label>
          <textarea class="form-control" id="resched-reason" rows="2" placeholder="เช่น เหตุผลที่เลื่อน/ยกเลิก"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-ghost" onclick="document.getElementById('__resched_modal').remove()">ยกเลิก</button>
        <button class="btn btn-primary" id="__resched_ok"><i class="bi bi-check-lg"></i> บันทึกการเปลี่ยนแปลง</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('__resched_ok').onclick = () => submitReschedule(row, onSaved);

  // Injected after page load, so the global flatpickr initializer (which
  // only runs once on DOMContentLoaded) never sees this input — wire it
  // up here so the date shows as dd/mm/yyyy like every other date field.
  if (typeof flatpickr !== 'undefined') {
    flatpickr('#resched-new-date', {
      mode: 'single',
      altInput: true,
      altFormat: 'd/m/Y',
      dateFormat: 'Y-m-d',
      allowInput: true,
      minDate: todayStr,
    });
  }
}

window.__toggleReschedFields = function () {
  const action = document.querySelector('input[name="resched-action"]:checked')?.value;
  const group = document.getElementById('resched-date-group');
  if (group) group.style.display = action === 'reschedule' ? '' : 'none';
};

async function submitReschedule(row, onSaved) {
  const action = document.querySelector('input[name="resched-action"]:checked')?.value;
  const reason = document.getElementById('resched-reason')?.value?.trim() || '';
  const newDate = document.getElementById('resched-new-date')?.value;

  if (action === 'reschedule' && !newDate) {
    Toast.warning('กรุณาระบุวันที่ส่งมอบใหม่');
    return;
  }
  if (action === 'reschedule' && newDate === row.delivery_date) {
    Toast.warning('วันที่ใหม่ต้องไม่ตรงกับวันที่เดิม');
    return;
  }

  const btn = document.getElementById('__resched_ok');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';

  try {
    let newRow = null;

    if (action === 'cancel') {
      const tag = `[CANCELLED:${new Date().toISOString().slice(0, 10)}]`;
      await API.updateCalloffPlan(row.id, {
        status: 'Cancelled',
        remark: reason ? `${tag} ${reason}` : tag,
      });
    } else {
      const tagOld = `[RESCHED_TO:${newDate}]`;
      await API.updateCalloffPlan(row.id, {
        status: 'Rescheduled',
        remark: reason ? `${tagOld} ${reason}` : tagOld,
      });

      const tagNew = `[RESCHED_FROM:${row.delivery_date}]`;
      newRow = await API.createCalloffPlan({
        plant:         row.plant,
        material_name: row.material_name,
        supplier_name: row.supplier_name,
        delivery_date: newDate,
        quantity:      row.quantity,
        unit:          row.unit,
        tank_id:       row.tank_id,
        po_number:     row.po_number,
        remark:        reason ? `${tagNew} ${reason}` : tagNew,
        title:         `${row.material_name} - ${row.supplier_name} - ${newDate}`,
      });
    }

    document.getElementById('__resched_modal')?.remove();
    Toast.success(action === 'cancel' ? 'ยกเลิกรายการสำเร็จ' : 'เลื่อนวันที่สำเร็จ');
    if (typeof onSaved === 'function') await onSaved();

    // Offer to notify the supplier about this change right away — but only
    // if the original item had already been e-mailed (mail_status Sent);
    // if it was never sent, there's nothing for the supplier to be told.
    if (row.mail_status === 'Sent') {
      const affectedIds = [row.id, ...(newRow ? [newRow.id] : [])];
      Modal.confirm(
        'แจ้ง Supplier',
        `ต้องการส่งอีเมลแจ้ง Supplier เกี่ยวกับการ${action === 'cancel' ? 'ยกเลิก' : 'เลื่อน'}รายการนี้ตอนนี้เลยหรือไม่?`,
        () => sendChangeNotification(row, affectedIds),
        'info'
      );
    }
  } catch (e) {
    Toast.error('บันทึกไม่สำเร็จ: ' + e.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check-lg"></i> บันทึกการเปลี่ยนแปลง';
  }
}

/* Route the affected row(s) into the email flow, tagged as a change
   notification so email-preview-supplier.html renders the voided row in
   red/strikethrough and the new row (if any) with a "rescheduled from"
   note, instead of the normal all-green call-off table. */
async function sendChangeNotification(oldRow, ids) {
  const items = await API.getCalloffPlans({ plant: oldRow.plant });
  const selectedItems = items.filter(r => ids.includes(r.id))
    .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date));

  const currentUser = Auth.getUser();
  sessionStorage.setItem('email_items',    JSON.stringify(selectedItems));
  sessionStorage.setItem('email_plant',    oldRow.plant);
  sessionStorage.setItem('email_supplier', oldRow.supplier_name);
  sessionStorage.setItem('email_type',     'change');
  sessionStorage.setItem('email_sender_name',  currentUser?.name  || '');
  sessionStorage.setItem('email_sender_email', currentUser?.email || '');

  // Cache-bust to avoid the browser serving a stale cached copy of this page.
  window.location.href = 'email-preview-supplier.html?t=' + Date.now();
}

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

  /** "2026-06-11T14:30:00Z" → "11/06/2026 14:30" */
  dateTime(str) {
    if (!str) return '-';
    const d = new Date(str);
    if (isNaN(d)) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hr = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hr}:${min}`;
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
      'Rescheduled':   'badge-rescheduled',
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
      production: ['index.html', 'request.html', 'history.html'],
      warehouse:  ['index.html', 'receive.html', 'history.html', 'email-preview-supplier.html', 'email-preview-pan.html', 'po.html'],
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

    // ── Route Access Protection ──────────────────────────────
    if (!this.canAccess(path)) {
      window.location.href = 'index.html';
      return;
    }

    // ── Sidebar menu visibility based on department ──────────
    const menuRules = {
      production: ['index.html', 'request.html', 'history.html'],
      warehouse:  ['index.html', 'receive.html', 'history.html', 'po.html'],
      admin:      ['index.html', 'request.html', 'receive.html', 'history.html', 'po.html', 'settings.html'],
    };
    const dept = user.department || (user.role === 'Admin' ? 'admin' : 'production');
    const allowed = menuRules[dept] || menuRules['production'];

    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      const page = el.dataset.page || el.getAttribute('data-page');
      const li = el.closest('li');
      if (page) {
        if (!allowed.includes(page)) {
          if (li) li.style.display = 'none';
          el.style.display = 'none';
        } else {
          if (li) li.style.display = '';
          el.style.display = '';
        }
      }
    });

    // ── Add Switch User Dropdown for Testing ──────────────────
    // (The standalone "ออกจากระบบ" topbar button was removed — logout is
    // already reachable from the sidebar user badge at the bottom, which
    // shows the signed-in user's name and a logout icon.)
    const topbar = document.getElementById('topbar');
    if (topbar && !document.getElementById('topbar-switch-user')) {
      const switchContainer = document.createElement('div');
      switchContainer.id = 'topbar-switch-user';
      switchContainer.style.display = 'inline-flex';
      switchContainer.style.alignItems = 'center';
      switchContainer.style.marginLeft = 'auto';
      switchContainer.style.gap = '6px';
      
      const switchSelect = document.createElement('select');
      switchSelect.className = 'form-control form-control-sm';
      switchSelect.style.width = '140px';
      switchSelect.style.fontSize = '12px';
      switchSelect.style.padding = '4px 8px';
      switchSelect.style.height = '32px';
      switchSelect.innerHTML = '<option value="" disabled selected>สลับสิทธิ์ผู้ใช้...</option>';

      // Fetch users and populate only representative groups
      API.getUsers().then(users => {
        // Find one user for each required role/group
        const superAdmin = users.find(u => u.username.toLowerCase() === 'admin');
        const userProd = users.find(u => u.role.toLowerCase() === 'user' && u.department.toLowerCase() === 'production');
        const userWh = users.find(u => u.department.toLowerCase() === 'warehouse');
        const adminPlant = users.find(u => u.role.toLowerCase() === 'admin' && u.department.toLowerCase() === 'production' && u.plant_code);

        const representatives = [
          { user: superAdmin, label: 'Super Admin' },
          { user: userProd, label: 'User แผนกผลิต' },
          { user: userWh, label: 'User แผนกคลัง' },
          { user: adminPlant, label: 'Admin โรงงาน' }
        ];

        representatives.forEach(rep => {
          if (rep.user) {
            const opt = document.createElement('option');
            opt.value = rep.user.username;
            opt.textContent = rep.label;
            
            // Check if active user belongs to this category to mark selected
            const isSuperActive = rep.label === 'Super Admin' && user.username.toLowerCase() === 'admin';
            const isProdActive = rep.label === 'User แผนกผลิต' && user.role.toLowerCase() === 'user' && user.department.toLowerCase() === 'production';
            const isWhActive = rep.label === 'User แผนกคลัง' && user.department.toLowerCase() === 'warehouse';
            const isAdminPlantActive = rep.label === 'Admin โรงงาน' && user.role.toLowerCase() === 'admin' && user.department.toLowerCase() === 'production' && user.plant_code;

            if (isSuperActive || isProdActive || isWhActive || isAdminPlantActive) {
              opt.selected = true;
            }
            switchSelect.appendChild(opt);
          }
        });
      }).catch(err => console.error(err));

      switchSelect.onchange = async () => {
        const selectedUsername = switchSelect.value;
        if (!selectedUsername) return;
        try {
          const users = await API.getUsers();
          const target = users.find(u => u.username.toLowerCase() === selectedUsername.toLowerCase());
          if (target) {
            Auth.setUser(target);
            window.location.reload();
          }
        } catch (e) {
          console.error(e);
        }
      };

      switchContainer.appendChild(switchSelect);
      topbar.appendChild(switchContainer);
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

/* ── Mobile Profile Modal ───────────────────────────────────────
   The mobile bottom nav bar is icon-only and has no room for the full
   user-badge that desktop shows in .sidebar-footer, so tapping the
   "โปรไฟล์" tab opens this modal instead — same info, plus a Log out
   button. */
function showProfileModal() {
  const user = Auth.getUser();
  if (!user) return;

  const dept = Auth.getDept();
  const deptLabel = {
    production: '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(52,211,153,0.15);color:#059669;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="bi bi-gear"></i>แผนกผลิต</span>',
    warehouse:  '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(129,140,248,0.2);color:#4f46e5;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="bi bi-box-seam"></i>แผนกคลัง</span>',
    admin:      '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(251,191,36,0.18);color:#b45309;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700"><i class="bi bi-shield-fill-check"></i>Admin</span>',
  };
  const avatar = user.plant_code ? user.plant_code : (user.role === 'Admin' ? 'SA' : (user.name ? user.name.substring(0, 2).toUpperCase() : 'US'));

  document.getElementById('__profile_modal')?.remove();

  const html = `
  <div id="__profile_modal" class="modal-backdrop" style="display:flex">
    <div class="modal-box" style="max-width:340px">
      <div class="modal-header">
        <span class="modal-title"><i class="bi bi-person-circle"></i> โปรไฟล์ผู้ใช้งาน</span>
        <button class="modal-close" onclick="document.getElementById('__profile_modal').remove()">✕</button>
      </div>
      <div class="modal-body" style="text-align:center">
        <div style="width:64px;height:64px;border-radius:50%;background:#0c8a7e;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin:0 auto 12px">${avatar}</div>
        <div style="font-size:16px;font-weight:700;color:var(--text-primary)">${user.name ?? '-'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">${user.plant_code ? `โรงงาน ${user.plant_code}` : 'ส่วนกลาง'}</div>
        <div style="margin-top:10px">${deptLabel[dept] ?? ''}</div>
        ${user.username ? `<div style="font-size:11px;color:var(--text-muted);margin-top:14px">Username: ${user.username}</div>` : ''}
      </div>
      <div class="modal-footer" style="justify-content:center">
        <button class="btn btn-danger" id="__profile_logout" style="width:100%"><i class="bi bi-box-arrow-right"></i> Log out</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('__profile_logout').onclick = () => {
    document.getElementById('__profile_modal')?.remove();
    Modal.confirm('ยืนยันการออกจากระบบ', 'ต้องการ Log out ออกจากระบบใช่หรือไม่?', () => Auth.logout(), 'info');
  };
}

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
  // Clear stale fallback users list to force updates
  try {
    localStorage.removeItem('fallback_users');
  } catch (e) {}

  // Restore collapsed sidebar state on desktop
  if (localStorage.getItem('sidebar_collapsed') === '1' && window.innerWidth > 768) {
    document.body.classList.add('collapsed');
  }
  Sidebar.init();
  setActiveNav();

  // Mobile bottom-bar "โปรไฟล์" tab → user info + logout modal
  document.getElementById('btn-mobile-profile')?.addEventListener('click', showProfileModal);
  positionNavIndicator();
  // Re-run once more after layout/fonts settle (icons/webfont can shift widths)
  setTimeout(positionNavIndicator, 200);

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
