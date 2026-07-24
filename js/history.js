/* ============================================================
   MATCALL - History Screen (ประวัติและสถานะ)
   ============================================================ */

let histRows = [];
let histSelected = new Set(); // selected IDs
let activeMaterial = "";
let histMaterials = [];
let canAssignPo = false; // set in DOMContentLoaded — warehouse/admin only

// Materials tracked against po_data.qty_pending. Kept in sync with the list
// request.js used to gate its (now-removed) PO dropdown.
const PO_TRACKED_MATERIALS = ['CO2', 'Liquid Sugar', 'HFS42%', 'Bioligo IMO'];

/* ── Date Helpers ────────────────────────────────────────────── */
function getNextWeekRange() {
  const today = new Date();
  const day = today.getDay();
  // If today is Sunday (0), next Monday is tomorrow (+1).
  // Otherwise next Monday is 8 - day.
  const daysToNextMonday = day === 0 ? 1 : 8 - day;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToNextMonday);

  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  const pad = n => String(n).padStart(2, '0');
  const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return {
    start: formatDate(nextMonday),
    end: formatDate(nextSunday)
  };
}

function setDefaultFilters() {
  const nextWeek = getNextWeekRange();
  const fromEl = document.getElementById('inp-hist-from');
  const toEl = document.getElementById('inp-hist-to');
  const mailEl = document.getElementById('sel-hist-mailstatus');

  if (fromEl) fromEl.value = nextWeek.start;
  if (toEl) toEl.value = nextWeek.end;
  if (mailEl) mailEl.value = 'Pending';
}

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setDefaultFilters();

  // ── Hide "สร้างอีเมล" button for production dept users ──────
  const _histUser = Auth.getUser();
  const _histDept = (_histUser?.department || '').toLowerCase();
  const _canEmail = Auth.isAdmin() || _histDept === 'warehouse';
  if (!_canEmail) {
    const btnEmail = document.getElementById('btn-create-email');
    if (btnEmail) btnEmail.style.display = 'none';
  }

  // PO assignment is available to any logged-in dept that can reach this
  // page (production and warehouse both need to be able to pick a PO).
  canAssignPo = Auth.isAdmin() || _histDept === 'warehouse' || _histDept === 'production';

  await loadHistoryMasters();
  await loadHistoryList();
  bindHistoryEvents();
  updateSelectionCount();
});

/* ── Masters ────────────────────────────────────────────────── */
async function loadHistoryMasters() {
  try {
    const plants = await API.getPlants();
    populateSelect(document.getElementById('sel-hist-plant'), plants, 'plant_code', 'plant_name', 'ทั้งหมด', true);

    await updateSupplierFilterDropdown(null);

    histMaterials = await API.getMaterials();
    renderMaterialTabs();

    // Auto-select plant if user is restricted to a plant
    const user = Auth.getUser();
    if (user && user.plant_code) {
      const selHistPlant = document.getElementById('sel-hist-plant');
      if (selHistPlant) {
        selHistPlant.value = user.plant_code;
        selHistPlant.disabled = true;
      }
    }
  } catch (e) { console.error(e); }
}

async function updateSupplierFilterDropdown(plantCode = null) {
  const sel = document.getElementById('sel-hist-supplier');
  if (!sel) return;
  sel.innerHTML = '<option value="">กำลังโหลด...</option>';
  try {
    const suppliers = await API.getSuppliers(plantCode || null);
    const distinctNames = [...new Set(suppliers.map(s => s.supplier_name))].sort();
    populateSelect(sel, distinctNames, '', '', 'ทั้งหมด');
  } catch (e) {
    sel.innerHTML = '<option value="">โหลดล้มเหลว</option>';
  }
}

function renderMaterialTabs() {
  const container = document.getElementById('material-tabs-container');
  if (!container) return;

  let html = `<div class="tabs">`;
  html += `<button class="tab-btn ${activeMaterial === '' ? 'active' : ''}" onclick="selectMaterialTab('')">ทั้งหมด</button>`;
  histMaterials.forEach(m => {
    html += `<button class="tab-btn ${activeMaterial === m ? 'active' : ''}" onclick="selectMaterialTab('${m}')">${m}</button>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

window.selectMaterialTab = function (mat) {
  activeMaterial = mat;
  renderMaterialTabs();
  loadHistoryList();
};

/* ── Load List ──────────────────────────────────────────────── */
async function loadHistoryList() {
  showSpinner('hist-table-body', 'กำลังโหลดประวัติ...');
  histSelected.clear();
  updateSelectionCount();

  const plant = document.getElementById('sel-hist-plant')?.value;
  const supplier = document.getElementById('sel-hist-supplier')?.value;
  const mailSt = document.getElementById('sel-hist-mailstatus')?.value;
  const dateFrom = document.getElementById('inp-hist-from')?.value;
  const dateTo = document.getElementById('inp-hist-to')?.value;

  try {
    let data = await API.getCalloffPlans({
      plant: plant && plant !== 'all' ? plant : null,
      mailStatus: mailSt && mailSt !== 'all' ? mailSt : null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
    });

    // Client-side filter for supplier/tabs
    if (activeMaterial) {
      data = data.filter(r => r.material_name === activeMaterial);
    }
    if (supplier) {
      data = data.filter(r => r.supplier_name === supplier);
    }

    histRows = data;
    renderHistoryTable(data);
    document.getElementById('hist-row-count').textContent = data.length;
    renderPoSummary();
    renderPoBulkAssignBar();
  } catch (e) {
    Toast.error('โหลดประวัติไม่สำเร็จ: ' + e.message);
  }
}

/* ── PO Quantity Summary (per selected material tab) ──────────
   Shown under the material toggle whenever a specific PO-tracked material
   is selected — a quick reference for how much is still pending against
   each active PO, filtered by whatever plant/supplier filter is applied. */
async function renderPoSummary() {
  const container = document.getElementById('po-summary-container');
  if (!container) return;

  if (!activeMaterial || !PO_TRACKED_MATERIALS.includes(activeMaterial)) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const plantVal    = document.getElementById('sel-hist-plant')?.value;
  const supplierVal = document.getElementById('sel-hist-supplier')?.value;
  const plant    = plantVal    && plantVal    !== 'all' ? plantVal    : null;
  const supplier = supplierVal && supplierVal !== 'all' ? supplierVal : null;

  container.style.display = 'block';
  container.innerHTML = `<div class="alert alert-info" style="margin-bottom:0">
    <span class="alert-icon"><i class="bi bi-hourglass-split"></i></span>
    <span>กำลังโหลดข้อมูล PO...</span></div>`;

  try {
    const poMaterialName = MatMap.toSAP(activeMaterial);
    const poSupplier = supplier ? SupplierMap.toSAP(supplier) : null;
    const pos = await API.getPOs(plant, poMaterialName, poSupplier);
    const active = pos.filter(p => !p.is_completed && p.is_active !== false && parseFloat(p.qty_pending) > 0);

    const poMap = {};
    active.forEach(p => {
      if (!poMap[p.po_number]) {
        poMap[p.po_number] = { qty: 0, price: p.net_price, currency: p.currency };
      }
      poMap[p.po_number].qty += parseFloat(p.qty_pending);
    });
    const entries = Object.entries(poMap);

    if (entries.length === 0) {
      container.innerHTML = `<div class="alert alert-info" style="margin-bottom:0">
        <span class="alert-icon"><i class="bi bi-info-circle-fill"></i></span>
        <span>ไม่มี PO คงเหลือสำหรับ <strong>${activeMaterial}</strong></span></div>`;
      return;
    }

    container.innerHTML = `
      <div class="alert alert-info" style="margin-bottom:0;flex-wrap:wrap;row-gap:6px;">
        <span class="alert-icon"><i class="bi bi-file-earmark-spreadsheet-fill"></i></span>
        <span>Qty ยังไม่รับตาม PO (<strong>${activeMaterial}</strong>):</span>
        ${entries.map(([num, info]) => {
          const priceLabel = (info.price !== null && info.price !== undefined)
            ? ` (${Fmt.num(info.price, 2)} ${info.currency || ''})`.trimEnd()
            : '';
          return `<span class="badge" style="background:#e0f2f1;color:#0c8a7e;margin-left:6px;white-space:nowrap">
            <i class="bi bi-file-earmark-text"></i> ${num}${priceLabel}: <strong>${Fmt.num(info.qty)}</strong> kg
          </span>`;
        }).join('')}
      </div>`;
  } catch (e) {
    container.innerHTML = `<div class="alert alert-warning" style="margin-bottom:0">โหลดข้อมูล PO ไม่สำเร็จ: ${e.message}</div>`;
  }
}

/* ── Bulk PO Assignment ─────────────────────────────────────────
   Lets a warehouse/production user pick one PO once and apply it to every
   currently-listed, not-yet-assigned row for the active material tab —
   avoids clicking "ยืนยัน PO" row by row when they're all the same PO. */
async function renderPoBulkAssignBar() {
  const container = document.getElementById('po-bulk-assign-container');
  if (!container) return;

  if (!canAssignPo || !activeMaterial || !PO_TRACKED_MATERIALS.includes(activeMaterial)) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const plantVal = document.getElementById('sel-hist-plant')?.value;
  const plant = plantVal && plantVal !== 'all' ? plantVal : null;

  const supplierVal = document.getElementById('sel-hist-supplier')?.value;
  const supplier = supplierVal && supplierVal !== 'all' ? supplierVal : null;
  const poSupplier = supplier ? SupplierMap.toSAP(supplier) : null;

  container.style.display = 'block';
  container.innerHTML = `
    <div class="alert alert-info" style="margin-bottom:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <span class="alert-icon"><i class="bi bi-collection-fill"></i></span>
      <span>เลือก PO เดียวกันให้ทุกแถว:</span>
      <select id="sel-po-bulk-assign" class="form-control form-control-sm" style="width:auto;min-width:200px;font-size:13px">
        <option value="">กำลังโหลด...</option>
      </select>
      <button id="btn-po-bulk-assign" class="btn btn-teal btn-sm" style="padding:4px 10px">
        <i class="bi bi-check2-all"></i> ใช้ PO นี้กับทุกแถว
      </button>
    </div>`;

  const sel = document.getElementById('sel-po-bulk-assign');
  try {
    const poMaterialName = MatMap.toSAP(activeMaterial);
    const pos = await API.getPOs(plant, poMaterialName, poSupplier);
    // Only offer POs SAP hasn't marked "Deliv. Compl." (X) — X means closed.
    const open = pos.filter(p => !p.is_completed && p.is_active !== false);
    const poMap = {};
    open.forEach(p => {
      if (!poMap[p.po_number]) poMap[p.po_number] = { price: p.net_price, currency: p.currency };
    });
    const entries = Object.entries(poMap).sort((a, b) => a[0].localeCompare(b[0]));

    if (entries.length === 0) {
      sel.innerHTML = '<option value="">ไม่พบ PO</option>';
    } else {
      sel.innerHTML = '<option value="">เลือก PO...</option>' +
        entries.map(([num, info]) => {
          const priceLabel = (info.price !== null && info.price !== undefined)
            ? ` (${Fmt.num(info.price, 2)} ${info.currency || ''})`.trimEnd()
            : '';
          return `<option value="${num}">${num}${priceLabel}</option>`;
        }).join('');
    }
  } catch (e) {
    sel.innerHTML = '<option value="">โหลด PO ล้มเหลว</option>';
  }

  document.getElementById('btn-po-bulk-assign')?.addEventListener('click', () => bulkAssignPoToAll(sel.value));
}

/* Apply one chosen PO number to every currently-listed row (for the active
   material tab) that doesn't have a PO assigned yet — deducting each row's
   quantity from po_data and locking po_number onto calloff_plan, same as
   the per-row assign flow, just looped. */
async function bulkAssignPoToAll(poNumber) {
  if (!poNumber) {
    Toast.warning('กรุณาเลือกหมายเลข PO ก่อน');
    return;
  }

  const targets = histRows.filter(r =>
    !r.po_number &&
    r.status !== 'Cancelled' && r.status !== 'Rescheduled' &&
    PO_TRACKED_MATERIALS.includes(r.material_name)
  );

  if (targets.length === 0) {
    Toast.warning('ไม่มีแถวที่ยังไม่ได้ระบุ PO ให้กำหนด');
    return;
  }

  const btn = document.getElementById('btn-po-bulk-assign');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';
  }

  let ok = 0, fail = 0;
  for (const row of targets) {
    try {
      const poMaterialName = MatMap.toSAP(row.material_name);
      const deductKg = toPoDeductionKg(row.material_name, row.quantity);
      await API.updatePoPendingQty(poNumber, poMaterialName, deductKg);
      await API.updateCalloffPlan(row.id, { po_number: poNumber });
      ok++;
    } catch (e) {
      fail++;
    }
  }

  if (fail === 0) {
    Toast.success(`ระบุ PO ${poNumber} ให้ ${ok} รายการเรียบร้อย`);
  } else {
    Toast.warning(`ระบุ PO สำเร็จ ${ok} รายการ, ล้มเหลว ${fail} รายการ`);
  }
  await loadHistoryList();
}

/* ── Render Table ───────────────────────────────────────────── */
/* Note: reschedule/cancel is production dept's action, done from
   request.html (they own the plan) — this page only displays the result
   read-only: a voided original row in red with a tag showing what
   happened (see parseChangeTag() in js/app.js, shared with request.js). */
function renderHistoryTable(rows) {
  const tbody = document.getElementById('hist-table-body');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="11">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-clock-history" style="font-size:2rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ไม่พบรายการ</div>
        <div class="empty-sub">ลองปรับตัวกรองใหม่</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const isVoided = r.status === 'Cancelled' || r.status === 'Rescheduled';
    const voidStyle = isVoided ? 'color:#dc2626;font-weight:600' : '';
    const tag = parseChangeTag(r.remark);

    let tagBadge = '';
    if (tag?.type === 'RESCHED_TO') {
      tagBadge = `<span class="badge" style="background:#fee2e2;color:#991b1b;margin-left:6px;white-space:nowrap">
        <i class="bi bi-arrow-right-circle"></i> เลื่อน → ${Fmt.date(tag.value)}</span>`;
    } else if (tag?.type === 'CANCELLED') {
      tagBadge = `<span class="badge" style="background:#fee2e2;color:#991b1b;margin-left:6px;white-space:nowrap">
        <i class="bi bi-x-circle"></i> ยกเลิก</span>`;
    } else if (tag?.type === 'RESCHED_FROM') {
      tagBadge = `<span class="badge" style="background:#dcfce7;color:#15803d;margin-left:6px;white-space:nowrap">
        <i class="bi bi-arrow-left-circle"></i> เลื่อนจาก ${Fmt.date(tag.value)}</span>`;
    }

    return `
    <tr class="${histSelected.has(r.id) ? 'row-selected' : ''}">
      <td class="table-check">
        <input type="checkbox" data-id="${r.id}"
          ${histSelected.has(r.id) ? 'checked' : ''}
          onchange="toggleSelect(${r.id}, this.checked)">
      </td>
      <td class="td-center" style="font-size:12px;color:var(--text-muted)">${i + 1}</td>
      <td style="white-space:nowrap;${voidStyle}">${Fmt.dateWithDay(r.delivery_date)}</td>
      <td style="${voidStyle}"><strong>${r.plant ?? '-'}</strong></td>
      <td style="${voidStyle}">${r.requester_name ?? '-'}</td>
      <td style="${voidStyle}">${r.material_name ?? '-'}${tagBadge}</td>
      <td style="${voidStyle}">${r.supplier_name ?? '-'}</td>
      <td style="${voidStyle}">${renderPoCell(r, isVoided)}</td>
      <td class="td-right" style="${voidStyle}">${isVoided ? '-' : `<strong>${Fmt.num(r.quantity)}</strong> <small>${r.unit ?? ''}</small>`}</td>
      <td class="td-center" style="${voidStyle}">${isVoided ? '-' : (r.tank_id ? `<code style="font-size:12px">${r.tank_id}</code>` : '-')}</td>
      <td class="td-center">${Fmt.statusBadge(r.mail_status ?? 'Pending')}</td>
      <td class="td-center">${Fmt.statusBadge(r.receive_status ?? 'Pending')}</td>
    </tr>`;
  }).join('');

  if (canAssignPo) populateAssignablePoSelects(rows);
}

/* ── PO Number cell ─────────────────────────────────────────────
   Production dept no longer picks a PO when creating a plan (see
   js/request.js) — warehouse assigns it here, per row, once. Once a PO is
   assigned it's shown read-only (no re-assign, to avoid needing to reverse
   a partially-distributed deduction across po_data rows). */
function renderPoCell(r, isVoided) {
  if (isVoided) return '-';
  if (!PO_TRACKED_MATERIALS.includes(r.material_name)) return '-';
  if (r.po_number) {
    if (!canAssignPo) return `<code style="font-size:12px">${r.po_number}</code>`;
    return `
      <div style="display:flex;gap:6px;align-items:center;">
        <code style="font-size:12px; font-weight:700; color:var(--teal)">${r.po_number}</code>
        <button class="btn btn-outline-secondary btn-sm" onclick="clearPlanPo(${r.id})" 
                title="แก้ไข/ยกเลิก PO" style="padding: 0px 4px;font-size: 10px;height: 20px;line-height: 1;">
          <i class="bi bi-pencil"></i> แก้ไข
        </button>
      </div>`;
  }
  if (!canAssignPo) return '<span class="text-muted" style="font-size:12px">ยังไม่ระบุ PO</span>';

  return `
    <div class="po-assign-wrap" style="display:flex;gap:4px;align-items:center;min-width:170px">
      <select class="form-control form-control-sm po-assign-select" data-row-id="${r.id}"
              style="font-size:12px;padding:2px 4px;height:28px;">
        <option value="">กำลังโหลด...</option>
      </select>
      <button class="btn btn-teal btn-sm btn-icon po-assign-btn" data-row-id="${r.id}"
              title="ยืนยัน PO" style="padding:2px 6px;">
        <i class="bi bi-check-lg"></i>
      </button>
    </div>`;
}

/* Populate the "เลือก PO..." dropdowns for rows that still need a PO
   assigned — one lazy fetch per unassigned row (there are usually only a
   handful of these visible at once, so this stays cheap). */
async function populateAssignablePoSelects(rows) {
  const targets = rows.filter(r =>
    !r.po_number &&
    r.status !== 'Cancelled' && r.status !== 'Rescheduled' &&
    PO_TRACKED_MATERIALS.includes(r.material_name)
  );

  for (const r of targets) {
    const sel = document.querySelector(`.po-assign-select[data-row-id="${r.id}"]`);
    if (!sel) continue;
    try {
      const poMaterialName = MatMap.toSAP(r.material_name);
      const poSupplier = r.supplier_name ? SupplierMap.toSAP(r.supplier_name) : null;
      const pos = await API.getPOs(r.plant, poMaterialName, poSupplier);

      // Show every PO number for this plant+material that SAP hasn't marked
      // "Deliv. Compl." (X) — X means that PO line is formally closed, so it
      // shouldn't be offered as a call-off target even if it once had 0
      // remaining qty at some point without being flagged closed.
      const open = pos.filter(p => !p.is_completed && p.is_active !== false);
      const poMap = {};
      open.forEach(p => {
        if (!poMap[p.po_number]) {
          poMap[p.po_number] = { price: p.net_price, currency: p.currency };
        }
      });
      const entries = Object.entries(poMap).sort((a, b) => a[0].localeCompare(b[0]));

      if (entries.length === 0) {
        sel.innerHTML = '<option value="">ไม่พบ PO</option>';
      } else {
        sel.innerHTML = '<option value="">เลือก PO...</option>' +
          entries.map(([num, info]) => {
            const priceLabel = (info.price !== null && info.price !== undefined)
              ? ` (${Fmt.num(info.price, 2)} ${info.currency || ''})`.trimEnd()
              : '';
            return `<option value="${num}">${num}${priceLabel}</option>`;
          }).join('');
      }
    } catch (e) {
      sel.innerHTML = '<option value="">โหลด PO ล้มเหลว</option>';
    }
  }
}

/* Assign the PO chosen in a row's dropdown: deduct the row's quantity from
   po_data (converting IBC → KG for Bioligo (IMO) via toPoDeductionKg, shared
   in js/app.js), then lock the po_number onto the calloff_plan row. */
async function assignPoToRow(id) {
  const sel = document.querySelector(`.po-assign-select[data-row-id="${id}"]`);
  const poNumber = sel?.value;
  if (!poNumber) {
    Toast.warning('กรุณาเลือกหมายเลข PO ก่อนยืนยัน');
    return;
  }

  const row = histRows.find(r => r.id === id);
  if (!row) return;

  const btn = document.querySelector(`.po-assign-btn[data-row-id="${id}"]`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  }

  try {
    const poMaterialName = MatMap.toSAP(row.material_name);
    const deductKg = toPoDeductionKg(row.material_name, row.quantity);
    await API.updatePoPendingQty(poNumber, poMaterialName, deductKg);
    await API.updateCalloffPlan(id, { po_number: poNumber });
    Toast.success(`ระบุ PO ${poNumber} ให้กับรายการนี้เรียบร้อย`);
    await loadHistoryList();
  } catch (e) {
    Toast.error('ระบุ PO ไม่สำเร็จ: ' + e.message);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
  }
}

/* ── Clear PO Assignment ────────────────────────────────────── */
window.clearPlanPo = async function(id) {
  const row = histRows.find(r => r.id === id);
  if (!row || !row.po_number) return;

  Modal.confirm(
    'ยืนยันการแก้ไข PO',
    `ต้องการยกเลิกการผูก PO <b>${row.po_number}</b> สำหรับรายการนี้ใช่หรือไม่?<br><span class="text-danger" style="font-size:12px">* ยอดที่ถูกหักไปจะถูกคืนกลับเข้าโควตา PO เดิมทันที</span>`,
    async () => {
      try {
        const poMaterialName = MatMap.toSAP(row.material_name);
        const refundKg = toPoDeductionKg(row.material_name, row.quantity);
        
        // 1. Refund the quantity to po_data
        await API.refundPoPendingQty(row.po_number, poMaterialName, refundKg);
        
        // 2. Clear po_number on calloff_plan
        await API.updateCalloffPlan(id, { po_number: null });
        
        Toast.success('ยกเลิกการผูก PO เรียบร้อย');
        await loadHistoryList();
      } catch (e) {
        Toast.error('แก้ไข PO ไม่สำเร็จ: ' + e.message);
      }
    }
  );
};

/* ── Selection ──────────────────────────────────────────────── */
window.toggleSelect = function (id, checked) {
  if (checked) histSelected.add(id);
  else histSelected.delete(id);
  // Highlight row
  document.querySelectorAll(`input[data-id="${id}"]`).forEach(cb => {
    cb.closest('tr')?.classList.toggle('row-selected', checked);
  });
  updateSelectionCount();
};

function selectAll(checked) {
  histRows.forEach(r => {
    if (checked) histSelected.add(r.id);
    else histSelected.delete(r.id);
  });
  document.querySelectorAll('#hist-table-body input[type=checkbox]').forEach(cb => {
    cb.checked = checked;
    cb.closest('tr')?.classList.toggle('row-selected', checked);
  });
  updateSelectionCount();
}

function updateSelectionCount() {
  const count = histSelected.size;
  const el = document.getElementById('hist-selected-count');
  if (el) el.textContent = count;
  const btnEmail = document.getElementById('btn-create-email');
  if (btnEmail) btnEmail.disabled = count === 0;
}

/* ── Events ─────────────────────────────────────────────────── */
function bindHistoryEvents() {
  // Filters apply immediately on change/input — no need to press "กรอง".
  document.getElementById('sel-hist-plant')?.addEventListener('change', async function () {
    await updateSupplierFilterDropdown(this.value);
    loadHistoryList();
  });
  document.getElementById('sel-hist-supplier')?.addEventListener('change', loadHistoryList);
  document.getElementById('sel-hist-mailstatus')?.addEventListener('change', loadHistoryList);
  document.getElementById('inp-hist-from')?.addEventListener('change', loadHistoryList);
  document.getElementById('inp-hist-to')?.addEventListener('change', loadHistoryList);
  document.getElementById('btn-hist-filter')?.addEventListener('click', loadHistoryList);
  document.getElementById('btn-hist-reset')?.addEventListener('click', () => {
    document.getElementById('form-hist-filter')?.reset();
    activeMaterial = "";
    renderMaterialTabs();
    setDefaultFilters();
    updateSupplierFilterDropdown(null);
    loadHistoryList();
  });
  document.getElementById('chk-select-all')?.addEventListener('change', function () {
    selectAll(this.checked);
  });
  document.getElementById('btn-create-email')?.addEventListener('click', prepareEmail);
}

/* ── Prepare Email ──────────────────────────────────────────── */
async function prepareEmail() {
  if (histSelected.size === 0) {
    Toast.warning('กรุณาเลือกรายการก่อนสร้างอีเมล');
    return;
  }

  // Gather selected items
  const selectedItems = histRows.filter(r => histSelected.has(r.id))
    .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date));

  if (selectedItems.length === 0) return;

  // Verify all selected items are from the same Plant and same Supplier
  const firstPlant = selectedItems[0].plant;
  const firstSupplier = selectedItems[0].supplier_name;

  const samePlant = selectedItems.every(item => item.plant === firstPlant);
  const sameSupplier = selectedItems.every(item => item.supplier_name === firstSupplier);

  if (!samePlant) {
    Toast.warning('กรุณาเลือกเฉพาะรายการที่เป็นโรงงานเดียวกัน');
    return;
  }
  if (!sameSupplier) {
    Toast.warning('กรุณาเลือกเฉพาะรายการที่เป็น Supplier เดียวกัน');
    return;
  }

  // Save to sessionStorage and navigate
  const currentUser = Auth.getUser();
  sessionStorage.setItem('email_items',    JSON.stringify(selectedItems));
  sessionStorage.setItem('email_plant',    firstPlant);
  sessionStorage.setItem('email_supplier', firstSupplier);
  sessionStorage.setItem('email_type',     'supplier');
  sessionStorage.setItem('email_sender_name',  currentUser?.name  || '');
  sessionStorage.setItem('email_sender_email', currentUser?.email || '');

  // Cache-bust: this exact URL (no query string) gets aggressively cached
  // by the browser, which previously caused the page to silently render a
  // stale copy of the script (looked like it was permanently stuck on
  // "กำลังสร้างอีเมล...").
  window.location.href = 'email-preview-supplier.html?t=' + Date.now();
}