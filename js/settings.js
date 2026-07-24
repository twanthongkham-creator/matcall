/* ============================================================
   MATCALL - Settings & Master Recipient Management
   ============================================================ */

/* ── Display-name mapping (kept consistent with request.html's
   MatMap/SupplierMap) — master_supplier stores short internal names,
   request.html shows the SAP-coded/display form. Used only for
   display in the supplier table below, never for saved data. ── */
const DisplayMap = {
  material(dbName) {
    if (dbName === 'CO2') return '120001706 CO2 Gas';
    if (dbName === 'Liquid Sugar' || dbName === 'Liquid Sugar ') return '120001687 น้ำตาลเหลว';
    if (dbName === 'HFS42%') return '120001688 High Fructose Syrup 42%';
    if (dbName === 'Bioligo IMO') return '120001474 Bioligo (IMO)';
    if (dbName === 'NaOH') return '150003906 Sodium Hydroxide 32%';
    if (dbName === 'LPG') return '160000206 LPG Gas';
    return dbName;
  },
  supplier(dbName) {
    if (dbName === 'เจ้าคุณเกษตรพืชผล' || dbName === 'บจก.เจ้าคุณเกษตรพืชผล') return 'เจ้าคุณเกษตรพืชผล';
    if (dbName === 'WGC' || dbName === 'ดับเบิ้ลยูจีซี') return 'ดับเบิ้ลยูจีซี';
    if (dbName === 'ลินเด้ (ประเทศไทย)') return 'ลินเด้ (ประเทศไทย)';
    if (dbName === 'พี.เอส.ซี.สตาร์ช โปรดักส์') return 'พี.เอส.ซี.สตาร์ช โปรดักส์';
    if (dbName === 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น') return 'แปซิฟิก ชูการ์ คอร์ปอเรชั่น';
    if (dbName === 'ไทยรุ่งเรืองอุตสาหกรรม') return 'ไทยรุ่งเรืองอุตสาหกรรม';
    return dbName;
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  // Helper to format email list to newlines with conditional coloring for PAN domains
  function formatEmails(emailStr, isPan = false) {
    if (!emailStr) return '-';
    const arr = emailStr.split(';').map(x => x.trim()).filter(Boolean);
    if (!arr.length) return '-';
    
    return arr.map(e => {
      if (isPan) {
        let color = '#475569'; // default slate-600
        let bg = '#f1f5f9';
        const lower = e.toLowerCase();
        if (lower.includes('@sermsukplc.com')) {
          color = '#0284c7'; // sky-600
          bg = '#f0f9ff';
        } else if (lower.includes('@oishigroup.com')) {
          color = '#d97706'; // amber-600
          bg = '#fffbeb';
        } else if (lower.includes('@thaibev.com')) {
          color = '#059669'; // emerald-600
          bg = '#ecfdf5';
        }
        return `<span style="display:inline-block; padding:2px 6px; margin:2px 0; border-radius:4px; font-weight:600; font-size:11px; color:${color}; background-color:${bg}; border:1px solid currentColor;">${e}</span>`;
      }
      return `${e};`;
    }).join(isPan ? ' ' : '<br>');
  }

  const currentUser = Auth.getUser();
  if (!currentUser) return; // Auth helper will handle redirect

  const isAdmin = currentUser.role === 'Admin';
  
  // Hide Users Tab if not admin
  if (!isAdmin) {
    const usersTabLi = document.getElementById('users-tab-li');
    if (usersTabLi) usersTabLi.remove();
  }

  // State
  let plantsList = [];
  let suppliersList = [];
  let usersList = [];

  // Dropdown populations
  try {
    plantsList = await API.getPlants();
    // Populate modal dropdowns
    populateSelect(document.getElementById('sup-plant'), plantsList, 'plant_code', 'plant_code', 'เลือกโรงงาน...');
    populateSelect(document.getElementById('usr-plant'), plantsList, 'plant_code', 'plant_code', 'ส่วนกลาง (ไม่มีการจำกัด)');
  } catch (e) {
    console.error("Error loading plants", e);
  }

  // Load and Render functions
  async function loadAllData() {
    try {
      // 1. Plant list
      const tbodyPlant = document.getElementById('plant-table-body');
      tbodyPlant.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-teal"></div> กำลังโหลด...</td></tr>`;
      
      const plantsData = await API.getPlants();
      // Filter if not admin
      const filteredPlants = isAdmin ? plantsData : plantsData.filter(p => p.plant_code === currentUser.plant_code);
      
      tbodyPlant.innerHTML = filteredPlants.map(p => {
        const disabledAttr = (!isAdmin && p.plant_code !== currentUser.plant_code) ? 'disabled' : '';
        return `
          <tr data-plant-id="${p.id}">
            <td class="fw-bold text-navy">${p.plant_code} - ${p.plant_name}</td>
            <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(p.email_plan)}</td>
            <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(p.email_rw)}</td>
            <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(p.email_pd)}</td>
            <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(p.email_manager)}</td>
            <td class="text-center">
              <button class="btn btn-outline-primary btn-sm btn-edit-plant" style="padding: 2px 8px;" ${disabledAttr}>
                <i class="bi bi-pencil-square"></i> แก้ไข
              </button>
            </td>
          </tr>
        `;
      }).join('');

      // Add edit listeners for plants
      document.querySelectorAll('.btn-edit-plant').forEach(btn => {
        btn.onclick = (e) => {
          const row = e.target.closest('tr');
          const plantId = row.dataset.plantId;
          const plant = plantsData.find(x => x.id == plantId);
          if (plant) {
            openPlantModal(plant);
          }
        };
      });

      // 2. Suppliers List
      const tbodySupplier = document.getElementById('supplier-table-body');
      tbodySupplier.innerHTML = `<tr><td colspan="9" class="text-center py-4"><div class="spinner-border spinner-border-sm text-teal"></div> กำลังโหลด...</td></tr>`;
      
      const suppliersData = await API.getSuppliers();
      const quotasData = await API.getQuotas();
      // Filter suppliers
      suppliersList = isAdmin ? suppliersData : suppliersData.filter(s => s.plant === currentUser.plant_code);
      
      // Auto-restrict filter-supplier-plant dropdown if not admin
      const filterSupPlantEl = document.getElementById('filter-supplier-plant');
      if (filterSupPlantEl) {
        if (!isAdmin) {
          filterSupPlantEl.value = currentUser.plant_code;
          filterSupPlantEl.disabled = true;
        } else {
          // Bind filter event once
          filterSupPlantEl.onchange = renderSuppliersTable;
        }
      }

      renderSuppliersTable();

      function renderSuppliersTable() {
        let list = [...suppliersList];
        
        const filterSupPlantVal = document.getElementById('filter-supplier-plant')?.value;
        if (filterSupPlantVal) {
          list = list.filter(s => s.plant === filterSupPlantVal);
        }

        if (!list.length) {
          tbodySupplier.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">ไม่พบข้อมูล Supplier</td></tr>`;
        } else {
          tbodySupplier.innerHTML = list.map(s => {
            const sQuotas = (quotasData || []).filter(q => q.supplier_id === s.id);
            sQuotas.sort((a, b) => new Date(b.contract_start) - new Date(a.contract_start));
            const latestQuota = sQuotas[0] || {};
            const formattedEnd = latestQuota.contract_end ? Fmt.date(latestQuota.contract_end) : '-';
            return `
              <tr data-supplier-id="${s.id}">
                <td class="text-center fw-bold text-navy">${s.plant}</td>
                <td class="fw-semibold text-teal">${DisplayMap.material(s.material_name)}</td>
                <td>${DisplayMap.supplier(s.supplier_name)}</td>
                <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(s.supplier_email)}</td>
                <td style="font-size:12px; line-height:1.4; word-break: break-all;">${formatEmails(s.email_pan, true)}</td>
                <td>${formattedEnd}</td>
                <td class="text-end fw-semibold text-navy">${latestQuota.quota_percent ? latestQuota.quota_percent + '%' : '-'}</td>
                <td class="text-end text-navy">${latestQuota.total_quota ? Fmt.num(latestQuota.total_quota) + ' kg' : '-'}</td>
                <td class="text-center">
                  <button class="btn btn-outline-primary btn-sm btn-edit-supplier" style="padding: 2px 8px;">
                    <i class="bi bi-pencil-square"></i> แก้ไข
                  </button>
                  <button class="btn btn-outline-danger btn-sm btn-delete-supplier" style="padding: 2px 8px;">
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('');

          // Edit button listener
          document.querySelectorAll('.btn-edit-supplier').forEach(btn => {
            btn.onclick = (e) => {
              const row = e.target.closest('tr');
              const supId = row.dataset.supplierId;
              const sup = list.find(x => x.id == supId);
              if (sup) {
                openSupplierModal(sup);
              }
            };
          });

          // Delete button listener
          document.querySelectorAll('.btn-delete-supplier').forEach(btn => {
            btn.onclick = async (e) => {
              const row = e.target.closest('tr');
              const supId = row.dataset.supplierId;
              const sup = list.find(x => x.id == supId);
              
              Modal.confirm(
                'ยืนยันการลบข้อมูล',
                `คุณต้องการลบข้อมูล Supplier "${DisplayMap.supplier(sup.supplier_name)}" (${DisplayMap.material(sup.material_name)} - ${sup.plant}) ออกจากระบบหรือไม่?`,
                async () => {
                  try {
                    await API.deleteSupplier(supId);
                    Toast.success('ลบข้อมูลสำเร็จ');
                    loadAllData();
                  } catch(err) {
                    Toast.error('ลบไม่สำเร็จ: ' + err.message);
                  }
                }
              );
            };
          });
        }
      }

      // 3. User lists (Admin only)
      if (isAdmin) {
        const tbodyUsers = document.getElementById('users-table-body');
        tbodyUsers.innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border spinner-border-sm text-teal"></div> กำลังโหลด...</td></tr>`;
        
        usersList = await API.getUsers();
        
        // Show filter bar if Super Admin (Admin with no plant restriction)
        if (!currentUser.plant_code) {
          const filterBar = document.getElementById('users-filter-bar');
          if (filterBar) {
            filterBar.style.setProperty('display', 'flex', 'important');
            // Bind search and filter events (once)
            document.getElementById('search-user').oninput = renderUsersTable;
            document.getElementById('filter-user-plant').onchange = renderUsersTable;
          }
        }
        
        renderUsersTable();

        function renderUsersTable() {
          let list = [...usersList];
          
          // 1. Enforce Plant Admin scope
          if (currentUser.plant_code) {
            list = list.filter(u => u.plant_code === currentUser.plant_code);
          } else {
            // 2. Apply Super Admin search and filter
            const searchVal = document.getElementById('search-user').value.trim().toLowerCase();
            const plantVal = document.getElementById('filter-user-plant').value;
            
            if (searchVal) {
              list = list.filter(u => 
                u.username.toLowerCase().includes(searchVal) ||
                u.name.toLowerCase().includes(searchVal) ||
                (u.plant_code && u.plant_code.toLowerCase().includes(searchVal))
              );
            }
            
            if (plantVal) {
              if (plantVal === 'CENTRAL') {
                list = list.filter(u => !u.plant_code);
              } else {
                list = list.filter(u => u.plant_code === plantVal);
              }
            }
          }
          
          if (!list.length) {
            tbodyUsers.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
            return;
          }

          tbodyUsers.innerHTML = list.map(u => {
            const plantLimit = u.plant_code ? `<span class="badge bg-secondary">${u.plant_code}</span>` : '<span class="badge bg-success">เข้าได้ทุกโรงงาน</span>';
            const roleBadge = u.role === 'Admin' ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-info text-dark">User</span>';
            const deptMap = { 
              production: '<i class="bi bi-gear-fill"></i> แผนกผลิต', 
              warehouse: '<i class="bi bi-box-seam-fill"></i> แผนกคลัง', 
              admin: '<i class="bi bi-shield-fill-check"></i> Admin' 
            };
            const deptColor = { production: 'bg-success', warehouse: 'bg-primary', admin: 'bg-warning text-dark' };
            const dept = u.department || (u.role === 'Admin' ? 'admin' : 'production');
            const deptBadge = `<span class="badge ${deptColor[dept] || 'bg-secondary'} d-inline-flex align-items-center gap-1">${deptMap[dept] || dept}</span>`;
            const emailDisplay = u.email ? `<span style="font-size:12px;color:#475569">${u.email}</span>` : '<span class="text-muted" style="font-size:11px">ยังไม่ระบุ</span>';

            // Lock Central Admin delete or deleting oneself
            const deleteDisabled = (u.username === 'admin' || u.username === currentUser.username) ? 'disabled' : '';
            // Lock Central Admin edit for plant admins
            const editDisabled = (currentUser.plant_code && !u.plant_code) ? 'disabled' : '';

            return `
              <tr data-user-id="${u.id}">
                <td class="fw-bold text-navy">${u.username}</td>
                <td>${u.name}</td>
                <td>${emailDisplay}</td>
                <td>${plantLimit}</td>
                <td>${roleBadge}</td>
                <td>${deptBadge}</td>
                <td class="text-center">
                  <button class="btn btn-outline-primary btn-sm btn-edit-user" style="padding: 2px 8px;" ${editDisabled}>
                    <i class="bi bi-pencil-square"></i> แก้ไข
                  </button>
                  <button class="btn btn-outline-danger btn-sm btn-delete-user" style="padding: 2px 8px;" ${deleteDisabled}>
                    <i class="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            `;
          }).join('');

          // Re-bind listeners for users
          tbodyUsers.querySelectorAll('.btn-edit-user').forEach(btn => {
            btn.onclick = (e) => {
              const row = e.target.closest('tr');
              const usrId = row.dataset.userId;
              const usr = usersList.find(x => x.id == usrId);
              if (usr) openUserModal(usr);
            };
          });

          tbodyUsers.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.onclick = (e) => {
              const row = e.target.closest('tr');
              const usrId = row.dataset.userId;
              const usr = usersList.find(x => x.id == usrId);
              
              Modal.confirm(
                'ยืนยันการลบผู้ใช้',
                `คุณต้องการลบสิทธิ์ผู้ใช้งาน "${usr.name}" (${usr.username}) หรือไม่?`,
                async () => {
                  try {
                    await API.deleteUser(usrId);
                    Toast.success('ลบผู้ใช้สำเร็จ');
                    loadAllData();
                  } catch(err) {
                    Toast.error('ลบไม่สำเร็จ: ' + err.message);
                  }
                }
              );
            };
          });
        }
      }

    } catch (err) {
      console.error(err);
      Toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + err.message);
    }
  }

  // Quota history listing handler
  async function renderQuotaHistory(supplierId) {
    const tbody = document.getElementById('quota-history-table-body');
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-2"><div class="spinner-border spinner-border-sm text-teal" style="width:1rem;height:1rem;"></div> กำลังโหลด...</td></tr>`;
    try {
      const list = await API.getQuotas(supplierId);
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-2">ไม่มีข้อมูลประวัติสัญญา</td></tr>`;
      } else {
        tbody.innerHTML = list.map(q => {
          return `
            <tr data-quota-id="${q.id}">
              <td>${Fmt.date(q.contract_start)}</td>
              <td>${Fmt.date(q.contract_end)}</td>
              <td class="text-end fw-semibold text-navy">${q.quota_percent}%</td>
              <td class="text-end text-navy">${q.total_quota ? Fmt.num(q.total_quota) + ' kg' : '-'}</td>
              <td class="text-center">
                <button type="button" class="btn btn-outline-danger btn-xs btn-delete-quota" style="padding:0 5px; font-size:10px;">✕</button>
              </td>
            </tr>
          `;
        }).join('');
        
        tbody.querySelectorAll('.btn-delete-quota').forEach(btn => {
          btn.onclick = async (e) => {
            const row = e.target.closest('tr');
            const qId = row.dataset.quotaId;
            Modal.confirm(
              'ยืนยันการลบสัญญา',
              'คุณต้องการลบรอบสัญญาโควต้านี้หรือไม่?',
              async () => {
                try {
                  await API.deleteQuota(qId);
                  Toast.success('ลบสัญญาโควต้าสำเร็จ');
                  renderQuotaHistory(supplierId);
                } catch(err) {
                  Toast.error('ลบสัญญาไม่สำเร็จ: ' + err.message);
                }
              }
            );
          };
        });
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-2">โหลดไม่สำเร็จ</td></tr>`;
    }
  }

  // Supplier modal handlers
  function openSupplierModal(sup = null) {
    const form = document.getElementById('supplier-form');
    form.reset();
    
    // Clear flatpickr inputs upon opening/resetting supplier modal
    if (fpSupStart) fpSupStart.clear();
    if (fpSupEnd) fpSupEnd.clear();
    if (fpNewQuotaStart) fpNewQuotaStart.clear();
    if (fpNewQuotaEnd) fpNewQuotaEnd.clear();

    const title = document.getElementById('supplier-modal-title');
    const idInput = document.getElementById('supplier-id');
    const plantSel = document.getElementById('sup-plant');
    
    // Restrict plant selection if not admin
    if (!isAdmin) {
      plantSel.value = currentUser.plant_code;
      plantSel.disabled = true;
    } else {
      plantSel.disabled = false;
    }

    const initQuotaSec = document.getElementById('initial-quota-section');
    const quotaHistSec = document.getElementById('quota-history-section');

    if (sup) {
      title.textContent = 'แก้ไขข้อมูล Supplier';
      idInput.value = sup.id;
      plantSel.value = sup.plant;
      document.getElementById('sup-material').value = sup.material_name;
      document.getElementById('sup-name').value = sup.supplier_name;
      document.getElementById('sup-email').value = sup.supplier_email || '';
      document.getElementById('sup-email-pan').value = sup.email_pan || '';
      
      initQuotaSec.style.display = 'none';
      quotaHistSec.style.display = 'block';
      renderQuotaHistory(sup.id);
      
      document.getElementById('btn-add-quota-period').onclick = async () => {
        const start = document.getElementById('new-quota-start').value;
        const end = document.getElementById('new-quota-end').value;
        const pct = document.getElementById('new-quota-pct').value;
        const total = document.getElementById('new-quota-total').value;
        if (!start || !end) {
          Toast.error('กรุณาระบุวันเริ่มสัญญาและวันสิ้นสุดสัญญา');
          return;
        }
        try {
          await API.createQuota({
            supplier_id: sup.id,
            contract_start: start,
            contract_end: end,
            quota_percent: pct ? parseFloat(pct) : 0,
            total_quota: total ? parseFloat(total) : null
          });
          Toast.success('เพิ่มรอบสัญญาโควต้าสำเร็จ');
          if (fpNewQuotaStart) fpNewQuotaStart.clear();
          if (fpNewQuotaEnd) fpNewQuotaEnd.clear();
          document.getElementById('new-quota-pct').value = '';
          document.getElementById('new-quota-total').value = '';
          renderQuotaHistory(sup.id);
        } catch(err) {
          Toast.error('เพิ่มรอบสัญญาไม่สำเร็จ: ' + err.message);
        }
      };
    } else {
      title.textContent = 'เพิ่มข้อมูล Supplier ใหม่';
      idInput.value = '';
      document.getElementById('sup-email-pan').value = '';
      if (!isAdmin) {
        plantSel.value = currentUser.plant_code;
      }
      initQuotaSec.style.display = 'block';
      quotaHistSec.style.display = 'none';
    }

    Modal.show('supplier-modal');
  }

  document.getElementById('btn-add-supplier').onclick = () => openSupplierModal();

  document.getElementById('supplier-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('supplier-id').value;
    
    const plantEl = document.getElementById('sup-plant');
    const matEl = document.getElementById('sup-material');
    const nameEl = document.getElementById('sup-name');
    const emailEl = document.getElementById('sup-email');
    const emailPanEl = document.getElementById('sup-email-pan');
    const startEl = document.getElementById('sup-start');
    const endEl = document.getElementById('sup-end');
    const pctEl = document.getElementById('sup-quota-pct');
    const totalEl = document.getElementById('sup-quota-total');

    const payload = {
      plant: plantEl ? plantEl.value : '',
      material_name: matEl ? matEl.value : '',
      supplier_name: nameEl ? nameEl.value.trim() : '',
      supplier_email: (emailEl && emailEl.value) ? emailEl.value.trim() : null,
      email_pan: (emailPanEl && emailPanEl.value) ? emailPanEl.value.trim() : null,
      contract_start: (startEl && startEl.value) ? startEl.value : null,
      contract_end: (endEl && endEl.value) ? endEl.value : null,
      quota_percent: (pctEl && pctEl.value) ? parseFloat(pctEl.value) : null,
      total_quota: (totalEl && totalEl.value) ? parseFloat(totalEl.value) : null,
    };

    try {
      if (id) {
        await API.updateSupplier(id, {
          plant: payload.plant,
          material_name: payload.material_name,
          supplier_name: payload.supplier_name,
          supplier_email: payload.supplier_email,
          email_pan: payload.email_pan
        });
        Toast.success('อัปเดตข้อมูล Supplier สำเร็จ');
      } else {
        const newSup = await API.createSupplier({
          plant: payload.plant,
          material_name: payload.material_name,
          supplier_name: payload.supplier_name,
          supplier_email: payload.supplier_email,
          email_pan: payload.email_pan
        });
        
        if (payload.contract_start && payload.contract_end) {
          await API.createQuota({
            supplier_id: newSup.id,
            contract_start: payload.contract_start,
            contract_end: payload.contract_end,
            quota_percent: payload.quota_percent || 0,
            total_quota: payload.total_quota || null
          });
        }
        Toast.success('เพิ่ม Supplier ใหม่สำเร็จ');
      }
      Modal.hide('supplier-modal');
      loadAllData();
    } catch(err) {
      Toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // User modal handlers (Admin only)
  function openUserModal(usr = null) {
    const form = document.getElementById('user-form');
    form.reset();

    const title = document.getElementById('user-modal-title');
    const idInput = document.getElementById('user-id');
    const usrname = document.getElementById('usr-username');

    if (usr) {
      title.textContent = 'แก้ไขข้อมูลผู้ใช้';
      idInput.value = usr.id;
      usrname.value = usr.username;
      usrname.disabled = false; // allow editing username
      document.getElementById('usr-name').value = usr.name;
      document.getElementById('usr-email').value = usr.email || '';
      document.getElementById('usr-emailjs-service-id').value = usr.emailjs_service_id || '';
      document.getElementById('usr-emailjs-template-id').value = usr.emailjs_template_id || '';
      document.getElementById('usr-emailjs-public-key').value = usr.emailjs_public_key || '';
      document.getElementById('usr-role').value = usr.role;
      document.getElementById('usr-department').value = usr.department || (usr.role === 'Admin' ? 'admin' : 'production');
      document.getElementById('usr-password').value = usr.password || (usr.role === 'Admin' ? '1234' : '5678');
      document.getElementById('usr-plant').value = usr.plant_code || '';
    } else {
      title.textContent = 'เพิ่มผู้ใช้ใหม่';
      idInput.value = '';
      document.getElementById('usr-password').value = '5678';
      document.getElementById('usr-department').value = 'production';
      document.getElementById('usr-email').value = '';
      document.getElementById('usr-emailjs-service-id').value = '';
      document.getElementById('usr-emailjs-template-id').value = '';
      document.getElementById('usr-emailjs-public-key').value = '';
      usrname.disabled = false;
    }

    // Plant Admin restrictions: lock plant selection
    const plantSel = document.getElementById('usr-plant');
    if (currentUser.plant_code) {
      plantSel.value = currentUser.plant_code;
      plantSel.disabled = true;
    } else {
      plantSel.disabled = false;
    }

    toggleUserPlantDiv();
    toggleEmailJsSection();
    Modal.show('user-modal');
  }

  function toggleUserPlantDiv() {
    const role = document.getElementById('usr-role').value;
    const plantSel = document.getElementById('usr-plant');
    const plantSelParent = plantSel?.closest('.mb-3');
    if (role === 'Admin') {
      if (plantSelParent) plantSelParent.style.display = 'none';
      plantSel.value = '';
    } else {
      if (plantSelParent) plantSelParent.style.display = 'block';
    }
    toggleEmailJsSection();
  }

  function toggleEmailJsSection() {
    const dept = document.getElementById('usr-department').value;
    const section = document.getElementById('usr-emailjs-section');
    if (section) {
      section.style.display = dept === 'warehouse' ? 'block' : 'none';
    }
  }

  document.getElementById('usr-role').onchange = () => toggleUserPlantDiv();
  document.getElementById('usr-department').onchange = () => toggleEmailJsSection();
  
  if (isAdmin) {
    document.getElementById('btn-add-user').onclick = () => openUserModal();

    document.getElementById('user-form').onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('user-id').value;
      
      const payload = {
        username: document.getElementById('usr-username').value.trim().toLowerCase(),
        name: document.getElementById('usr-name').value.trim(),
        email: document.getElementById('usr-email').value.trim() || null,
        emailjs_service_id: document.getElementById('usr-emailjs-service-id').value.trim() || null,
        emailjs_template_id: document.getElementById('usr-emailjs-template-id').value.trim() || null,
        emailjs_public_key: document.getElementById('usr-emailjs-public-key').value.trim() || null,
        role: document.getElementById('usr-role').value,
        department: document.getElementById('usr-department').value,
        plant_code: currentUser.plant_code ? currentUser.plant_code : (document.getElementById('usr-role').value === 'Admin' ? null : document.getElementById('usr-plant').value || null),
        password: document.getElementById('usr-password').value.trim() || (document.getElementById('usr-role').value === 'Admin' ? '1234' : '5678')
      };

      try {
        if (id) {
          await API.updateUser(id, payload);
          Toast.success('อัปเดตสิทธิ์ผู้ใช้สำเร็จ');
        } else {
          await API.createUser(payload);
          Toast.success('สร้างผู้ใช้ใหม่สำเร็จ');
        }
        Modal.hide('user-modal');
        loadAllData();
      } catch(err) {
        Toast.error('บันทึกไม่สำเร็จ: ' + err.message);
      }
    };
  }

  // Plant modal handlers
  function openPlantModal(plant) {
    const form = document.getElementById('plant-form');
    form.reset();
    
    document.getElementById('plant-id').value = plant.id;
    document.getElementById('plt-code').value = plant.plant_code;
    document.getElementById('plt-name').value = plant.plant_name;
    document.getElementById('plt-email-plan').value = plant.email_plan || '';
    document.getElementById('plt-email-rw').value = plant.email_rw || '';
    document.getElementById('plt-email-pd').value = plant.email_pd || '';
    document.getElementById('plt-email-manager').value = plant.email_manager || '';
    
    Modal.show('plant-modal');
  }

  document.getElementById('plant-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('plant-id').value;
    const payload = {
      email_plan: document.getElementById('plt-email-plan').value.trim() || null,
      email_rw: document.getElementById('plt-email-rw').value.trim() || null,
      email_pd: document.getElementById('plt-email-pd').value.trim() || null,
      email_manager: document.getElementById('plt-email-manager').value.trim() || null,
    };

    try {
      await API.updatePlant(id, payload);
      Toast.success('อัปเดตข้อมูลอีเมลโรงงานสำเร็จ');
      Modal.hide('plant-modal');
      loadAllData();
    } catch(err) {
      Toast.error('บันทึกไม่สำเร็จ: ' + err.message);
    }
  };

  // Initialize flatpickr on date fields
  let fpSupStart, fpSupEnd, fpNewQuotaStart, fpNewQuotaEnd;
  if (typeof flatpickr !== 'undefined') {
    const config = {
      altInput: true,
      altFormat: 'd/m/Y',
      dateFormat: 'Y-m-d',
      allowInput: true
    };
    fpSupStart = flatpickr('#sup-start', config);
    fpSupEnd = flatpickr('#sup-end', config);
    fpNewQuotaStart = flatpickr('#new-quota-start', config);
    fpNewQuotaEnd = flatpickr('#new-quota-end', config);
  }

  // Init
  loadAllData();
});
