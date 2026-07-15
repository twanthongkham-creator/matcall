/* ============================================================
   MATCALL - PO Management Screen (ข้อมูล PO จาก SAP)
   ============================================================ */

let poRows = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Populate Plant Filter based on Master Plant List
  try {
    const plants = await API.getPlants();
    const selPlant = document.getElementById('sel-po-plant');
    populateSelect(selPlant, plants, 'plant_code', 'plant_name', 'ทั้งหมด', true);
  } catch (e) {
    console.error("Failed loading plants:", e);
  }

  // Bind UI Events
  document.getElementById('btn-sap-import')?.addEventListener('click', importFromSap);
  document.getElementById('file-po-import')?.addEventListener('change', handleFileUpload);
  
  // Filter Event Listeners
  document.getElementById('inp-po-search')?.addEventListener('input', renderPOTable);
  document.getElementById('sel-po-plant')?.addEventListener('change', renderPOTable);
  document.getElementById('sel-po-material')?.addEventListener('change', renderPOTable);
  document.getElementById('sel-po-status')?.addEventListener('change', renderPOTable);
  document.getElementById('btn-po-reset-filter')?.addEventListener('click', resetFilters);

  // Load and Render Current POs
  await loadPOs();
});

/* ── Load POs ──────────────────────────────────────────────── */
async function loadPOs() {
  showSpinner('po-table-body', 'กำลังโหลดข้อมูล PO...');
  try {
    poRows = await API.getPOs();
    renderPOTable();
  } catch (e) {
    Toast.error("โหลดข้อมูล PO ล้มเหลว: " + e.message);
  }
}

/* ── Render PO Table ───────────────────────────────────────── */
function renderPOTable() {
  const tbody = document.getElementById('po-table-body');
  if (!tbody) return;

  const searchVal = document.getElementById('inp-po-search').value.trim().toLowerCase();
  const plantVal = document.getElementById('sel-po-plant').value;
  const materialVal = document.getElementById('sel-po-material').value;
  const statusVal = document.getElementById('sel-po-status').value;

  // Apply filters
  let filtered = poRows;
  if (searchVal) {
    filtered = filtered.filter(p => p.po_number.toLowerCase().includes(searchVal));
  }
  if (plantVal && plantVal !== 'all') {
    filtered = filtered.filter(p => p.plant === plantVal);
  }
  if (materialVal && materialVal !== 'all') {
    filtered = filtered.filter(p => p.material_name === materialVal);
  }
  if (statusVal && statusVal !== 'all') {
    if (statusVal === 'active') {
      filtered = filtered.filter(p => !p.is_completed);
    } else if (statusVal === 'completed') {
      filtered = filtered.filter(p => p.is_completed);
    }
  }

  // Update total count
  document.getElementById('po-count').textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-file-earmark-spreadsheet" style="font-size:2.5rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ไม่มีข้อมูลใบสั่งซื้อ PO</div>
        <div class="empty-sub">กดปุ่ม "ดึงจาก SAP อัตโนมัติ" เพื่อนำเข้าไฟล์ Excel</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const statusText = p.is_completed ? 'เสร็จสิ้น (Closed)' : 'ยังไม่ครบ (Active)';
    const statusClass = p.is_completed ? 'po-closed' : 'po-active';
    const statusIcon = p.is_completed ? '<i class="bi bi-check-circle-fill"></i>' : '<i class="bi bi-arrow-repeat"></i>';
    
    return `
      <tr>
        <td class="td-center" style="color:var(--text-muted);font-size:12px">${idx + 1}</td>
        <td><strong>${p.po_number}</strong></td>
        <td>${p.po_item}</td>
        <td><span class="badge bg-secondary">${p.plant}</span></td>
        <td><strong>${p.supplier_name || '-'}</strong></td>
        <td><code>${p.material_code}</code></td>
        <td><strong>${p.material_name}</strong></td>
        <td class="td-right">${Fmt.num(p.order_qty)}</td>
        <td class="td-right" style="color: ${p.qty_pending > 0 ? '#0c8a7e' : 'var(--text-muted)'}; font-weight: 700;">
          ${Fmt.num(p.qty_pending)}
        </td>
        <td class="td-center">
          <span class="po-status-badge ${statusClass}">${statusIcon} ${statusText}</span>
        </td>
        <td class="td-center">${p.doc_date ? Fmt.date(p.doc_date) : '-'}</td>
      </tr>
    `;
  }).join('');
}

/* ── Reset Filters ─────────────────────────────────────────── */
function resetFilters() {
  document.getElementById('inp-po-search').value = '';
  document.getElementById('sel-po-plant').value = 'all';
  document.getElementById('sel-po-material').value = 'all';
  document.getElementById('sel-po-status').value = 'active';
  renderPOTable();
}

/* ── Import from SAP ───────────────────────────────────────── */
async function importFromSap() {
  const btn = document.getElementById('btn-sap-import');
  const oldText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> กำลังดึงข้อมูล...';

  try {
    // Fetch directly from server root C:\xampp\htdocs\matcall\PO_matcall.XLSX
    const response = await fetch('PO_matcall.XLSX');
    if (!response.ok) {
      throw new Error("ไม่พบไฟล์ PO_matcall.XLSX ใน Root Web Directory ของคุณ");
    }
    const buffer = await response.arrayBuffer();
    await parseAndSaveExcel(buffer);
    Toast.success("ดึงข้อมูลและอัปเดต PO จาก SAP สำเร็จ!");
  } catch (e) {
    Toast.error("นำเข้าล้มเหลว: " + e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = oldText;
  }
}

/* ── File Upload Handler ────────────────────────────────────── */
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    try {
      const buffer = evt.target.result;
      await parseAndSaveExcel(buffer);
      Toast.success("อัปโหลดและประมวลผล PO จากไฟล์สำเร็จ!");
      // Reset input file value
      e.target.value = '';
    } catch (err) {
      Toast.error("อัปโหลดล้มเหลว: " + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ── Parse & Save Excel ─────────────────────────────────────── */
async function parseAndSaveExcel(arrayBuffer) {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("ไฟล์ Excel ไม่มีชีตที่ใช้งานได้");
  }

  const range = XLSX.utils.decode_range(sheet['!ref']);
  const pos = [];

  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const getVal = (c) => {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      return cell ? cell.v : null;
    };

    const poNum = getVal(0);
    if (!poNum) continue;

    const poItem = String(getVal(1) || '');
    const docDateVal = getVal(3);
    const rawMaterial = String(getVal(16) || '');
    const shortText = String(getVal(17) || '');
    const rawPlant = String(getVal(18) || '');
    const orderQty = parseFloat(getVal(21) || 0);
    const qtyPending = parseFloat(getVal(23) || 0);
    const rawVendor = String(getVal(12) || '');
    const delivCompl = String(getVal(34) || '').trim();

    // Clean material code (strip leading zeros)
    const matCode = rawMaterial.replace(/^0+/, '');

    // Map material to exact SAP name
    let materialName = '';
    if (matCode === '120001706') materialName = 'CO2 Gas';
    else if (matCode === '120001687') materialName = 'น้ำตาลเหลว';
    else if (matCode === '120001688') materialName = 'High Fructose Syrup 42%';
    else continue; // Skip other materials

    // Map plant
    let plant = '';
    if (rawPlant === '3201') plant = 'PT';
    else if (rawPlant === '3202') plant = 'CH';
    else if (rawPlant === '3203') plant = 'KR';
    else if (rawPlant === '3204') plant = 'NS';
    else if (rawPlant === '3205') plant = 'SR';
    else continue; // Skip other plants

    // Map vendor to MATCALL database supplier names
    const supplierName = mapVendorToSupplier(rawVendor);

    // Date formatting
    let docDate = null;
    if (docDateVal) {
      if (docDateVal instanceof Date) {
        docDate = docDateVal.toISOString().split('T')[0];
      } else if (typeof docDateVal === 'number') {
        const jsDate = new Date(Math.round((docDateVal - 25569) * 86400 * 1000));
        docDate = jsDate.toISOString().split('T')[0];
      } else {
        docDate = String(docDateVal).split('T')[0];
      }
    }

    pos.push({
      po_number: String(poNum),
      po_item: poItem,
      plant: plant,
      material_code: matCode,
      material_name: materialName,
      supplier_name: supplierName,
      order_qty: orderQty,
      qty_pending: qtyPending,
      is_completed: (delivCompl === 'X' || qtyPending <= 0),
      doc_date: docDate
    });
  }

  if (pos.length === 0) {
    throw new Error("ไม่พบรายการข้อมูล PO ที่ตรงกับวัตถุดิบและโรงงานตามเงื่อนไข (3201-3205, 120001706, 120001687, 120001688)");
  }

  // Upload to Supabase / Local storage fallback
  await API.savePOs(pos);
  await loadPOs();
}

function mapVendorToSupplier(vendorName) {
  if (!vendorName) return '';
  const v = vendorName.toString().trim().toLowerCase();
  
  if (v.includes('linde') || v.includes('ลินเด้') || v.includes('special gas') || v.includes('Թ')) {
    return 'ลินเด้ (ประเทศไทย)';
  }
  if (v.includes('psc') || v.includes('พี.เอส.ซี') || v.includes('สตาร์ช') || v.includes('p.s.c') || v.includes('ʵ') || v.includes('ôѡ')) {
    return 'พี.เอส.ซี.สตาร์ช โปรดักส์';
  }
  if (v.includes('เจ้าคุณ') || v.includes('chaokhun') || v.includes('Ҥس')) {
    return 'บจก.เจ้าคุณเกษตรพืชผล';
  }
  if (v.includes('แปซิฟิก') || v.includes('pacific') || v.includes('ừԿԡ')) {
    return 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น';
  }
  if (v.includes('ไทยรุ่งเรือง') || v.includes('thai roong') || v.includes('รุ่งเรือง') || v.includes('ͧص')) {
    return 'ไทยรุ่งเรืองอุตสาหกรรม';
  }
  if (v.includes('purechem') || v.includes('เพียวเคม')) {
    return 'Purechem Co., Ltd.';
  }
  if (v.includes('wgc')) {
    return 'WGC';
  }
  return vendorName; // fallback
}
