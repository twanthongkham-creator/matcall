/* ============================================================
   MATCALL - Supabase Client
   ============================================================ */

const SUPABASE_URL = "https://veasbnqtfeaaxdpvqhcz.supabase.co";
const SUPABASE_KEY = "sb_publishable_lNHI_haN0Key4pflGRc9rw_lvMiML3Q";

// Initialize Supabase client (loaded via CDN in HTML)
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Tables ─────────────────────────────────────────────────── */
const TABLE = {
  CALLOFF_PLAN:    'calloff_plan',
  MASTER_SUPPLIER: 'master_supplier',
  MASTER_PLANT:    'master_plant',
  SUPPLIER_QUOTA:  'supplier_quota',
  PO_DATA:         'po_data',
};

/* ── Generic helpers ────────────────────────────────────────── */
const DB = {

  /** Fetch all rows with optional filter object */
  async getAll(table, filters = {}, orderBy = null) {
    let q = _supabase.from(table).select('*');
    for (const [col, val] of Object.entries(filters)) {
      if (val !== null && val !== undefined && val !== '') q = q.eq(col, val);
    }
    if (orderBy) q = q.order(orderBy.col, { ascending: orderBy.asc ?? true });
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  /** Fetch single row by id */
  async getById(table, id) {
    const { data, error } = await _supabase.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  /** Insert one row, returns inserted row */
  async insert(table, payload) {
    const { data, error } = await _supabase.from(table).insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  /** Update row by id, returns updated row */
  async update(table, id, payload) {
    const { data, error } = await _supabase.from(table).update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  /** Delete row by id */
  async delete(table, id) {
    const { error } = await _supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },

  /** Run a complex query builder fn: fn(_supabase.from(table)) */
  async query(table, builderFn) {
    const { data, error } = await builderFn(_supabase.from(table).select('*'));
    if (error) throw error;
    return data ?? [];
  },
};

/* ── Typed API ──────────────────────────────────────────────── */
const API = {

  /* ── Master Plant ── */
  async getPlants() {
    return DB.getAll(TABLE.MASTER_PLANT, { is_active: true }, { col: 'plant_code', asc: true });
  },

  async getPlantByCode(code) {
    const { data, error } = await _supabase
      .from(TABLE.MASTER_PLANT).select('*').eq('plant_code', code).eq('is_active', true).single();
    if (error) throw error;
    return data;
  },

  /* ── Master Supplier ── */
  async getSuppliers(plantCode = null) {
    let q = _supabase.from(TABLE.MASTER_SUPPLIER).select('*');
    if (plantCode) q = q.eq('plant', plantCode);
    q = q.order('supplier_name', { ascending: true });
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async getMaterials(plantCode = null, supplierName = null) {
    let q = _supabase.from(TABLE.MASTER_SUPPLIER).select('material_name').order('material_name');
    if (plantCode)    q = q.eq('plant', plantCode);
    if (supplierName) q = q.eq('supplier_name', supplierName);
    const { data, error } = await q;
    if (error) throw error;
    // distinct
    return [...new Set((data ?? []).map(r => r.material_name))].sort();
  },

  async getSupplierByMaterial(plantCode, materialName) {
    const { data, error } = await _supabase
      .from(TABLE.MASTER_SUPPLIER)
      .select('*')
      .eq('plant', plantCode)
      .eq('material_name', materialName);
    if (error) throw error;
    return data ?? [];
  },

  /* ── Call-off Plan ── */
  async getCalloffPlans({
    plant = null,
    supplierName = null,
    materialName = null,
    status = null,
    mailStatus = null,
    receiveStatus = null,
    dateFrom = null,
    dateTo = null,
    fy = null,
  } = {}) {
    let q = _supabase.from(TABLE.CALLOFF_PLAN).select('*');

    if (plant)         q = q.eq('plant', plant);
    if (supplierName)  q = q.eq('supplier_name', supplierName);
    if (materialName)  q = q.eq('material_name', materialName);
    if (status)        q = q.eq('status', status);
    if (mailStatus)    q = q.eq('mail_status', mailStatus);
    if (receiveStatus) q = q.eq('receive_status', receiveStatus);

    if (fy) {
      // Thai fiscal year: Oct(fy-1) - Sep(fy)
      q = q.gte('delivery_date', `${fy - 1}-10-01`).lte('delivery_date', `${fy}-09-30`);
    }

    if (dateFrom) q = q.gte('delivery_date', dateFrom);
    if (dateTo)   q = q.lte('delivery_date', dateTo);

    q = q.order('delivery_date', { ascending: true });

    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async createCalloffPlan(payload) {
    return DB.insert(TABLE.CALLOFF_PLAN, {
      ...payload,
      status:         payload.status        ?? 'Active',
      mail_status:    payload.mail_status   ?? 'Pending',
      receive_status: payload.receive_status ?? 'Pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  },

  async updateCalloffPlan(id, payload) {
    return DB.update(TABLE.CALLOFF_PLAN, id, {
      ...payload,
      updated_at: new Date().toISOString(),
    });
  },

  async deleteCalloffPlan(id) {
    return DB.delete(TABLE.CALLOFF_PLAN, id);
  },

  /* Mark mail as sent */
  async markMailSent(id) {
    return DB.update(TABLE.CALLOFF_PLAN, id, {
      mail_status: 'Sent',
      updated_at: new Date().toISOString(),
    });
  },

  /* Bulk mark mail sent */
  async bulkMarkMailSent(ids) {
    const { error } = await _supabase
      .from(TABLE.CALLOFF_PLAN)
      .update({ mail_status: 'Sent', updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) throw error;
  },

  /* Save goods receipt data */
  async saveGoodsReceipt(id, receiptData) {
    return DB.update(TABLE.CALLOFF_PLAN, id, {
      do_number:           receiptData.do_number,
      supplier_weight:     receiptData.supplier_weight,
      factory_weight:      receiptData.factory_weight,
      weight_diff:         receiptData.weight_diff,
      sap_receive_weight:  receiptData.sap_receive_weight,
      sap_doc_number:      receiptData.sap_doc_number,
      actual_delivery_date: receiptData.actual_delivery_date,
      receive_status:      receiptData.receive_status,
      updated_at: new Date().toISOString(),
    });
  },

  /* Dashboard: FY summary */
  async getFYData(fy, plant = null, supplier = null, material = null) {
    return API.getCalloffPlans({
      fy,
      plant:         plant    || null,
      supplierName:  supplier || null,
      materialName:  material || null,
      status: 'Active',
    });
  },

  /* ── App Users ── */
  async getUsers() {
    try {
      return await DB.getAll('app_users', {}, { col: 'username', asc: true });
    } catch (e) {
      console.warn("Table app_users might not exist yet, falling back to local storage users list", e);
      // Fallback list in case they haven't run migration
      let localUsers = JSON.parse(localStorage.getItem('fallback_users') || '[]');
      if (localUsers.length < 13 || !localUsers.some(u => u.username === '550101')) {
        localUsers = [
          { id: 1, username: 'admin', name: 'Super Admin', plant_code: '', role: 'Admin', department: 'admin', password: '1234', email: 'admin@sermsukplc.com' },
          
          { id: 2, username: '550101', name: 'วัชระ รุ่งเรือง', plant_code: 'PT', role: 'User', department: 'production', password: '550101', email: 'watchara.r@sermsukplc.com' },
          { id: 3, username: '550102', name: 'อนันต์ ศรีสุข', plant_code: 'PT', role: 'Admin', department: 'production', password: '550102', email: 'anant.s@sermsukplc.com' },
          { id: 4, username: '550103', name: 'สุภาพร มั่นคง', plant_code: 'PT', role: 'User', department: 'warehouse', password: '550103', email: 'supaporn.m@sermsukplc.com' },
          
          { id: 5, username: '550201', name: 'เกียรติศักดิ์ พูนผล', plant_code: 'KR', role: 'User', department: 'production', password: '550201', email: 'kiattisak.p@sermsukplc.com' },
          { id: 6, username: '550202', name: 'ณรงค์ศักดิ์ สุขใจ', plant_code: 'KR', role: 'Admin', department: 'production', password: '550202', email: 'narongsak.s@sermsukplc.com' },
          { id: 7, username: '550203', name: 'ปริญญา สมบูรณ์', plant_code: 'KR', role: 'User', department: 'warehouse', password: '550203', email: 'parinya.s@sermsukplc.com' },
          
          { id: 8, username: '550301', name: 'ประวิทย์ ขยันยิ่ง', plant_code: 'NS', role: 'User', department: 'production', password: '550301', email: 'prawit.k@sermsukplc.com' },
          { id: 9, username: '550302', name: 'สุรเดช สว่างเนตร', plant_code: 'NS', role: 'Admin', department: 'production', password: '550302', email: 'suradet.s@sermsukplc.com' },
          { id: 10, username: '550303', name: 'วารี ใจงาม', plant_code: 'NS', role: 'User', department: 'warehouse', password: '550303', email: 'waree.j@sermsukplc.com' },
          
          { id: 11, username: '550401', name: 'สมศักดิ์ รักชาติ', plant_code: 'SR', role: 'User', department: 'production', password: '550401', email: 'somsak.r@sermsukplc.com' },
          { id: 12, username: '550402', name: 'ธีรยุทธ วันทองคำ', plant_code: 'SR', role: 'Admin', department: 'production', password: '550402', email: 'teerayut.w@sermsukplc.com' },
          { id: 13, username: '550403', name: 'สมหมาย ดีเลิศ', plant_code: 'SR', role: 'User', department: 'warehouse', password: '550403', email: 'sommai.d@sermsukplc.com' },
          
          { id: 14, username: '550501', name: 'ไพโรจน์ รอดภัย', plant_code: 'CH', role: 'User', department: 'production', password: '550501', email: 'pairoj.r@sermsukplc.com' },
          { id: 15, username: '550502', name: 'วิชัย ดีประเสริฐ', plant_code: 'CH', role: 'Admin', department: 'production', password: '550502', email: 'wichai.d@sermsukplc.com' },
          { id: 16, username: '550503', name: 'มณี สุขสบาย', plant_code: 'CH', role: 'User', department: 'warehouse', password: '550503', email: 'manee.s@sermsukplc.com' },
          
          { id: 17, username: '550601', name: 'มานพ แก้วคง', plant_code: 'NP', role: 'User', department: 'production', password: '550601', email: 'manop.k@sermsukplc.com' },
          { id: 18, username: '550602', name: 'ธนากร ใจเย็น', plant_code: 'NP', role: 'Admin', department: 'production', password: '550602', email: 'thanakorn.j@sermsukplc.com' },
          { id: 19, username: '550603', name: 'กนกวรรณ ศรีทอง', plant_code: 'NP', role: 'User', department: 'warehouse', password: '550603', email: 'kanokwan.s@sermsukplc.com' }
        ];
        localStorage.setItem('fallback_users', JSON.stringify(localUsers));
      }
      return localUsers;
    }
  },

  async createUser(payload) {
    try {
      return await DB.insert('app_users', payload);
    } catch (e) {
      let localUsers = JSON.parse(localStorage.getItem('fallback_users') || '[]');
      const newId = localUsers.length ? Math.max(...localUsers.map(u => u.id)) + 1 : 1;
      const newUser = { id: newId, ...payload };
      localUsers.push(newUser);
      localStorage.setItem('fallback_users', JSON.stringify(localUsers));
      return newUser;
    }
  },

  async updateUser(id, payload) {
    try {
      return await DB.update('app_users', id, payload);
    } catch (e) {
      let localUsers = JSON.parse(localStorage.getItem('fallback_users') || '[]');
      const idx = localUsers.findIndex(u => u.id == id);
      if (idx !== -1) {
        localUsers[idx] = { ...localUsers[idx], ...payload };
        localStorage.setItem('fallback_users', JSON.stringify(localUsers));
        return localUsers[idx];
      }
      throw e;
    }
  },

  async deleteUser(id) {
    try {
      return await DB.delete('app_users', id);
    } catch (e) {
      let localUsers = JSON.parse(localStorage.getItem('fallback_users') || '[]');
      localUsers = localUsers.filter(u => u.id != id);
      localStorage.setItem('fallback_users', JSON.stringify(localUsers));
    }
  },

  /* ── Master Plant Extensions ── */
  async updatePlant(id, payload) {
    return DB.update(TABLE.MASTER_PLANT, id, {
      ...payload,
      updated_at: new Date().toISOString()
    });
  },

  /* ── Master Supplier Extensions ── */
  async updateSupplier(id, payload) {
    return DB.update(TABLE.MASTER_SUPPLIER, id, {
      ...payload,
      updated_at: new Date().toISOString()
    });
  },

  async createSupplier(payload) {
    return DB.insert(TABLE.MASTER_SUPPLIER, {
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  },

  async deleteSupplier(id) {
    return DB.delete(TABLE.MASTER_SUPPLIER, id);
  },

  /* ── Supplier Quotas ── */
  async getQuotas(supplierId = null) {
    let q = _supabase.from(TABLE.SUPPLIER_QUOTA).select('*');
    if (supplierId) q = q.eq('supplier_id', supplierId);
    q = q.order('contract_start', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  },

  async createQuota(payload) {
    return DB.insert(TABLE.SUPPLIER_QUOTA, {
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  },

  async updateQuota(id, payload) {
    return DB.update(TABLE.SUPPLIER_QUOTA, id, {
      ...payload,
      updated_at: new Date().toISOString()
    });
  },

  async deleteQuota(id) {
    return DB.delete(TABLE.SUPPLIER_QUOTA, id);
  },

  /* ── PO Data ── */
  async getPOs(plantCode = null, materialName = null, supplierName = null) {
    try {
      let q = _supabase.from('po_data').select('*');
      if (plantCode) q = q.eq('plant', plantCode);
      if (materialName) q = q.eq('material_name', materialName);
      if (supplierName) q = q.eq('supplier_name', supplierName);
      q = q.order('po_number', { ascending: true }).order('po_item', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    } catch (e) {
      console.warn("Table po_data might not exist, falling back to local storage POs", e);
      let localPOs = JSON.parse(localStorage.getItem('fallback_pos') || '[]');
      if (plantCode) localPOs = localPOs.filter(p => p.plant === plantCode);
      if (materialName) localPOs = localPOs.filter(p => p.material_name === materialName);
      if (supplierName) localPOs = localPOs.filter(p => p.supplier_name === supplierName);
      return localPOs;
    }
  },

  async savePOs(posArray) {
    try {
      // 0. Preserve inactive statuses before wiping
      let inactiveMap = {};
      try {
        const { data: inactivePOs } = await _supabase.from('po_data')
          .select('po_number, po_item')
          .eq('is_active', false);
        if (inactivePOs) {
          for (const p of inactivePOs) {
            inactiveMap[`${p.po_number}_${p.po_item}`] = true;
          }
        }
      } catch (e) {
        console.warn("Could not fetch inactive POs (is_active column might not exist yet)", e);
      }

      // Apply preserved statuses to the incoming payload
      for (const p of posArray) {
        if (inactiveMap[`${p.po_number}_${p.po_item}`]) {
          p.is_active = false;
        } else {
          p.is_active = true;
        }
      }

      // 1. Delete all existing POs
      const { error: delError } = await _supabase.from('po_data').delete().neq('id', 0);
      if (delError) throw delError;

      // 2. Insert new POs in batches
      if (posArray.length > 0) {
        const { error: insError } = await _supabase.from('po_data').insert(posArray);
        if (insError) throw insError;
      }
    } catch (e) {
      console.warn("Table po_data might not exist, saving to local storage fallback", e);
    }
    // Always sync with local storage fallback
    localStorage.setItem('fallback_pos', JSON.stringify(posArray.map((p, idx) => ({ id: idx + 1, ...p }))));
  },
  
  async updatePoPendingQty(poNumber, materialName, qtyDeducted) {
    let remainingToDeduct = parseFloat(qtyDeducted) || 0;
    if (remainingToDeduct <= 0) return;

    try {
      // Fetch all active items for this PO and material, sorted by po_item
      const { data, error } = await _supabase.from('po_data')
        .select('*')
        .eq('po_number', poNumber)
        .eq('material_name', materialName)
        .eq('is_completed', false)
        .order('po_item', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        for (const poItem of data) {
          if (remainingToDeduct <= 0) break;
          const currentPending = parseFloat(poItem.qty_pending) || 0;
          
          if (currentPending > 0) {
            const deduct = Math.min(currentPending, remainingToDeduct);
            const newPending = Math.max(0, currentPending - deduct);
            const isCompleted = newPending <= 0;
            
            await _supabase.from('po_data')
              .update({ qty_pending: newPending, is_completed: isCompleted, updated_at: new Date().toISOString() })
              .eq('id', poItem.id);
              
            remainingToDeduct -= deduct;
          }
        }
      }
    } catch (e) {
      console.warn("Table po_data error during PO qty deduction update", e);
    }
    
    // Always update local storage fallback as well
    let localPOs = JSON.parse(localStorage.getItem('fallback_pos') || '[]');
    let localRemaining = parseFloat(qtyDeducted) || 0;
    
    // Sort local POs to ensure we deduct from items in order
    localPOs.sort((a, b) => {
      if (a.po_number !== b.po_number) return a.po_number.localeCompare(b.po_number);
      return a.po_item.localeCompare(b.po_item);
    });
    
    for (let i = 0; i < localPOs.length; i++) {
      if (localRemaining <= 0) break;
      const p = localPOs[i];
      if (p.po_number === poNumber && p.material_name === materialName && !p.is_completed) {
        const currentPending = parseFloat(p.qty_pending) || 0;
        if (currentPending > 0) {
          const deduct = Math.min(currentPending, localRemaining);
          p.qty_pending = Math.max(0, currentPending - deduct);
          p.is_completed = p.qty_pending <= 0;
          localRemaining -= deduct;
        }
      }
    }
    localStorage.setItem('fallback_pos', JSON.stringify(localPOs));
  },

  async togglePoActive(id, isActive) {
    try {
      const { error } = await _supabase.from('po_data')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    } catch (e) {
      console.warn("Error updating is_active", e);
      // Fallback
      let localPOs = JSON.parse(localStorage.getItem('fallback_pos') || '[]');
      const p = localPOs.find(x => x.id === id);
      if (p) {
        p.is_active = isActive;
        localStorage.setItem('fallback_pos', JSON.stringify(localPOs));
      }
    }
  },
};

/* ── Fiscal Year helper ─────────────────────────────────────── */
function getCurrentFY() {
  const m = new Date().getMonth() + 1; // 1-12
  const y = new Date().getFullYear();
  return m >= 10 ? y + 1 : y;
}

function getFYRange(fy) {
  return {
    start: `${fy - 1}-10-01`,
    end:   `${fy}-09-30`,
  };
}
