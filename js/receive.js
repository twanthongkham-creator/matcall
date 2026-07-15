/* ============================================================
   MATCALL - Receive Screen (บันทึกรับวัตถุดิบ)
   ============================================================ */

let rcvRows   = [];
let rcvEditId = null;
let rcvMaterialName = '';
let currentPage = 1;
const pageSize  = 20;

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  await loadReceiveMasters();
  await loadReceiveList();
  bindReceiveEvents();

  // ── Department access guard ─────────────────────────────────
  if (Auth.isReadOnly('receive.html') || Auth.isProduction()) {
    applyReceiveReadOnly();
  }
});

/**
 * ซ่อนปุ่ม action บน receive.html (สำหรับ แผนกผลิต ที่เป็น read-only)
 */
function applyReceiveReadOnly() {
  // Hide monthly email button & save button inside the receive form modal
  ['btn-monthly-email', 'btn-rcv-submit'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  // Replace "บันทึก" button in each row with "ดู" only – handled via render override
  window._receiveReadOnly = true;

  // Show read-only banner
  const firstCard = document.querySelector('.card');
  if (firstCard) {
    const banner = document.createElement('div');
    banner.style.cssText = 'background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;gap:8px;font-size:13px;color:#059669;font-weight:600';
    banner.innerHTML = '<i class="bi bi-eye-fill"></i> โหมดดูข้อมูล (View Only) — แผนกผลิตสามารถดูข้อมูลการรับได้แต่ไม่สามารถบันทึกได้';
    firstCard.insertAdjacentElement('beforebegin', banner);
  }
}


/* ── Masters ────────────────────────────────────────────────── */
async function loadReceiveMasters() {
  try {
    const plants = await API.getPlants();
    populateSelect(document.getElementById('sel-rcv-filter-plant'), plants, 'plant_code', 'plant_name', 'ทั้งหมด', true);
  } catch (e) { console.error(e); }
}

/* ── Load List ──────────────────────────────────────────────── */
async function loadReceiveList() {
  showSpinner('rcv-table-body', 'กำลังโหลด...');

  const plant      = document.getElementById('sel-rcv-filter-plant')?.value;
  const rcvStatus  = document.getElementById('sel-rcv-status')?.value;
  const month      = document.getElementById('sel-rcv-month')?.value;
  const search     = document.getElementById('inp-rcv-search')?.value?.trim().toLowerCase();

  // Build date range from selected month (current year)
  let dateFrom = null, dateTo = null;
  if (month && month !== 'all') {
    const y = new Date().getFullYear();
    const m = parseInt(month);
    dateFrom = `${y}-${String(m).padStart(2,'0')}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    dateTo = `${y}-${String(m).padStart(2,'0')}-${lastDay}`;
  }

  try {
    let data = await API.getCalloffPlans({
      plant:        plant && plant !== 'all' ? plant : null,
      receiveStatus: rcvStatus && rcvStatus !== 'all' ? rcvStatus : null,
      mailStatus:   'Sent',   // only show rows that mail was sent
      dateFrom,
      dateTo,
    });

    if (search) {
      data = data.filter(r =>
        (r.material_name ?? '').toLowerCase().includes(search) ||
        (r.supplier_name ?? '').toLowerCase().includes(search) ||
        (r.do_number     ?? '').toLowerCase().includes(search)
      );
    }

    rcvRows = data;
    currentPage = 1;
    renderReceiveTablePage();
    document.getElementById('rcv-row-count').textContent = data.length;
    updateReceiveSummary(data);
  } catch (e) {
    Toast.error('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
  }
}

/* ── Render Table Page ──────────────────────────────────────── */
function renderReceiveTablePage() {
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageRows = rcvRows.slice(startIdx, endIdx);
  renderReceiveTable(pageRows, startIdx);
  renderPagination();
}

/* ── Render Pagination ──────────────────────────────────────── */
function renderPagination() {
  const container = document.getElementById('rcv-pagination');
  if (!container) return;

  const totalPages = Math.ceil(rcvRows.length / pageSize);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changeRcvPage(${currentPage - 1})">
      <i class="bi bi-chevron-left"></i> Prev
    </button>
    <span class="page-info">หน้า <strong>${currentPage}</strong> จาก <strong>${totalPages}</strong></span>
    <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changeRcvPage(${currentPage + 1})">
      Next <i class="bi bi-chevron-right"></i>
    </button>
  `;
}

window.changeRcvPage = function (page) {
  const totalPages = Math.ceil(rcvRows.length / pageSize);
  if (page < 1 || page > totalPages) return;
  currentPage = page;
  renderReceiveTablePage();
};

/* ── Render Table ───────────────────────────────────────────── */
function renderReceiveTable(rows, startIdx = 0) {
  const tbody = document.getElementById('rcv-table-body');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="12">
      <div class="table-empty">
        <div class="empty-icon"><i class="bi bi-box-seam" style="font-size:2rem;color:var(--text-muted)"></i></div>
        <div class="empty-text">ไม่พบรายการ</div>
        <div class="empty-sub">ลองปรับตัวกรองใหม่</div>
      </div></td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => {
    const diff = r.weight_diff ?? 0;
    const diffClass = diff < 0 ? 'weight-diff-negative' : diff > 0 ? 'weight-diff-positive' : 'weight-diff-zero';
    return `<tr>
      <td class="td-center" style="font-size:12px;color:var(--text-muted)">${startIdx + i + 1}</td>
      <td style="white-space:nowrap">${Fmt.dateWithDay(r.delivery_date)}</td>
      <td><strong>${r.plant ?? '-'}</strong></td>
      <td>${r.material_name ?? '-'}</td>
      <td>${r.supplier_name ?? '-'}</td>
      <td class="td-right">${Fmt.num(r.quantity)} <small>${r.unit ?? ''}</small></td>
      <td class="td-right">${r.supplier_weight ? Fmt.num(r.supplier_weight) + ' kg' : '<span class="text-muted">-</span>'}</td>
      <td class="td-right">${r.factory_weight  ? Fmt.num(r.factory_weight)  + ' kg' : '<span class="text-muted">-</span>'}</td>
      <td class="td-right ${diffClass}">${r.weight_diff !== null ? Fmt.num(r.weight_diff) : '-'}</td>
      <td class="td-right">${r.sap_receive_weight ? Fmt.num(r.sap_receive_weight) + ' kg' : '<span class="text-muted">-</span>'}</td>
      <td class="td-center">${Fmt.statusBadge(r.receive_status ?? 'Pending')}</td>
      <td class="td-center">
        <button class="btn btn-teal btn-sm" onclick="openReceiveForm(${r.id})">
          ${window._receiveReadOnly || r.receive_status === 'SAP Completed'
            ? '<i class="bi bi-eye"></i> ดู'
            : '<i class="bi bi-pencil-fill"></i> บันทึก'}
        </button>
      </td>
    </tr>`;
  }).join('');
}

/* ── Summary Stats ──────────────────────────────────────────── */
function updateReceiveSummary(rows) {
  const received = rows.filter(r => r.receive_status === 'Received' || r.receive_status === 'SAP Completed');
  const pending  = rows.filter(r => !r.receive_status || r.receive_status === 'Pending');

  document.getElementById('rcv-stat-total')?.textContent    !== undefined &&
    (document.getElementById('rcv-stat-total').textContent    = rows.length);
  document.getElementById('rcv-stat-received')?.textContent !== undefined &&
    (document.getElementById('rcv-stat-received').textContent = received.length);
  document.getElementById('rcv-stat-pending')?.textContent  !== undefined &&
    (document.getElementById('rcv-stat-pending').textContent  = pending.length);
  document.getElementById('rcv-stat-sap')?.textContent      !== undefined &&
    (document.getElementById('rcv-stat-sap').textContent      =
      rows.filter(r => r.receive_status === 'SAP Completed').length);
}

/* ── Open Receive Form ──────────────────────────────────────── */
window.openReceiveForm = async function (id) {
  rcvEditId = id;
  try {
    const row = await DB.getById(TABLE.CALLOFF_PLAN, id);
    rcvMaterialName = row.material_name ?? '';
    // Fill read-only info
    document.getElementById('rcv-info-date').textContent     = Fmt.dateWithDay(row.delivery_date);
    document.getElementById('rcv-info-plant').textContent    = row.plant ?? '-';
    document.getElementById('rcv-info-material').textContent = row.material_name ?? '-';
    document.getElementById('rcv-info-supplier').textContent = row.supplier_name ?? '-';
    document.getElementById('rcv-info-qty').textContent      = `${Fmt.num(row.quantity)} ${row.unit ?? ''}`;

    // Fill form
    document.getElementById('inp-rcv-do').value              = row.do_number ?? '';
    document.getElementById('inp-rcv-actual-date').value     = Fmt.toInputDate(row.actual_delivery_date);
    document.getElementById('inp-rcv-supplier-w').value      = row.supplier_weight ?? '';
    document.getElementById('inp-rcv-factory-w').value       = row.factory_weight  ?? '';
    document.getElementById('inp-rcv-weight-diff').value     = row.weight_diff     ?? '';
    document.getElementById('inp-rcv-sap-w').value           = row.sap_receive_weight ?? '';
    document.getElementById('inp-rcv-sap-doc').value         = row.sap_doc_number  ?? '';
    document.getElementById('sel-rcv-rcv-status').value      = row.receive_status  ?? 'Pending';

    calcRcvWeightDiff();
    Modal.show('modal-receive-form');
  } catch (e) {
    Toast.error('โหลดข้อมูลไม่สำเร็จ: ' + e.message);
  }
};

/* ── Events ─────────────────────────────────────────────────── */
function bindReceiveEvents() {
  document.getElementById('btn-rcv-filter')?.addEventListener('click', loadReceiveList);
  document.getElementById('btn-rcv-reset')?.addEventListener('click', () => {
    document.getElementById('form-rcv-filter')?.reset();
    loadReceiveList();
  });
  document.getElementById('inp-rcv-search')?.addEventListener('input', debounce(loadReceiveList, 400));

  // Weight diff auto-calc
  document.getElementById('inp-rcv-supplier-w')?.addEventListener('input', calcRcvWeightDiff);
  document.getElementById('inp-rcv-factory-w')?.addEventListener('input', calcRcvWeightDiff);

  // Form submit
  document.getElementById('form-receive')?.addEventListener('submit', submitReceiveForm);

  // Month filter
  populateMonthSelect();

  // Send monthly report email
  document.getElementById('btn-monthly-email')?.addEventListener('click', prepareMonthlyEmail);
}

function calcRcvWeightDiff() {
  const sw = parseFloat(document.getElementById('inp-rcv-supplier-w')?.value) || 0;
  const fw = parseFloat(document.getElementById('inp-rcv-factory-w')?.value)  || 0;
  const diff = fw - sw;
  const el = document.getElementById('inp-rcv-weight-diff');
  if (el) {
    el.value = diff !== 0 ? diff : 0;
    el.style.color = diff < 0 ? '#dc2626' : diff > 0 ? '#16a34a' : '';
  }

  // Auto calculate weight for HFS42% and Liquid Sugar
  const materialText = document.getElementById('rcv-info-material')?.textContent || '';
  const material = materialText.trim().toLowerCase();
  const isSpecialMaterial = material.includes('hfs') || material.includes('sugar') || material.includes('liquid sugar');
  
  const sapWeightInput = document.getElementById('inp-rcv-sap-w');
  if (sapWeightInput) {
    if (isSpecialMaterial && sw > 0 && fw > 0) {
      const minWeight = Math.min(sw, fw);
      const calculatedVal = minWeight - 20;
      sapWeightInput.value = calculatedVal;
      sapWeightInput.style.color = '#dc2626'; // Red text color
      sapWeightInput.style.fontWeight = 'bold'; // Bold text
    } else if (!isSpecialMaterial) {
      // For other materials, clear custom styling
      sapWeightInput.style.color = '';
      sapWeightInput.style.fontWeight = '';
    }
  }
}

function populateMonthSelect() {
  const sel = document.getElementById('sel-rcv-month');
  if (!sel) return;
  const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  sel.innerHTML = '<option value="all">ทุกเดือน</option>';
  thMonths.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = i + 1;
    opt.textContent = name;
    if (i + 1 === new Date().getMonth() + 1) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ── Submit Receive Form ────────────────────────────────────── */
async function submitReceiveForm(e) {
  e.preventDefault();
  if (!rcvEditId) return;

  const btn = document.getElementById('btn-rcv-submit');
  btn.disabled = true;
  btn.textContent = 'กำลังบันทึก...';

  const payload = {
    do_number:            document.getElementById('inp-rcv-do').value || null,
    actual_delivery_date: document.getElementById('inp-rcv-actual-date').value || null,
    supplier_weight:      parseFloat(document.getElementById('inp-rcv-supplier-w').value) || null,
    factory_weight:       parseFloat(document.getElementById('inp-rcv-factory-w').value)  || null,
    weight_diff:          parseFloat(document.getElementById('inp-rcv-weight-diff').value) || null,
    sap_receive_weight:   parseFloat(document.getElementById('inp-rcv-sap-w').value)       || null,
    sap_doc_number:       document.getElementById('inp-rcv-sap-doc').value || null,
    receive_status:       document.getElementById('sel-rcv-rcv-status').value,
  };

  try {
    await API.saveGoodsReceipt(rcvEditId, payload);
    Toast.success('บันทึกการรับของสำเร็จ');
    Modal.hide('modal-receive-form');
    await loadReceiveList();
  } catch (e) {
    Toast.error('บันทึกไม่สำเร็จ: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'บันทึก';
  }
}

/* ── Monthly Email ──────────────────────────────────────────── */
async function prepareMonthlyEmail() {
  const plant = document.getElementById('sel-rcv-filter-plant').value;
  const month = document.getElementById('sel-rcv-month').value;

  if (!plant || plant === 'all') {
    Toast.warning('กรุณาเลือกโรงงานก่อนสร้างรายงาน');
    return;
  }
  if (!month || month === 'all') {
    Toast.warning('กรุณาเลือกเดือนก่อนสร้างรายงาน');
    return;
  }

  const receivedItems = rcvRows.filter(r =>
    r.receive_status === 'Received' || r.receive_status === 'SAP Completed'
  );

  if (!receivedItems.length) {
    Toast.warning('ไม่มีรายการที่รับเข้าแล้วในช่วงที่เลือก');
    return;
  }

  sessionStorage.setItem('email_items',    JSON.stringify(receivedItems));
  sessionStorage.setItem('email_plant',    plant);
  sessionStorage.setItem('email_type',     'pan');

  const thMonths = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  sessionStorage.setItem('email_month_name', thMonths[parseInt(month)]);

  window.location.href = 'email-preview-pan.html';
}
