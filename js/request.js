/* ============================================================
   MATCALL - Request Screen (เรียกเข้าวัตถุดิบ)
   Basket / Cart workflow
   ============================================================ */

let reqPlants = [];
let basket    = [];   // in-memory cart items
let reqRows   = [];   // existing saved plans
let currentPage = 1;
const pageSize  = 20;

// MatMap, SupplierMap, BIOLIGO_IMO_KG_PER_IBC and toPoDeductionKg now live in
// js/app.js (shared with history.js, which assigns PO numbers post-creation).

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setDefaultDeliveryDate();
  bindFormEvents();
  await loadMasterData();
  
  // Set default filter values: Next Monday (จ) to Next Saturday (ส)
  const today = new Date();
  const currentDay = today.getDay(); // 0: Sun, 1: Mon, ...
  
  // Next Monday calculation
  // If today is Sunday (0), next Monday is tomorrow (+1).
  // If today is Monday-Saturday (1-6), next Monday is next week's Monday (7 - day + 1)
  const daysToNextMonday = currentDay === 0 ? 1 : 7 - currentDay + 1;
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + daysToNextMonday);
  
  // Next Saturday is 5 days after next Monday
  const nextSaturday = new Date(nextMonday);
  nextSaturday.setDate(nextMonday.getDate() + 5);
  
  const fromEl = document.getElementById('inp-date-from');
  const toEl = document.getElementById('inp-date-to');
  if (fromEl) fromEl.value = nextMonday.toISOString().split('T')[0];
  if (toEl) toEl.value = nextSaturday.toISOString().split('T')[0];
  
  // Default plant filter to logged-in user's plant
  const user = Auth.getUser();
  if (user && user.plant_code) {
    const filterPlantEl = document.getElementById('sel-filter-plant');
    if (filterPlantEl) filterPlantEl.value = user.plant_code;
  }
  
  await loadRequestList();
  bindBasketEvents();
  renderBasket();

  // ── Department access guard ─────────────────────────────────
  if (Auth.isReadOnly('request.html') || Auth.isWarehouse()) {
    applyRequestReadOnly();
  }
});

/**
 * ซ่อนปุ่ม action ทั้งหมด (สำหรับ แผนกคลัง ที่เป็น read-only บน request.html)
 */
function applyRequestReadOnly() {
  // Form add-to-basket button
  ['btn-add-basket', 'btn-clear-basket', 'btn-save-all'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Basket delete buttons (rendered dynamically – use MutationObserver)
  const hideBasketActions = () => {
    document.querySelectorAll('.btn-remove-basket, .basket-action-btn, #basket-action-row').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.btn-delete-row, .btn-cancel-row').forEach(el => {
      el.style.display = 'none';
    });
  };
  hideBasketActions();
  const observer = new MutationObserver(hideBasketActions);
  const basket = document.getElementById('basket-list');
  if (basket) observer.observe(basket, { childList: true, subtree: true });
  const reqTable = document.getElementById('req-table-body');
  if (reqTable) observer.observe(reqTable, { childList: true, subtree: true });

  // Show read-only banner
  const formCard = document.querySelector('.form-card') || document.querySelector('.card');
  if (formCard) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.3);border-radius:10px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#4f46e5;font-weight:600';
    banner.innerHTML = '<i class="bi bi-eye-fill"></i> โหมดดูข้อมูล (View Only) — แผนกคลังวัตถุดิบสามารถดูข้อมูลได้แต่ไม่สามารถแก้ไขได้';
    formCard.insertAdjacentElement('beforebegin', banner);
  }
}


function setDefaultDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const el = document.getElementById('inp-delivery-date');
  if (el) el.value = d.toISOString().substring(0, 10);
}

/* ── Load Masters ──────────────────────────────────────────── */
async function loadMasterData() {
  try {
    reqPlants = await API.getPlants();
    populateSelect(
      document.getElementById('sel-plant'),
      reqPlants, 'plant_code', 'plant_name', 'เลือกโรงงาน...'
    );
    populateSelect(
      document.getElementById('sel-filter-plant'),
      reqPlants, 'plant_code', 'plant_name', 'ทั้งหมด', true
    );
    // Load all unique materials for filter
    const mats = await API.getMaterials();
    populateSelect(
      document.getElementById('sel-filter-material'),
      mats, '', '', 'ทั้งหมด'
    );
    
    // Auto-select plant if user is restricted to a plant
    const user = Auth.getUser();
    if (user && user.plant_code) {
      const selPlant = document.getElementById('sel-plant');
      if (selPlant) {
        selPlant.value = user.plant_code;
        selPlant.disabled = true;
        selPlant.dispatchEvent(new Event('change'));
      }
      const selFilterPlant = document.getElementById('sel-filter-plant');
      if (selFilterPlant) {
        selFilterPlant.value = user.plant_code;
        selFilterPlant.disabled = true;
      }
    }
  } catch (e) {
    Toast.error('โหลดข้อมูลโรงงานไม่สำเร็จ: ' + e.message);
  }
}

/* ── Cascade: Plant → Material → Supplier ─────────────────── */
function getQtyInputHtml(material, dateStr = '', includeUnitLabel = true) {
  const cssClass = dateStr ? 'inp-qty-item' : '';
  const nameId = dateStr ? '' : 'id="inp-quantity"';
  const dataAttr = dateStr ? `data-date="${dateStr}"` : '';
  const style = dateStr ? 'style="max-width: 120px;"' : '';

  let unitLabel = 'kg';
  if (material.includes("Bioligo")) {
    unitLabel = 'IBC';
  }
  const unitSpan = includeUnitLabel
    ? `<span class="input-group-text-plain" style="font-size: 13px; font-weight: 500; min-width: 25px; margin-left: 2px;">${unitLabel}</span>`
    : '';

  const isHfsOrSugar = material === "HFS42%" || material === "Liquid Sugar" || material.includes("120001687") || material.includes("120001688");
  const isBioligoImo = material === "Bioligo IMO" || material.includes("120001474");
  if (isHfsOrSugar) {
    return `
      <select class="form-control ${cssClass}" ${nameId} ${dataAttr} ${style} required>
        <option value="">เลือกจำนวน...</option>
        <option value="15000">15,000</option>
        <option value="30000">30,000</option>
        <option value="60000">60,000</option>
      </select>
      ${unitSpan}
    `;
  } else if (isBioligoImo) {
    // IBC-based quantity; each option also shows the KG equivalent that will
    // actually be deducted from the PO (1 IBC = 1,350 KG).
    return `
      <select class="form-control ${cssClass}" ${nameId} ${dataAttr} ${style} required>
        <option value="">เลือกจำนวน...</option>
        <option value="4">4 (${Fmt.num(4 * BIOLIGO_IMO_KG_PER_IBC)} KG)</option>
        <option value="5">5 (${Fmt.num(5 * BIOLIGO_IMO_KG_PER_IBC)} KG)</option>
        <option value="6">6 (${Fmt.num(6 * BIOLIGO_IMO_KG_PER_IBC)} KG)</option>
      </select>
      ${unitSpan}
    `;
  } else if (material === "CO2" || material.includes("120001706")) {
    return `
      <select class="form-control ${cssClass}" ${nameId} ${dataAttr} ${style} required>
        <option value="18000">18,000</option>
      </select>
      ${unitSpan}
    `;
  } else {
    return `
      <input type="number" class="form-control ${cssClass}" ${nameId} ${dataAttr} ${style} min="0.01" step="0.01" required placeholder="0.00">
      ${unitSpan}
    `;
  }
}

// Default quantity to pre-fill a basket row with when adding multiple dates
// at once (no inline per-date form anymore — quantity is fixed up directly
// in the basket). Fixed-option materials default to their first/smallest
// option so the basket <select> shows a value that actually matches; free
// entry / Bioligo materials are left at 0 for the user to fill in.
function getDefaultBasketQty(materialDb) {
  if (materialDb === 'CO2') return 18000;
  if (materialDb === 'HFS42%' || materialDb === 'Liquid Sugar') return 15000;
  return 0;
}

// Reusable Tank ID <select> markup.
// dateStr === '' -> single-date mode (id="inp-tank-id")
// dateStr set    -> multi-date mode (class="inp-tank-item", data-date="...")
function getTankInputHtml(dateStr = '', isRequired = false) {
  const cssClass = dateStr ? 'inp-tank-item' : '';
  const idAttr = dateStr ? '' : 'id="inp-tank-id"';
  const dataAttr = dateStr ? `data-date="${dateStr}"` : '';
  const style = dateStr ? 'style="width: 100%;"' : 'style="max-width: 180px;"';
  return `
    <select class="form-control ${cssClass}" ${idAttr} ${dataAttr} ${style} ${isRequired ? 'required' : ''}>
      <option value="">${isRequired ? 'เลือก Tank ID...' : 'เลือก Tank ID (ไม่บังคับ)...'}</option>
      <option value="ถังลินเด้ (CH0011)">ถังลินเด้ (CH0011)</option>
      <option value="ถังแพรกซ์แอร์ (CH0111)">ถังแพรกซ์แอร์ (CH0111)</option>
      <option value="ถังแพรกซ์แอร์ (CH0112)">ถังแพรกซ์แอร์ (CH0112)</option>
      <option value="ถังแพรกซ์แอร์ (PCH0111)">ถังแพรกซ์แอร์ (PCH0111)</option>
    </select>
  `;
}

function updateDynamicInputs(material) {
  const qtyContainer = document.getElementById('qty-input-container');
  const tankContainer = document.getElementById('tank-input-container');
  const tankGroup = document.getElementById('tank-id-group');
  if (!tankContainer) return;

  // 1. Quantity Input Setup (unit is shown separately via #sel-unit in single-date mode)
  if (qtyContainer) {
    qtyContainer.innerHTML = getQtyInputHtml(material, '', false);
  }

  // 2. Tank ID Input Setup (single-date mode only; multi-date mode renders its
  // own per-date Tank ID dropdowns inside #qty-multi-container instead)
  if (material === "CO2" || material.includes("120001706")) {
    const plant = document.getElementById('sel-plant')?.value;
    const isRequired = (plant === "PT");

    if (tankGroup) {
      tankGroup.style.display = 'block';
      const label = tankGroup.querySelector('.form-label');
      if (label) {
        if (isRequired) label.classList.add('required');
        else label.classList.remove('required');
      }
    }
    tankContainer.innerHTML = getTankInputHtml('', isRequired);
  } else {
    if (tankGroup) {
      tankGroup.style.display = 'none';
      const label = tankGroup.querySelector('.form-label');
      if (label) label.classList.remove('required');
    }
    tankContainer.innerHTML = `
      <input type="text" class="form-control" id="inp-tank-id" placeholder="T-01">
    `;
  }
}

// MatMap and SupplierMap now live in js/app.js (shared with history.js).

function bindFormEvents() {
  // Plant change → load materials
  document.getElementById('sel-plant')?.addEventListener('change', async function () {
    const plant = this.value;
    const selMat = document.getElementById('sel-material');
    const selSup = document.getElementById('sel-supplier');
    selMat.innerHTML = '<option value="">กำลังโหลด...</option>';
    selSup.innerHTML = '<option value="">เลือกวัตถุดิบก่อน</option>';
    clearQuota();
    updateDynamicInputs('');
    if (!plant) {
      selMat.innerHTML = '<option value="">เลือกโรงงานก่อน</option>';
      return;
    }
    try {
      let mats = await API.getMaterials(plant);
      if (mats.length === 0) {
        mats = await API.getMaterials('PT');
      }
      selMat.innerHTML = '<option value="">เลือกวัตถุดิบ...</option>';
      mats.forEach(m => {
        const sapName = MatMap.toSAP(m);
        const opt = document.createElement('option');
        opt.value = sapName;
        opt.textContent = sapName;
        selMat.appendChild(opt);
      });
    } catch (e) {
      selMat.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>';
      Toast.error('โหลดวัตถุดิบไม่สำเร็จ');
    }
  });

  // Material change → load suppliers
  document.getElementById('sel-material')?.addEventListener('change', async function () {
    const plant    = document.getElementById('sel-plant').value;
    const material = this.value;
    const selSup   = document.getElementById('sel-supplier');
    selSup.innerHTML = '<option value="">กำลังโหลด...</option>';
    clearQuota();

    // Auto populate unit based on SAP material name
    let sapUnit = 'kg';
    if (material.includes('Bioligo')) {
      sapUnit = 'IBC';
    }
    const unitEl = document.getElementById('sel-unit');
    const unitMultiEl = document.getElementById('sel-unit-multi');
    if (unitEl) unitEl.value = sapUnit;
    if (unitMultiEl) unitMultiEl.value = sapUnit;

    updateDynamicInputs(MatMap.toDB(material));
    if (!material) {
      selSup.innerHTML = '<option value="">เลือกวัตถุดิบก่อน</option>';
      return;
    }
    try {
      let suppliers = [];
      const poMaterialName = material;
      const pos = await API.getPOs(plant, poMaterialName);
      const activePos = pos.filter(p => !p.is_completed && p.is_active !== false);

      if (activePos.length > 0) {
        const uniqueNames = [...new Set(activePos.map(p => p.supplier_name))].filter(Boolean);
        const dbSups = await API.getSupplierByMaterial(plant, MatMap.toDB(material));
        const fallbackSups = dbSups.length > 0 ? dbSups : await API.getSupplierByMaterial('PT', MatMap.toDB(material));

        uniqueNames.forEach(name => {
          const matched = fallbackSups.find(fs => SupplierMap.toSAP(fs.supplier_name) === SupplierMap.toSAP(name));
          suppliers.push({
            supplier_name: name,
            remaining_quota: matched ? matched.remaining_quota : null,
            supplier_email: matched ? matched.supplier_email : null
          });
        });
      }

      if (suppliers.length === 0) {
        let dbSups = await API.getSupplierByMaterial(plant, MatMap.toDB(material));
        if (dbSups.length === 0) {
          dbSups = await API.getSupplierByMaterial('PT', MatMap.toDB(material));
        }
        suppliers = dbSups;
      }

      selSup.innerHTML = '<option value="">เลือก Supplier...</option>';
      suppliers.forEach(s => {
        const sapSupplier = SupplierMap.toSAP(s.supplier_name);
        const opt = document.createElement('option');
        opt.value = sapSupplier;
        opt.textContent = sapSupplier;
        opt.dataset.quota = s.remaining_quota ?? '';
        selSup.appendChild(opt);
      });
      
      // Auto-select Linde if material is CO2 Gas (with code)
      if (material === "120001706 CO2 Gas" || material === "CO2 Gas") {
        selSup.value = "ลินเด้ (ประเทศไทย)";
        selSup.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      selSup.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>';
      Toast.error('โหลด Supplier ไม่สำเร็จ');
    }
  });

  // Supplier change → show quota & load POs
  document.getElementById('sel-supplier')?.addEventListener('change', async function () {
    const plant = document.getElementById('sel-plant').value;
    const material = document.getElementById('sel-material').value;
    const supplierName = this.value;
    
    const opt   = this.options[this.selectedIndex];
    const quota = opt?.dataset?.quota;
    const el    = document.getElementById('quota-info');
    
    if (el) {
      if (!supplierName || quota === '' || quota === undefined || quota === null) {
        el.textContent = '';
        el.className = 'quota-info';
      } else {
        const q = parseFloat(quota);
        el.className = `quota-info${q <= 0 ? ' warn' : ''}`;
        el.innerHTML = `<i class="bi bi-info-circle"></i> Remaining quota: <strong>${Fmt.num(q)}</strong>`;
      }
    }
  });

  // Unit synchronizers
  document.getElementById('sel-unit')?.addEventListener('change', function() {
    const selMulti = document.getElementById('sel-unit-multi');
    if (selMulti) selMulti.value = this.value;
  });
  document.getElementById('sel-unit-multi')?.addEventListener('change', function() {
    const selSingle = document.getElementById('sel-unit');
    if (selSingle) selSingle.value = this.value;
  });

  // Date selection change → toggle single quantity input; for multiple
  // dates, no inline per-date form is shown — each date gets added straight
  // to the Basket with a default quantity, and is edited there instead.
  document.getElementById('inp-delivery-date')?.addEventListener('change', function () {
    const datesVal = this.value.trim();
    const dates = datesVal ? datesVal.split(',').map(d => d.trim()).filter(Boolean) : [];

    const qtySingle = document.getElementById('qty-single-group');
    const inpSingle = document.getElementById('inp-quantity');
    // Normalize to the short DB form ('CO2', 'HFS42%', 'Liquid Sugar', ...) so
    // matching stays correct regardless of whether the select's raw value has
    // the SAP code prefix or not.
    const material = MatMap.toDB(document.getElementById('sel-material').value);
    const isCO2 = material === 'CO2';
    const tankGroup = document.getElementById('tank-id-group');
    const multiHint = document.getElementById('multi-date-hint');

    if (dates.length <= 1) {
      if (qtySingle) qtySingle.style.display = 'block';
      if (multiHint) multiHint.style.display = 'none';
      if (inpSingle) {
        inpSingle.required = true;
      }
      if (tankGroup) tankGroup.style.display = isCO2 ? 'block' : 'none';
    } else {
      if (qtySingle) qtySingle.style.display = 'none';
      if (multiHint) multiHint.style.display = 'block';
      if (inpSingle) {
        inpSingle.required = false;
        inpSingle.value = ''; // clear hidden single input value
      }
      // Tank ID (for CO2) is edited per-row in the basket instead of here.
      if (tankGroup) tankGroup.style.display = 'none';
    }
  });

  // Form submit → add to basket
  document.getElementById('form-basket-item')?.addEventListener('submit', addToBasket);

  // Filter events — apply as soon as any filter changes, no need to press
  // "กรอง". The button/reset stay wired too as an explicit manual re-run.
  document.getElementById('btn-filter-apply')?.addEventListener('click', loadRequestList);
  document.getElementById('btn-filter-reset')?.addEventListener('click', resetFilters);
  document.getElementById('inp-search')?.addEventListener('input', debounce(loadRequestList, 400));
  document.getElementById('sel-filter-plant')?.addEventListener('change', loadRequestList);
  document.getElementById('sel-filter-material')?.addEventListener('change', loadRequestList);
  document.getElementById('sel-filter-status')?.addEventListener('change', loadRequestList);
  document.getElementById('inp-date-from')?.addEventListener('change', loadRequestList);
  document.getElementById('inp-date-to')?.addEventListener('change', loadRequestList);

  // Bulk operations for saved list
  document.getElementById('chk-req-select-all')?.addEventListener('change', function () {
    const checked = this.checked;
    document.querySelectorAll('.chk-req-item').forEach(cb => {
      cb.checked = checked;
    });
    updateBulkDeleteState();
  });

  document.getElementById('req-table-body')?.addEventListener('change', function (e) {
    if (e.target.classList.contains('chk-req-item')) {
      updateBulkDeleteState();
    }
  });

  document.getElementById('btn-bulk-delete')?.addEventListener('click', handleBulkDelete);
}

function clearQuota() {
  const el = document.getElementById('quota-info');
  if (el) { el.textContent = ''; el.className = 'quota-info'; }
}

/* ── Add to Basket ─────────────────────────────────────────── */
function addToBasket(e) {
  e.preventDefault();

  const plant    = document.getElementById('sel-plant').value;
  const material = document.getElementById('sel-material').value;
  const supplier = document.getElementById('sel-supplier').value;
  const dateVal  = document.getElementById('inp-delivery-date').value;

  if (!plant || !material || !supplier || !dateVal) {
    Toast.warning('กรุณากรอก โรงงาน / วัตถุดิบ / Supplier / วันส่งมอบ ให้ครบ');
    return;
  }

  const dates = dateVal.split(',').map(d => d.trim()).filter(Boolean);
  if (dates.length === 0) {
    Toast.warning('กรุณาเลือกวันส่งมอบ');
    return;
  }

  // Normalized so this matches regardless of whether the select's raw value
  // has the SAP code prefix (e.g. "120001706 CO2 Gas") or not ("CO2 Gas").
  const isCO2 = MatMap.toDB(material) === 'CO2';
  const isTankRequired = isCO2 && plant === 'PT';

  // Single-date mode: Tank ID comes from the one global field.
  // Multi-date mode: Tank ID is validated per-date further down instead.
  if (dates.length <= 1 && isTankRequired) {
    const tankId = document.getElementById('inp-tank-id')?.value?.trim();
    if (!tankId) {
      Toast.warning('กรุณาเลือก Tank ID');
      return;
    }
  }

  const plantObj = reqPlants.find(p => p.plant_code === plant);
  const unit = document.getElementById('sel-unit')?.value || 'kg';
  const itemsToAdd = [];

  if (dates.length <= 1) {
    const qty = parseFloat(document.getElementById('inp-quantity').value);
    if (!qty || qty <= 0) {
      Toast.warning('กรุณากรอกจำนวนเรียกเข้า');
      return;
    }
    const tankId = isCO2 ? (document.getElementById('inp-tank-id')?.value?.trim() || null) : null;
    itemsToAdd.push({ date: dates[0], qty, tankId });
  } else {
    // Multiple dates: no inline per-date inputs anymore — add one basket
    // row per date with a sensible default quantity, then let the user
    // adjust quantity / Tank ID directly in the basket table.
    const materialDb = MatMap.toDB(material);
    const defaultQty = getDefaultBasketQty(materialDb);
    dates.forEach(d => {
      itemsToAdd.push({ date: d, qty: defaultQty, tankId: null });
    });
  }

  itemsToAdd.forEach(item => {
    basket.push({
      plant,
      plant_name:    plantObj?.plant_name ?? plant,
      material_name: material,
      supplier_name: supplier,
      quantity:      item.qty,
      unit,
      delivery_date: item.date,
      tank_id:       item.tankId,
      // PO number is no longer chosen at creation time — production dept
      // doesn't need to know it. Warehouse assigns it later on history.html.
      po_number:     null,
      target_week:   null,
      remark:        null,
    });
  });

  renderBasket();

  // Clear transient fields; keep plant/material/supplier for quick repeat entry
  if (document.getElementById('inp-quantity')) {
    document.getElementById('inp-quantity').value = '';
    document.getElementById('inp-quantity').dispatchEvent(new Event('input'));
  }

  // Clear multi inputs
  document.querySelectorAll('.inp-qty-item').forEach(inp => {
    inp.value = '';
  });
  document.querySelectorAll('.inp-tank-item').forEach(sel => {
    sel.value = '';
  });

  if (document.getElementById('inp-tank-id')) document.getElementById('inp-tank-id').value = '';

  // Reset date picker to empty and trigger change to reset quantity layout
  const dateInput = document.getElementById('inp-delivery-date');
  if (dateInput) {
    dateInput.value = '';
    dateInput.dispatchEvent(new Event('change'));
  }

  Toast.success(`เพิ่มลงตะกร้าแล้ว ${itemsToAdd.length} รายการ`);
}

function renderBasketQtyInput(item, i) {
  // Normalized so this matches regardless of whether item.material_name has
  // the SAP code prefix (e.g. "120001706 CO2 Gas") or not ("CO2 Gas").
  const mat = MatMap.toDB(item.material_name);
  if (mat === "HFS42%" || mat === "Liquid Sugar") {
    return `
      <select class="form-control form-control-sm d-inline-block" style="width: 85px; padding: 2px 6px; font-size: 12px; height: 30px;" onchange="updateBasketQty(${i}, this.value)">
        <option value="15000" ${item.quantity === 15000 ? 'selected' : ''}>15,000</option>
        <option value="30000" ${item.quantity === 30000 ? 'selected' : ''}>30,000</option>
        <option value="60000" ${item.quantity === 60000 ? 'selected' : ''}>60,000</option>
      </select>
    `;
  } else if (mat === "Bioligo IMO") {
    return `
      <select class="form-control form-control-sm d-inline-block" style="width: 60px; padding: 2px 6px; font-size: 12px; height: 30px;" onchange="updateBasketQty(${i}, this.value)">
        <option value=""></option>
        <option value="4" ${item.quantity === 4 ? 'selected' : ''}>4</option>
        <option value="5" ${item.quantity === 5 ? 'selected' : ''}>5</option>
        <option value="6" ${item.quantity === 6 ? 'selected' : ''}>6</option>
      </select>
    `;
  } else if (mat === "CO2") {
    return `
      <select class="form-control form-control-sm d-inline-block" style="width: 75px; padding: 2px 6px; font-size: 12px; height: 30px;" onchange="updateBasketQty(${i}, this.value)">
        <option value="18000" ${item.quantity === 18000 ? 'selected' : ''}>18,000</option>
      </select>
    `;
  } else {
    return `
      <input type="number" class="form-control form-control-sm d-inline-block" style="width: 75px; padding: 2px 6px; font-size: 12px; height: 30px;" 
             value="${item.quantity}" min="0.01" step="0.01" oninput="updateBasketQty(${i}, this.value)">
    `;
  }
}

window.updateBasketQty = function (i, val) {
  if (basket[i]) {
    basket[i].quantity = parseFloat(val) || 0;
    // Re-render so the Bioligo (IMO) "(X,XXX KG)" hint (and any other
    // quantity-derived display) stays in sync with the new value.
    renderBasket();
  }
};

function renderBasketTankInput(item, i) {
  if (MatMap.toDB(item.material_name) === "CO2") {
    return `
      <select class="form-control form-control-sm" style="width: 130px; padding: 2px 6px; font-size: 12px; height: 30px;" onchange="updateBasketTankId(${i}, this.value)">
        <option value=""></option>
        <option value="ถังลินเด้ (CH0011)" ${item.tank_id === 'ถังลินเด้ (CH0011)' ? 'selected' : ''}>ถังลินเด้ (CH0011)</option>
        <option value="ถังแพรกซ์แอร์ (CH0111)" ${item.tank_id === 'ถังแพรกซ์แอร์ (CH0111)' ? 'selected' : ''}>ถังแพรกซ์แอร์ (CH0111)</option>
        <option value="ถังแพรกซ์แอร์ (CH0112)" ${item.tank_id === 'ถังแพรกซ์แอร์ (CH0112)' ? 'selected' : ''}>ถังแพรกซ์แอร์ (CH0112)</option>
        <option value="ถังแพรกซ์แอร์ (PCH0111)" ${item.tank_id === 'ถังแพรกซ์แอร์ (PCH0111)' ? 'selected' : ''}>ถังแพรกซ์แอร์ (PCH0111)</option>
      </select>
    `;
  }
  return '-';
}

window.updateBasketTankId = function (i, val) {
  if (basket[i]) {
    basket[i].tank_id = val || null;
  }
};

/* ── Render Basket ─────────────────────────────────────────── */
function renderBasket() {
  const tbody    = document.getElementById('basket-table-body');
  const countEl  = document.getElementById('basket-count');
  const btnSave  = document.getElementById('btn-save-basket');
  const btnClear = document.getElementById('btn-clear-basket');

  if (countEl)  countEl.textContent  = basket.length;
  if (btnSave)  btnSave.disabled     = basket.length === 0;
  if (btnClear) btnClear.disabled    = basket.length === 0;

  if (!basket.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-cart" style="font-size:2rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ตะกร้าว่างอยู่</div>
        <div class="empty-sub">กรอกข้อมูลและกด "เพิ่มใส่ตะกร้า"</div>
      </div></td></tr>`;
    return;
  }

  const hasCo2 = basket.some(item => MatMap.toDB(item.material_name) === "CO2");
  const thTank = document.getElementById('th-basket-tank-id');
  if (thTank) thTank.style.display = hasCo2 ? '' : 'none';

  tbody.innerHTML = basket.map((item, i) => `
    <tr class="${MatMap.toDB(item.material_name) !== 'CO2' ? 'hide-tank' : ''}">
      <td class="td-center" style="color:var(--text-muted);font-size:12px">${i + 1}</td>
      <td><strong>${item.plant_name}</strong></td>
      <td style="white-space:nowrap">${Fmt.dateWithDay(item.delivery_date)}</td>
      <td>${item.material_name}</td>
      <td>${item.supplier_name}</td>
      <td style="display: ${hasCo2 ? '' : 'none'}">${renderBasketTankInput(item, i)}</td>
      <td class="td-right">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px; flex-wrap: wrap;">
          ${renderBasketQtyInput(item, i)}
          <small class="text-muted" style="text-align: left;">${item.unit ?? ''}</small>
          ${MatMap.toDB(item.material_name) === 'Bioligo IMO' ? `<small class="text-muted" style="white-space: nowrap;">(${Fmt.num(toPoDeductionKg(item.material_name, item.quantity))} KG)</small>` : ''}
        </div>
      </td>
      <td class="td-center">
        <button class="btn btn-danger btn-sm btn-icon"
                title="ลบออกจากตะกร้า"
                onclick="removeFromBasket(${i})">
          <i class="bi bi-trash-fill"></i>
        </button>
      </td>
    </tr>`).join('');
}

window.removeFromBasket = function (i) {
  basket.splice(i, 1);
  renderBasket();
};

/* ── Basket Events ─────────────────────────────────────────── */
function bindBasketEvents() {
  document.getElementById('btn-save-basket')?.addEventListener('click', saveBasket);
  document.getElementById('btn-clear-basket')?.addEventListener('click', () => {
    Modal.confirm(
      'ล้างตะกร้า',
      'ต้องการลบรายการในตะกร้าทั้งหมดใช่หรือไม่?',
      () => { basket = []; renderBasket(); },
      'warning'
    );
  });
}

/* ── Save All Basket Items ─────────────────────────────────── */
async function saveBasket() {
  if (!basket.length) return;

  // Multi-date adds land in the basket with default/blank quantity (and no
  // Tank ID for CO2) since that's now the only place they're edited — catch
  // anything still unfilled before it gets saved.
  const missingQty = basket.some(item => !item.quantity || item.quantity <= 0);
  if (missingQty) {
    Toast.warning('กรุณาระบุจำนวนให้ครบทุกรายการในตะกร้าก่อนบันทึก');
    return;
  }
  const missingTank = basket.some(item => {
    if (MatMap.toDB(item.material_name) !== 'CO2') return false;
    if (item.plant !== 'PT') return false;
    return !item.tank_id;
  });
  if (missingTank) {
    Toast.warning('กรุณาเลือก Tank ID ให้ครบทุกรายการ CO2 (โรงงาน PT) ในตะกร้าก่อนบันทึก');
    return;
  }

  const btn = document.getElementById('btn-save-basket');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  let successCount = 0;
  const errors     = [];

  for (const item of basket) {
    try {
      await API.createCalloffPlan({
        plant:         item.plant,
        material_name: MatMap.toDB(item.material_name),
        supplier_name: SupplierMap.toDB(item.supplier_name),
        delivery_date: item.delivery_date,
        quantity:      item.quantity,
        unit:          item.unit,
        tank_id:       item.tank_id,
        po_number:     item.po_number,
        target_week:   item.target_week,
        remark:        item.remark,
        title:         `${item.material_name} - ${item.supplier_name} - ${item.delivery_date}`,
        requester_name: Auth.getUser()?.name || '-',
      });

      // No PO deduction here anymore — production dept doesn't assign a PO
      // at creation time. Warehouse picks the PO for each row on
      // history.html, which is when the po_data quantity actually gets
      // deducted (see assignPoToRow() in js/history.js).

      successCount++;
    } catch (e) {
      errors.push(`${item.material_name}: ${e.message}`);
    }
  }

  btn.innerHTML = '<i class="bi bi-check-lg"></i> บันทึกทั้งหมด';
  btn.disabled  = false;

  if (errors.length === 0) {
    Toast.success(`บันทึกสำเร็จ ${successCount} รายการ`);
    basket = [];
    renderBasket();
    await loadRequestList();
  } else {
    if (successCount > 0) {
      Toast.warning(`บันทึกสำเร็จ ${successCount} รายการ, ล้มเหลว ${errors.length} รายการ`);
    } else {
      Toast.error('บันทึกไม่สำเร็จ: ' + errors[0]);
    }
  }
}

/* ── Existing Plans List ───────────────────────────────────── */
async function loadRequestList() {
  showSpinner('req-table-body', 'กำลังโหลดรายการ...');

  const plant    = document.getElementById('sel-filter-plant')?.value;
  const status   = document.getElementById('sel-filter-status')?.value;
  const material = document.getElementById('sel-filter-material')?.value;
  const dateFrom = document.getElementById('inp-date-from')?.value;
  const dateTo   = document.getElementById('inp-date-to')?.value;
  const search   = document.getElementById('inp-search')?.value?.trim().toLowerCase();

  try {
    let data = await API.getCalloffPlans({
      plant:        plant    && plant    !== 'all' ? plant    : null,
      status:       status   && status   !== 'all' ? status   : null,
      materialName: material && material !== 'all' ? material : null,
      dateFrom:     dateFrom || null,
      dateTo:       dateTo   || null,
    });

    if (search) {
      data = data.filter(r =>
        (r.material_name ?? '').toLowerCase().includes(search) ||
        (r.supplier_name ?? '').toLowerCase().includes(search) ||
        (r.plant         ?? '').toLowerCase().includes(search)
      );
    }

    reqRows = data;
    currentPage = 1;
    renderRequestTablePage();
    document.getElementById('req-row-count').textContent = data.length;
  } catch (e) {
    Toast.error('โหลดรายการไม่สำเร็จ: ' + e.message);
  }
}

function renderRequestTablePage() {
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageRows = reqRows.slice(startIdx, endIdx);
  renderRequestTable(pageRows, startIdx);
  renderPagination();
}

function renderPagination() {
  const container = document.getElementById('req-pagination');
  if (!container) return;

  const totalPages = Math.ceil(reqRows.length / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      <i class="bi bi-chevron-left"></i> Prev
    </button>
    <span class="page-info">หน้า <strong>${currentPage}</strong> จาก <strong>${totalPages}</strong></span>
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Next <i class="bi bi-chevron-right"></i>
    </button>
  `;
}

window.changePage = function (page) {
  const totalPages = Math.ceil(reqRows.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderRequestTablePage();
};

function renderRequestTable(rows, startIdx = 0) {
  const tbody = document.getElementById('req-table-body');
  if (!tbody) return;

  // Reset select all check box and bulk delete button
  const chkAll = document.getElementById('chk-req-select-all');
  if (chkAll) chkAll.checked = false;
  updateBulkDeleteState();

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-inbox" style="font-size:2rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ยังไม่มีรายการ</div>
        <div class="empty-sub">เพิ่มรายการในตะกร้าแล้วกด "บันทึกทั้งหมด"</div>
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
    <tr>
      <td class="table-check" style="text-align:center;">
        <input type="checkbox" class="chk-req-item" data-id="${r.id}" style="accent-color:var(--teal)">
      </td>
      <td class="td-center" style="color:var(--text-muted);font-size:12px">${startIdx + i + 1}</td>
      <td style="color:var(--text-muted);font-size:13px;white-space:nowrap">${Fmt.dateTime(r.created_at)}</td>
      <td style="${voidStyle}">${Fmt.dateWithDay(r.delivery_date)}</td>
      <td style="${voidStyle}"><strong>${r.plant ?? '-'}</strong></td>
      <td style="${voidStyle}">${r.material_name ?? '-'}${tagBadge}</td>
      <td style="${voidStyle}">${r.supplier_name ?? '-'}</td>
      <td class="td-right" style="${voidStyle}">
        ${isVoided ? '-' : `<strong>${Fmt.num(r.quantity)}</strong> <small class="text-muted">${r.unit ?? ''}</small>`}
      </td>
      <td class="td-center" style="${voidStyle}">
        ${isVoided ? '-' : (r.tank_id ? `<code style="font-size:12px">${r.tank_id}</code>` : '-')}
      </td>
      <td class="td-center">${Fmt.statusBadge(r.status)}</td>
      <td class="td-center">
        <div class="table-actions">
          ${!isVoided ? `<button class="btn btn-outline btn-sm btn-icon"
                  title="เลื่อน/ยกเลิกรายการ" onclick="openReschedule(${r.id})">
            <i class="bi bi-calendar2-week"></i>
          </button>` : ''}
          <button class="btn btn-danger btn-sm btn-icon"
                  title="ลบ" onclick="confirmDelete(${r.id})">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* Thin wrapper: look up the row from our own local list, then hand off
   to the shared modal in js/app.js (also used nowhere else — request.html
   is where production dept owns and amends their call-off plans). */
window.openReschedule = function (id) {
  const row = reqRows.find(r => r.id === id);
  if (row) openRescheduleModal(row, loadRequestList);
};

function updateBulkDeleteState() {
  const selected = document.querySelectorAll('.chk-req-item:checked');
  const btn = document.getElementById('btn-bulk-delete');
  const countEl = document.getElementById('req-selected-count');
  
  if (countEl) countEl.textContent = selected.length;
  if (btn) btn.disabled = selected.length === 0;

  // Sync select all checkbox
  const allCheckbox = document.getElementById('chk-req-select-all');
  const items = document.querySelectorAll('.chk-req-item');
  if (allCheckbox && items.length > 0) {
    allCheckbox.checked = selected.length === items.length;
  }
}

async function handleBulkDelete() {
  const selected = document.querySelectorAll('.chk-req-item:checked');
  if (selected.length === 0) return;

  const ids = Array.from(selected).map(cb => parseInt(cb.dataset.id));
  
  Modal.confirm(
    'ยืนยันการลบแบบกลุ่ม',
    `ต้องการลบรายการที่เลือกทั้งหมดจำนวน ${ids.length} รายการใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
    async () => {
      const btn = document.getElementById('btn-bulk-delete');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังลบ...';
      }
      
      let successCount = 0;
      const errors = [];
      
      for (const id of ids) {
        try {
          await API.deleteCalloffPlan(id);
          successCount++;
        } catch (e) {
          errors.push(e.message);
        }
      }
      
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-trash"></i> ลบที่เลือก (<span id="req-selected-count">0</span>)`;
      }
      
      if (errors.length === 0) {
        Toast.success(`ลบรายการสำเร็จทั้งหมด ${successCount} รายการ`);
      } else {
        Toast.warning(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${errors.length} รายการ`);
      }
      
      await loadRequestList();
    }
  );
}

function resetFilters() {
  document.getElementById('sel-filter-plant').value    = '';
  document.getElementById('sel-filter-material').value = '';
  document.getElementById('sel-filter-status').value   = '';
  document.getElementById('inp-date-from').value       = '';
  document.getElementById('inp-date-to').value         = '';
  document.getElementById('inp-search').value          = '';
  loadRequestList();
}

/* ── Delete ────────────────────────────────────────────────── */
window.confirmDelete = function (id) {
  Modal.confirm(
    'ยืนยันการลบ',
    'ต้องการลบรายการนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้',
    async () => {
      try {
        await API.deleteCalloffPlan(id);
        Toast.success('ลบรายการสำเร็จ');
        await loadRequestList();
      } catch (e) {
        Toast.error('ลบไม่สำเร็จ: ' + e.message);
      }
    }
  );
};
