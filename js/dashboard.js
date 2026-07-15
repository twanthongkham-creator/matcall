/* ============================================================
   MATCALL - Dashboard
   Chart.js bar + pie charts, FY summary
   ============================================================ */

let dashFYData    = [];
let dashBarChart  = null;
let dashPieChart  = null;
let dashQuotaChart = null;
let dashMode      = 'plan';  // 'plan' | 'actual'
let activeMaterialFilter = 'all';
let suppliersMaster = [];
let supplierQuotas = [];
let monthlyChartMode = 'plan'; // 'plan' | 'actual'

window.toggleMonthlyChartMode = function(btn, mode) {
  monthlyChartMode = mode;
  document.querySelectorAll('.btn-monthly-mode').forEach(b => {
    b.classList.remove('active', 'btn-primary');
    b.classList.add('btn-ghost');
  });
  btn.classList.add('active', 'btn-primary');
  btn.classList.remove('btn-ghost');
  filterAndRenderDashboard();
};

/* ── Init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  const fy = getCurrentFY();
  const labelEl = document.getElementById('dash-fy-label');
  if (labelEl) {
    labelEl.textContent = `ปีงบประมาณ ${fy - 1}/${fy}`;
  }

  await loadDashMasters(fy);
  await loadDashData();
  bindDashEvents();
});

/* ── Populate Dynamic Filter Dropdowns ───────────────────────── */
function populateFilterDropdowns() {
  // 1. Month dropdown
  const monthSel = document.getElementById('sel-dash-month');
  if (monthSel) {
    const thMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                      'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    
    // Extract unique months from dashFYData
    const uniqueMonths = new Set();
    dashFYData.forEach(r => {
      if (r.delivery_date) {
        const parts = r.delivery_date.substring(0, 7).split('-'); // "YYYY-MM"
        if (parts.length === 2) {
          uniqueMonths.add(r.delivery_date.substring(0, 7));
        }
      }
    });

    const sortedMonths = Array.from(uniqueMonths).sort();
    
    monthSel.innerHTML = '';
    const optAll = document.createElement('option');
    optAll.value = 'all';
    optAll.textContent = 'ทุกเดือน (ภาพรวมทั้งปี)';
    monthSel.appendChild(optAll);

    const currentMonthIdx = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthStr = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
    let hasSelected = false;

    sortedMonths.forEach(ym => {
      const [y, m] = ym.split('-').map(Number);
      const opt = document.createElement('option');
      opt.value = ym;
      opt.textContent = `${thMonths[m - 1]} ${y}`;
      if (ym === currentMonthStr) {
        opt.selected = true;
        hasSelected = true;
      }
      monthSel.appendChild(opt);
    });

    if (!hasSelected && sortedMonths.length > 0) {
      monthSel.value = 'all';
    }
  }

  // 2. Supplier dropdown
  const supSel = document.getElementById('sel-dash-supplier');
  if (supSel) {
    const uniqueSups = [...new Set(dashFYData.map(r => r.supplier_name).filter(Boolean))].sort();
    supSel.innerHTML = '<option value="all">ทั้งหมด</option>';
    uniqueSups.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      supSel.appendChild(opt);
    });
  }

  // 3. Material dropdown
  const matSel = document.getElementById('sel-dash-material');
  if (matSel) {
    const uniqueMats = [...new Set(dashFYData.map(r => r.material_name).filter(Boolean))].sort();
    matSel.innerHTML = '<option value="all">ทั้งหมด</option>';
    uniqueMats.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      matSel.appendChild(opt);
    });
  }
}

/* ── Masters ─────────────────────────────────────────────────── */
async function loadDashMasters(fy) {
  try {
    const plants = await API.getPlants();
    populateSelect(document.getElementById('sel-dash-plant'), plants, 'plant_code', 'plant_name', 'ทั้งหมด', true);
    
    // Load suppliers master for quota calculations
    suppliersMaster = await DB.getAll(TABLE.MASTER_SUPPLIER);
    supplierQuotas = await API.getQuotas();
  } catch (e) { console.error(e); }
}

/* ── Load Data ───────────────────────────────────────────────── */
async function loadDashData() {
  const plant = document.getElementById('sel-dash-plant')?.value;
  const fy = getCurrentFY();

  try {
    // Fetch all records for the selected plant (no supplier/material filter at API level)
    // so we can dynamically populate Month, Supplier, and Material dropdowns based on actual records
    dashFYData = await API.getFYData(
      fy,
      plant && plant !== 'all' ? plant : null,
      null,
      null
    );

    // Populate dropdowns with options that actually have data
    populateFilterDropdowns();

    filterAndRenderDashboard();
  } catch (e) {
    Toast.error('โหลด Dashboard ไม่สำเร็จ: ' + e.message);
  }
}

/* ── Filter & Render Dashboard (Month, Supplier & Material focus) ── */
function filterAndRenderDashboard() {
  const selectedPlant = document.getElementById('sel-dash-plant')?.value || '';
  const selectedMonthVal = document.getElementById('sel-dash-month')?.value; // "YYYY-MM" or "all"
  const selectedSupplier = document.getElementById('sel-dash-supplier')?.value || 'all';
  const selectedMaterial = document.getElementById('sel-dash-material')?.value || 'all';

  if (!selectedMonthVal) return;

  let activeData = dashFYData;

  // Filter Plant
  if (selectedPlant && selectedPlant !== 'all') {
    activeData = activeData.filter(r => r.plant === selectedPlant);
  }

  // Filter Supplier
  if (selectedSupplier && selectedSupplier !== 'all') {
    activeData = activeData.filter(r => r.supplier_name === selectedSupplier);
  }

  // Filter Material
  if (selectedMaterial && selectedMaterial !== 'all') {
    activeData = activeData.filter(r => r.material_name === selectedMaterial);
  }

  // Populate sub-filter buttons under charts based on the filtered data
  renderMaterialFilterButtons(activeData);

  // Apply sub-filter button if active
  if (activeMaterialFilter !== 'all') {
    activeData = activeData.filter(r => (r.material_name ?? '').toLowerCase() === activeMaterialFilter.toLowerCase());
  }

  updateKPICards(activeData);

  const toggleWrap = document.getElementById('monthly-chart-toggle-wrap');

  if (selectedMonthVal === 'all') {
    if (toggleWrap) toggleWrap.style.display = 'flex';
    buildMonthlyChartData(activeData);
    buildPieChartData(activeData);
    buildQuotaChartData(activeData);

    const chartTitleEl = document.querySelector('.chart-title');
    if (chartTitleEl) chartTitleEl.innerHTML = '<i class="bi bi-bar-chart-fill"></i> ยอดเปรียบเทียบ แผน vs รับจริง รายเดือน';
  } else {
    if (toggleWrap) toggleWrap.style.display = 'none';
    const [selYear, selMonth] = selectedMonthVal.split('-').map(Number);

    let monthData = activeData.filter(r => {
      if (!r.delivery_date) return false;
      const parts = r.delivery_date.substring(0, 10).split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return m === selMonth && y === selYear;
    });

    buildDailyColumnChart(monthData, selYear, selMonth);
    buildPieChartData(monthData);
    buildQuotaChartData(monthData);

    const chartTitleEl = document.querySelector('.chart-title');
    if (chartTitleEl) chartTitleEl.innerHTML = '<i class="bi bi-bar-chart-fill"></i> ยอดเปรียบเทียบ แผน vs รับจริง รายวัน';
  }
}

/* ── Material Filter Buttons ────────────────────────────────── */
function renderMaterialFilterButtons(monthData) {
  const container = document.getElementById('dash-material-filters');
  if (!container) return;

  // Get unique materials in this month's data
  const materials = [...new Set(monthData.map(r => r.material_name).filter(Boolean))].sort();

  // If active filter is no longer available in the new month, reset to 'all'
  if (activeMaterialFilter !== 'all' && !materials.some(m => m.toLowerCase() === activeMaterialFilter.toLowerCase())) {
    activeMaterialFilter = 'all';
  }

  let html = `<button class="btn btn-sm ${activeMaterialFilter === 'all' ? 'btn-primary' : 'btn-outline-teal'}" onclick="setMaterialFilter('all')">ทั้งหมด</button>`;
  materials.forEach(mat => {
    const isActive = activeMaterialFilter.toLowerCase() === mat.toLowerCase();
    html += `<button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-teal'}" style="margin-left:4px" onclick="setMaterialFilter('${mat}')">${mat}</button>`;
  });

  container.innerHTML = html;
}

window.setMaterialFilter = function(material) {
  activeMaterialFilter = material;
  filterAndRenderDashboard();
};

/* ── KPI Cards ───────────────────────────────────────────────── */
function updateKPICards(data) {
  const totalPlan   = data.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const totalActual = data.reduce((s, r) => s + (r.sap_receive_weight ?? 0), 0);
  const totalItems  = data.length;
  const received    = data.filter(r => r.receive_status === 'Received' || r.receive_status === 'SAP Completed').length;
  const pending     = data.filter(r => !r.receive_status || r.receive_status === 'Pending').length;

  setEl('kpi-total-plan',   Fmt.num(totalPlan));
  setEl('kpi-total-actual', Fmt.num(totalActual));
  setEl('kpi-total-items',  totalItems);
  setEl('kpi-received',     received);
  setEl('kpi-pending',      pending);

  const pct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0;
  setEl('kpi-fulfillment',  pct + '%');
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Bar Chart (Monthly) ─────────────────────────────────────── */
function buildMonthlyChartData(data) {
  const fy = getCurrentFY();
  const thMonths = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
                    'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const months = [];
  for (let i = 0; i < 12; i++) {
    const month = i < 3 ? i + 10 : i - 2;  // Oct=10, Nov=11, Dec=12, Jan=1...Sep=9
    const year  = i < 3 ? fy - 1 : fy;
    const label = `${thMonths[month - 1]} ${String(year).substring(2)}`;
    
    // Sum plan and actual quantities timezone-safely
    const monthData = data.filter(r => {
      if (!r.delivery_date) return false;
      const parts = r.delivery_date.substring(0, 10).split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return m === month && y === year;
    });

    const planQty = monthData.reduce((s, r) => s + (r.quantity ?? 0), 0);
    const actualQty = monthData.reduce((s, r) => s + (r.sap_receive_weight ?? 0), 0);
    months.push({ label, planQty, actualQty });
  }

  const labels  = months.map(m => m.label);

  const ctx = document.getElementById('chart-bar')?.getContext('2d');
  if (!ctx) return;

  if (dashBarChart) dashBarChart.destroy();

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  let datasetLabel = '';
  let datasetData = [];
  let borderColor = '';
  let startColor = '';

  if (monthlyChartMode === 'plan') {
    datasetLabel = 'แผน (Quantity)';
    datasetData = months.map(m => m.planQty);
    borderColor = 'rgba(37, 99, 235, 1)';
    startColor = 'rgba(37, 99, 235, 0.3)';
  } else {
    datasetLabel = 'รับจริง (SAP)';
    datasetData = months.map(m => m.actualQty);
    borderColor = 'rgba(16, 185, 129, 1)';
    startColor = 'rgba(16, 185, 129, 0.3)';
  }

  gradient.addColorStop(0, startColor);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  dashBarChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: datasetLabel,
          data: datasetData,
          borderColor: borderColor,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 4,
          pointRadius: 3.5,
          pointHoverRadius: 7,
          pointBackgroundColor: borderColor,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: "'Noto Sans Thai', sans-serif", size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${Fmt.num(ctx.raw)} kg`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: v => Fmt.num(v), font: { size: 10 } },
          title: { display: true, text: 'น้ำหนัก (kg)', font: { size: 11, weight: 'bold' } }
        },
      },
    },
  });
}

/* ── Column Chart (Daily) ────────────────────────────────────── */
function buildDailyColumnChart(data, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const labels = [];
  const planData = [];
  const actualData = [];

  for (let day = 1; day <= daysInMonth; day++) {
    labels.push(String(day));
    
    // Sum plan and actual quantities for this specific day timezone-safely
    const dayData = data.filter(r => {
      if (!r.delivery_date) return false;
      const parts = r.delivery_date.substring(0, 10).split('-');
      if (parts.length < 3) return false;
      const d = parseInt(parts[2]);
      return d === day;
    });

    const planSum = dayData.reduce((s, r) => s + (r.quantity ?? 0), 0);
    const actualSum = dayData.reduce((s, r) => s + (r.sap_receive_weight ?? 0), 0);
    
    planData.push(planSum);
    actualData.push(actualSum);
  }

  const ctx = document.getElementById('chart-bar')?.getContext('2d');
  if (!ctx) return;

  if (dashBarChart) dashBarChart.destroy();

  dashBarChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'แผน (Quantity)',
          data: planData,
          borderColor: 'rgba(29,58,112,1)',
          backgroundColor: 'rgba(29,58,112,0.06)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 2.5,
          pointHoverRadius: 6,
        },
        {
          label: 'รับจริง (SAP)',
          data: actualData,
          borderColor: 'rgba(12,138,126,1)',
          backgroundColor: 'rgba(12,138,126,0.06)',
          fill: true,
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 2.5,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: "'Noto Sans Thai', sans-serif", size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${Fmt.num(ctx.raw)} kg`,
          },
        },
      },
      scales: {
        x: { 
          grid: { display: false }, 
          ticks: { font: { size: 10 } },
          title: { display: true, text: 'วันที่', font: { size: 11, weight: 'bold' } }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: v => Fmt.num(v), font: { size: 10 } },
          title: { display: true, text: 'น้ำหนัก (kg)', font: { size: 11, weight: 'bold' } }
        },
      },
    },
  });
}

/* ── Pie Chart (Supplier Share) ─────────────────────────────── */
function buildPieChartData(data) {
  const field = dashMode === 'plan' ? 'quantity' : 'sap_receive_weight';
  const grouped = {};
  data.forEach(r => {
    const key = r.supplier_name ?? 'Unknown';
    grouped[key] = (grouped[key] ?? 0) + (r[field] ?? 0);
  });

  const labels = Object.keys(grouped);
  const values = Object.values(grouped);

  const colors = [
    '#1d3a70','#0c8a7e','#2563eb','#7c3aed','#db2777',
    '#ea580c','#16a34a','#ca8a04','#0891b2','#64748b',
  ];

  const ctx = document.getElementById('chart-pie')?.getContext('2d');
  if (!ctx) return;

  if (dashPieChart) dashPieChart.destroy();

  if (!labels.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    return;
  }

  dashPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: "'Noto Sans Thai', sans-serif", size: 11 },
            padding: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return `${ctx.label}: ${Fmt.num(ctx.raw)} kg (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/* ── Quota Compliance Chart ──────────────────────────────────── */
function buildQuotaChartData(monthData) {
  const ctx = document.getElementById('chart-quota')?.getContext('2d');
  if (!ctx) return;

  if (dashQuotaChart) dashQuotaChart.destroy();

  const currentMaterial = activeMaterialFilter;
  const selectedMonthVal = document.getElementById('sel-dash-month')?.value || 'all';
  // Get active quota and actual weights for each supplier based on selected month
  let targetSuppliers = [];
  const groupedActuals = {};
  const materialTotals = {};

  // Initialize actuals mapping
  for (const s of (suppliersMaster || [])) {
    groupedActuals[s.id] = 0;
  }

  // Summarize actual weights from monthData (using sap_receive_weight)
  monthData.forEach(r => {
    const matKey = (r.material_name ?? '').toLowerCase();
    const weight = r.sap_receive_weight ?? 0;
    materialTotals[matKey] = (materialTotals[matKey] ?? 0) + weight;

    // Match this record to a master supplier to sum their actuals
    const matchingSup = (suppliersMaster || []).find(s => 
      s.supplier_name === r.supplier_name && 
      (s.material_name ?? '').toLowerCase() === matKey
    );
    if (matchingSup) {
      groupedActuals[matchingSup.id] += weight;
    }
  });

  for (const s of (suppliersMaster || [])) {
    let activeQ = null;
    if (selectedMonthVal === 'all') {
      const sQuotas = (supplierQuotas || []).filter(q => q.supplier_id === s.id);
      if (sQuotas.length > 0) {
        sQuotas.sort((a, b) => new Date(b.contract_start) - new Date(a.contract_start));
        activeQ = sQuotas[0];
      }
    } else {
      const [y, m] = selectedMonthVal.split('-').map(Number);
      const monthStartStr = `${y}-${String(m).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const monthEndStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      activeQ = (supplierQuotas || []).find(q => 
        q.supplier_id === s.id &&
        q.contract_start <= monthEndStr &&
        q.contract_end >= monthStartStr
      );
    }

    const actualQty = groupedActuals[s.id] || 0;
    const hasQuota = activeQ && activeQ.quota_percent > 0;
    const hasActual = actualQty > 0;

    if (hasQuota || hasActual) {
      targetSuppliers.push({
        ...s,
        quota_percent: hasQuota ? activeQ.quota_percent : 0,
        total_quota: hasQuota ? activeQ.total_quota : 0,
        actualQty: actualQty
      });
    }
  }

  // Filter by active material
  if (currentMaterial !== 'all') {
    targetSuppliers = targetSuppliers.filter(s => s.material_name.toLowerCase() === currentMaterial.toLowerCase());
  }

  // Sort targetSuppliers by material_name so they group together in the chart
  targetSuppliers.sort((a, b) => a.material_name.localeCompare(b.material_name));

  if (!targetSuppliers.length) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = "14px 'Noto Sans Thai', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.textAlign = "center";
    ctx.fillText("ไม่มีข้อมูลสัญญาโควต้าสำหรับวัตถุดิบนี้", ctx.canvas.width / 2, ctx.canvas.height / 2);
    return;
  }

  const labels = [];
  const contractQuotas = [];
  const actualShares = [];

  targetSuppliers.forEach(ts => {
    const matKey = ts.material_name.toLowerCase();
    const totalMatQty = materialTotals[matKey] || 0;
    const actualQty = ts.actualQty || 0;
    
    const actualSharePct = totalMatQty > 0 ? parseFloat(((actualQty / totalMatQty) * 100).toFixed(1)) : 0;
    
    const label = currentMaterial === 'all' 
      ? `${ts.supplier_name} (${ts.material_name})`
      : ts.supplier_name;

    labels.push(label);
    contractQuotas.push(ts.quota_percent);
    actualShares.push(actualSharePct);
  });

  dashQuotaChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'โควต้าในสัญญา (%)',
          data: contractQuotas,
          backgroundColor: 'rgba(29,58,112,0.85)',
          borderRadius: 4,
        },
        {
          label: 'เรียกใช้จริง (%)',
          data: actualShares,
          backgroundColor: 'rgba(12,138,126,0.85)',
          borderRadius: 4,
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { family: "'Noto Sans Thai', sans-serif", size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.raw}%`,
          },
        },
      },
      scales: {
        x: {
          max: 100,
          ticks: { callback: v => v + '%', font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        y: {
          ticks: { font: { family: "'Noto Sans Thai', sans-serif", size: 10 } },
          grid: { display: false }
        }
      }
    }
  });
}

/* ── Toggle Mode ─────────────────────────────────────────────── */
window.toggleDashMode = function (btn, mode) {
  dashMode = mode;
  document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  const selectedMonthVal = document.getElementById('sel-dash-month')?.value;
  if (!selectedMonthVal) return;

  let activeData = dashFYData;

  if (selectedMonthVal === 'all') {
    if (activeMaterialFilter !== 'all') {
      activeData = activeData.filter(r => (r.material_name ?? '').toLowerCase() === activeMaterialFilter.toLowerCase());
    }
  } else {
    const [selYear, selMonth] = selectedMonthVal.split('-').map(Number);
    activeData = dashFYData.filter(r => {
      if (!r.delivery_date) return false;
      const parts = r.delivery_date.substring(0, 10).split('-');
      if (parts.length < 3) return false;
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      return m === selMonth && y === selYear;
    });

    if (activeMaterialFilter !== 'all') {
      activeData = activeData.filter(r => (r.material_name ?? '').toLowerCase() === activeMaterialFilter.toLowerCase());
    }
  }

  buildPieChartData(activeData);

  const titleEl = document.getElementById('pie-chart-title');
  if (titleEl) titleEl.textContent = mode === 'plan' ? 'สัดส่วนแผน (Quantity)' : 'สัดส่วนรับจริง (SAP)';
};

/* ── Events ──────────────────────────────────────────────────── */
function bindDashEvents() {
  document.getElementById('sel-dash-plant')?.addEventListener('change', loadDashData);
  document.getElementById('sel-dash-month')?.addEventListener('change', filterAndRenderDashboard);
  document.getElementById('sel-dash-supplier')?.addEventListener('change', filterAndRenderDashboard);
  document.getElementById('sel-dash-material')?.addEventListener('change', filterAndRenderDashboard);
  document.getElementById('btn-dash-reset')?.addEventListener('click', () => {
    document.getElementById('sel-dash-plant').value = '';
    document.getElementById('sel-dash-supplier').value = 'all';
    document.getElementById('sel-dash-material').value = 'all';
    activeMaterialFilter = 'all';
    loadDashData();
  });
}
