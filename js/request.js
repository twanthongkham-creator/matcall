/* ============================================================
   MATCALL - Request Screen (เรียกเข้าวัตถุดิบ)
   Basket / Cart workflow
   ============================================================ */

let reqPlants = [];
let basket    = [];   // in-memory cart items
let reqRows   = [];   // existing saved plans
let activePOs = [];   // loaded POs for selected plant/material
let currentPage = 1;
const pageSize  = 20;

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  setDefaultDeliveryDate();
  bindFormEvents();
  await loadMasterData();
  await loadRequestList();
  bindBasketEvents();
  renderBasket();
  // FY badge
  const fyEl = document.getElementById('topbar-fy');
  if (fyEl) fyEl.innerHTML = `<i class="bi bi-calendar-week"></i> FY ${getCurrentFY()}`;
});

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
function updateDynamicInputs(material) {
  const qtyContainer = document.getElementById('qty-input-container');
  const tankContainer = document.getElementById('tank-input-container');
  const tankGroup = document.getElementById('tank-id-group');
  if (!qtyContainer || !tankContainer) return;

  // 1. Quantity Input Setup
  if (material === "HFS42%" || material === "Liquid Sugar") {
    qtyContainer.innerHTML = `
      <select class="form-control" id="inp-quantity" required>
        <option value="">เลือกจำนวน...</option>
        <option value="15000">15,000</option>
        <option value="30000">30,000</option>
        <option value="60000">60,000</option>
      </select>
    `;
  } else if (material === "Bioligo IH200") {
    qtyContainer.innerHTML = `
      <select class="form-control" id="inp-quantity" required>
        <option value=""></option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </select>
    `;
  } else if (material === "CO2") {
    qtyContainer.innerHTML = `
      <select class="form-control" id="inp-quantity" required>
        <option value="18000">18,000</option>
      </select>
    `;
  } else {
    qtyContainer.innerHTML = `
      <input type="number" class="form-control" id="inp-quantity"
             min="0.01" step="0.01" required placeholder="0.00">
    `;
  }

  // 2. Tank ID Input Setup
  if (material === "CO2") {
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
    tankContainer.innerHTML = `
      <select class="form-control" id="inp-tank-id" ${isRequired ? 'required' : ''}>
        <option value="">${isRequired ? 'เลือก Tank ID...' : 'เลือก Tank ID (ไม่บังคับ)...'}</option>
        <option value="ถังลินเด้ (CH0011)">ถังลินเด้ (CH0011)</option>
        <option value="ถังแพรกซ์แอร์ (CH0111)">ถังแพรกซ์แอร์ (CH0111)</option>
        <option value="ถังแพรกซ์แอร์ (CH0112)">ถังแพรกซ์แอร์ (CH0112)</option>
        <option value="ถังแพรกซ์แอร์ (PCH0111)">ถังแพรกซ์แอร์ (PCH0111)</option>
      </select>
    `;
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
        // Fallback to PT if selected plant has no registered materials
        mats = await API.getMaterials('PT');
      }
      selMat.innerHTML = '<option value="">เลือกวัตถุดิบ...</option>';
      mats.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        selMat.appendChild(opt);
      });
    } catch (e) {
      selMat.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>';
      Toast.error('โหลดวัตถุดิบไม่สำเร็จ');
    }
  });

  // Material change → load suppliers & POs
  document.getElementById('sel-material')?.addEventListener('change', async function () {
    const plant    = document.getElementById('sel-plant').value;
    const material = this.value;
    const selSup   = document.getElementById('sel-supplier');
    selSup.innerHTML = '<option value="">กำลังโหลด...</option>';
    clearQuota();
    updateDynamicInputs(material);

    // PO Group Handling
    const poGroup = document.getElementById('po-group');
    const selPo = document.getElementById('sel-po');
    const poBadge = document.getElementById('po-info-badge');
    const poDeduct = document.getElementById('po-deduction-wrap');

    if (poGroup && selPo) {
      if (['CO2', 'Liquid Sugar', 'HFS42%'].includes(material)) {
        poGroup.style.display = 'block';
        selPo.required = true;
        selPo.innerHTML = '<option value="">กำลังโหลด PO...</option>';
        if (poBadge) poBadge.style.display = 'none';
        if (poDeduct) poDeduct.style.display = 'none';

        try {
          activePOs = await API.getPOs(plant, material);
          const activeList = activePOs.filter(p => !p.is_completed && p.qty_pending > 0);
          selPo.innerHTML = '<option value="">เลือกหมายเลข PO...</option>';
          activeList.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.po_number;
            opt.textContent = `${p.po_number} (คงเหลือ: ${Fmt.num(p.qty_pending)} kg)`;
            selPo.appendChild(opt);
          });
          if (activeList.length === 0) {
            selPo.innerHTML = '<option value="">ไม่มีหมายเลข PO ที่ใช้งานได้</option>';
          }
        } catch (err) {
          console.error("Error loading POs:", err);
          selPo.innerHTML = '<option value="">โหลด PO ล้มเหลว</option>';
        }
      } else {
        poGroup.style.display = 'none';
        selPo.required = false;
        selPo.innerHTML = '<option value="">เลือกหมายเลข PO...</option>';
        if (poBadge) poBadge.style.display = 'none';
        if (poDeduct) poDeduct.style.display = 'none';
        activePOs = [];
      }
    }

    if (!material) {
      selSup.innerHTML = '<option value="">เลือกวัตถุดิบก่อน</option>';
      return;
    }
    try {
      let suppliers = await API.getSupplierByMaterial(plant, material);
      if (suppliers.length === 0) {
        // Fallback to PT if selected plant/material has no registered suppliers
        suppliers = await API.getSupplierByMaterial('PT', material);
      }
      selSup.innerHTML = '<option value="">เลือก Supplier...</option>';
      suppliers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.supplier_name;
        opt.textContent = s.supplier_name;
        opt.dataset.quota = s.remaining_quota ?? '';
        selSup.appendChild(opt);
      });
      
      // Auto-select Linde if material is CO2
      if (material === "CO2") {
        selSup.value = "ลินเด้ (ประเทศไทย)";
        selSup.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      selSup.innerHTML = '<option value="">โหลดไม่สำเร็จ</option>';
      Toast.error('โหลด Supplier ไม่สำเร็จ');
    }
  });

  // PO selection change
  document.getElementById('sel-po')?.addEventListener('change', function () {
    const poNum = this.value;
    const poBadge = document.getElementById('po-info-badge');
    const pendingEl = document.getElementById('po-pending-qty');
    const poDeduct = document.getElementById('po-deduction-wrap');
    
    if (!poNum) {
      if (poBadge) poBadge.style.display = 'none';
      if (poDeduct) poDeduct.style.display = 'none';
      return;
    }
    
    const selectedPo = activePOs.find(p => p.po_number === poNum);
    if (selectedPo) {
      if (poBadge) poBadge.style.display = 'block';
      if (pendingEl) pendingEl.textContent = Fmt.num(selectedPo.qty_pending);
      recalculatePoDeduction();
    }
  });

  // Quantity input change -> recalculate PO deduction
  document.getElementById('qty-input-container')?.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'inp-quantity') {
      recalculatePoDeduction();
    }
  });

  // Supplier change → show quota
  document.getElementById('sel-supplier')?.addEventListener('change', function () {
    const opt   = this.options[this.selectedIndex];
    const quota = opt?.dataset?.quota;
    const el    = document.getElementById('quota-info');
    if (!el) return;
    if (quota === '' || quota === undefined || quota === null) {
      el.textContent = '';
      el.className = 'quota-info';
      return;
    }
    const q = parseFloat(quota);
    el.className = `quota-info${q <= 0 ? ' warn' : ''}`;
    el.innerHTML = `<i class="bi bi-info-circle"></i> Remaining quota: <strong>${Fmt.num(q)}</strong>`;
  });

  // Form submit → add to basket
  document.getElementById('form-basket-item')?.addEventListener('submit', addToBasket);

  // Recalculate helper
  window.recalculatePoDeduction = function() {
    const poNum = document.getElementById('sel-po')?.value;
    const qtyInput = document.getElementById('inp-quantity');
    const deductWrap = document.getElementById('po-deduction-wrap');
    const remainingEl = document.getElementById('po-remaining-after');
    
    if (!poNum || !qtyInput) {
      if (deductWrap) deductWrap.style.display = 'none';
      return;
    }
    
    const enteredQty = parseFloat(qtyInput.value) || 0;
    const selectedPo = activePOs.find(p => p.po_number === poNum);
    
    if (selectedPo && enteredQty > 0) {
      const remaining = selectedPo.qty_pending - enteredQty;
      if (deductWrap) deductWrap.style.display = 'inline';
      if (remainingEl) {
        remainingEl.textContent = Fmt.num(remaining);
        if (remaining < 0) {
          remainingEl.style.color = '#e53e3e';
        } else {
          remainingEl.style.color = '#d97706';
        }
      }
    } else {
      if (deductWrap) deductWrap.style.display = 'none';
    }
  };

  // Filter events
  document.getElementById('btn-filter-apply')?.addEventListener('click', loadRequestList);
  document.getElementById('btn-filter-reset')?.addEventListener('click', resetFilters);
  document.getElementById('inp-search')?.addEventListener('input', debounce(loadRequestList, 400));

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
  const qty      = parseFloat(document.getElementById('inp-quantity').value);
  const unit     = document.getElementById('sel-unit').value;
  const date     = document.getElementById('inp-delivery-date').value;

  if (!plant || !material || !supplier || !qty || !date) {
    Toast.warning('กรุณากรอก โรงงาน / วัตถุดิบ / Supplier / จำนวน / วันส่งมอบ ให้ครบ');
    return;
  }

  const tankId = document.getElementById('inp-tank-id')?.value?.trim();
  if (material === "CO2" && plant === "PT" && !tankId) {
    Toast.warning('กรุณาเลือก Tank ID');
    return;
  }

  // PO selection check
  const poGroup = document.getElementById('po-group');
  const poNum = poGroup && poGroup.style.display !== 'none' ? document.getElementById('sel-po')?.value : null;
  if (poGroup && poGroup.style.display !== 'none' && !poNum) {
    Toast.warning('กรุณาเลือกหมายเลข PO');
    return;
  }

  const plantObj = reqPlants.find(p => p.plant_code === plant);
  const dates = date.split(',').map(d => d.trim()).filter(Boolean);

  if (dates.length === 0) {
    Toast.warning('กรุณาเลือกวันส่งมอบ');
    return;
  }

  dates.forEach(d => {
    basket.push({
      plant,
      plant_name:    plantObj?.plant_name ?? plant,
      material_name: material,
      supplier_name: supplier,
      quantity:      qty,
      unit,
      delivery_date: d,
      tank_id:       (material === "CO2" ? document.getElementById('inp-tank-id')?.value?.trim() : null) || null,
      po_number:     poNum,
      target_week:   null,
      remark:        null,
    });
  });

  renderBasket();

  // Clear transient fields; keep plant/material/supplier for quick repeat entry
  if (document.getElementById('inp-quantity')) {
    document.getElementById('inp-quantity').value = '';
    // trigger input event to clear the PO deduction display
    document.getElementById('inp-quantity').dispatchEvent(new Event('input'));
  }
  if (document.getElementById('inp-tank-id')) document.getElementById('inp-tank-id').value = '';
  setDefaultDeliveryDate();

  Toast.success(`เพิ่มลงตะกร้าแล้ว ${dates.length} รายการ`);
}

function renderBasketQtyInput(item, i) {
  const mat = item.material_name;
  if (mat === "HFS42%" || mat === "Liquid Sugar") {
    return `
      <select class="form-control form-control-sm d-inline-block" style="width: 85px; padding: 2px 6px; font-size: 12px; height: 30px;" onchange="updateBasketQty(${i}, this.value)">
        <option value="15000" ${item.quantity === 15000 ? 'selected' : ''}>15,000</option>
        <option value="30000" ${item.quantity === 30000 ? 'selected' : ''}>30,000</option>
        <option value="60000" ${item.quantity === 60000 ? 'selected' : ''}>60,000</option>
      </select>
    `;
  } else if (mat === "Bioligo IH200") {
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
  }
};

function renderBasketTankInput(item, i) {
  if (item.material_name === "CO2") {
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

  tbody.innerHTML = basket.map((item, i) => `
    <tr class="${item.material_name !== 'CO2' ? 'hide-tank' : ''}">
      <td class="td-center" style="color:var(--text-muted);font-size:12px">${i + 1}</td>
      <td><strong>${item.plant_name}</strong></td>
      <td style="white-space:nowrap">${Fmt.dateWithDay(item.delivery_date)}</td>
      <td>${item.material_name}</td>
      <td>${item.supplier_name}</td>
      <td>${renderBasketTankInput(item, i)}</td>
      <td class="td-right">
        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
          ${renderBasketQtyInput(item, i)}
          <small class="text-muted" style="width: 28px; text-align: left;">${item.unit ?? ''}</small>
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

  const btn = document.getElementById('btn-save-basket');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> กำลังบันทึก...';

  let successCount = 0;
  const errors     = [];

  for (const item of basket) {
    try {
      await API.createCalloffPlan({
        plant:         item.plant,
        material_name: item.material_name,
        supplier_name: item.supplier_name,
        delivery_date: item.delivery_date,
        quantity:      item.quantity,
        unit:          item.unit,
        tank_id:       item.tank_id,
        po_number:     item.po_number,
        target_week:   item.target_week,
        remark:        item.remark,
        title:         `${item.material_name} - ${item.supplier_name} - ${item.delivery_date}`,
      });
      
      // Deduct quantity from PO if selected
      if (item.po_number) {
        await API.updatePoPendingQty(item.po_number, item.material_name, item.quantity);
      }
      
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

  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td class="table-check" style="text-align:center;">
        <input type="checkbox" class="chk-req-item" data-id="${r.id}" style="accent-color:var(--teal)">
      </td>
      <td class="td-center" style="color:var(--text-muted);font-size:12px">${startIdx + i + 1}</td>
      <td>${Fmt.dateWithDay(r.delivery_date)}</td>
      <td><strong>${r.plant ?? '-'}</strong></td>
      <td>${r.material_name ?? '-'}</td>
      <td>${r.supplier_name ?? '-'}</td>
      <td class="td-right">
        <strong>${Fmt.num(r.quantity)}</strong>
        <small class="text-muted">${r.unit ?? ''}</small>
      </td>
      <td class="td-center">
        ${r.tank_id ? `<code style="font-size:12px">${r.tank_id}</code>` : '-'}
      </td>
      <td class="td-center">${Fmt.statusBadge(r.status)}</td>
      <td class="td-center">
        <div class="table-actions">
          <button class="btn btn-danger btn-sm btn-icon"
                  title="ลบ" onclick="confirmDelete(${r.id})">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </td>
    </tr>`).join('');
}

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
