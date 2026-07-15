/* ============================================================
   MATCALL - History Screen (ประวัติและสถานะ)
   ============================================================ */

let histRows = [];
let histSelected = new Set(); // selected IDs
let activeMaterial = "";
let histMaterials = [];

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
  } catch (e) {
    Toast.error('โหลดประวัติไม่สำเร็จ: ' + e.message);
  }
}

/* ── Render Table ───────────────────────────────────────────── */
function renderHistoryTable(rows) {
  const tbody = document.getElementById('hist-table-body');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-clock-history" style="font-size:2rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ไม่พบรายการ</div>
        <div class="empty-sub">ลองปรับตัวกรองใหม่</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr class="${histSelected.has(r.id) ? 'row-selected' : ''}">
      <td class="table-check">
        <input type="checkbox" data-id="${r.id}"
          ${histSelected.has(r.id) ? 'checked' : ''}
          onchange="toggleSelect(${r.id}, this.checked)">
      </td>
      <td class="td-center" style="font-size:12px;color:var(--text-muted)">${i + 1}</td>
      <td style="white-space:nowrap">${Fmt.dateWithDay(r.delivery_date)}</td>
      <td><strong>${r.plant ?? '-'}</strong></td>
      <td>${r.material_name ?? '-'}</td>
      <td>${r.supplier_name ?? '-'}</td>
      <td class="td-right"><strong>${Fmt.num(r.quantity)}</strong> <small>${r.unit ?? ''}</small></td>
      <td class="td-center">${r.tank_id ? `<code style="font-size:12px">${r.tank_id}</code>` : '-'}</td>
      <td class="td-center">${Fmt.statusBadge(r.mail_status ?? 'Pending')}</td>
      <td class="td-center">${Fmt.statusBadge(r.receive_status ?? 'Pending')}</td>
    </tr>`).join('');
}

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
  document.getElementById('sel-hist-plant')?.addEventListener('change', function () {
    updateSupplierFilterDropdown(this.value);
  });
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
  sessionStorage.setItem('email_items',    JSON.stringify(selectedItems));
  sessionStorage.setItem('email_plant',    firstPlant);
  sessionStorage.setItem('email_supplier', firstSupplier);
  sessionStorage.setItem('email_type',     'supplier');

  window.location.href = 'email-preview-supplier.html';
}
