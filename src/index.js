import { bitable, FieldType } from '@lark-base-open/js-sdk';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import html2pdf from 'html2pdf.js';
import { generatePreviewHtml } from './preview.js';
import { TemplateParser, fillTemplate } from './templateParser.js';

// 内置模板字段定义 - 与 preview.js 中使用的字段完全对应
const TEMPLATE_FIELDS = {
  // 主表字段
  main: [
    { key: '报价单编号', label: '报价单编号', aliases: ['订单号', '订单编号', 'Invoice NO', '编号', 'Order No'] },
    { key: '日期', label: '日期', aliases: ['Date', '创建日期', '报价日期', '下单日期'] },
    { key: '客户名称', label: '客户名称', aliases: ['客户', 'Buyer', 'Customer', '公司名称', '买方'] },
    { key: '客户地址', label: '客户地址', aliases: ['地址', 'Address', '公司地址', '收货地址'] },
    { key: '联系人', label: '联系人', aliases: ['Contact', 'Contact Person', '联系方式', '对接人'] },
    { key: '电话', label: '电话', aliases: ['Phone', 'Tel', '手机', '电话号码', '联系电话'] },
    { key: '邮箱', label: '邮箱', aliases: ['Email', 'E-mail', '电子邮件', '邮件'] },
    { key: '销售员', label: '销售员', aliases: ['Salesperson', '业务员', '负责人', '人员'] },
    { key: '卖家姓名', label: '卖家姓名', aliases: ['Seller Name', '卖家', '卖方联系人'] },
    { key: '运输条款', label: '运输条款', aliases: ['Shipping Term', '贸易条款', 'FOB', 'CIF', '运输方式'] },
    { key: '交货天数', label: '交货天数', aliases: ['Delivery Days', '交期', '货期', '交货期', '生产周期'] },
    { key: '定金比例', label: '定金比例(%)', aliases: ['Deposit Rate', '预付比例', '首付比例', '定金'] },
    { key: '生产备注1', label: '生产备注1', aliases: ['Production Note', '备注1', '生产备注'] },
    { key: '生产备注2', label: '生产备注2', aliases: ['备注2'] },
    { key: '备注', label: '备注', aliases: ['Note', 'Remark', '说明', '其他备注'] }
  ],
  // 产品明细字段
  product: [
    { key: '产品名称', label: '产品名称', aliases: ['Items', '品名', '名称', '对应产品品类', '产品', '商品名称'] },
    { key: '产品编号-SKU', label: '产品编号/SKU', aliases: ['Descriptions', 'SKU', '产品编号', '编号', '规格', '型号'] },
    { key: '订购数量', label: '数量', aliases: ['Quantities', '数量', 'qty', '订购数', '购买数量', 'Qty'] },
    { key: '单位', label: '单位', aliases: ['Unit', 'unit', 'pcs', '计量单位'] },
    { key: '报价（外币）', label: '单价', aliases: ['Unit Price', '单价', '价格', 'price', '报价', '售价'] },
    { key: '报价总价（外币）', label: '总价', aliases: ['Total Price', '单项总价（外币）', '总价', '金额', 'total', '小计', '合计'] }
  ]
};

const state = {
  table: null,
  tableId: null,
  fields: [],
  records: [],
  linkedTable: null,
  linkedFields: [],
  linkedRecords: {},
  selectedIds: new Set(),
  fieldMapping: {},
  productMapping: {},
  customTemplate: null,
  parsedTemplate: null,  // 解析后的模板 { html, images, placeholders }
  useCustomTemplate: false,
  sellerConfig: null,
  stampData: null
};

// 存储key前缀
const STORAGE_KEY_PREFIX = 'feishu_quote_mapping_';
const SELLER_STORAGE_KEY = 'feishu_quote_seller_config';

// 保存 Seller 配置
function saveSellerConfig() {
  const config = {
    companyName: document.getElementById('sellerCompanyName').value,
    address: document.getElementById('sellerAddress').value,
    tel: document.getElementById('sellerTel').value,
    email: document.getElementById('sellerEmail').value,
    website: document.getElementById('sellerWebsite').value,
    beneficiary: document.getElementById('sellerBeneficiary').value,
    bankName: document.getElementById('sellerBankName').value,
    swiftCode: document.getElementById('sellerSwiftCode').value,
    bankAddress: document.getElementById('sellerBankAddress').value,
    account: document.getElementById('sellerAccount').value
  };
  config.companyNameFull = config.companyName.toUpperCase();
  state.sellerConfig = config;
  
  try {
    localStorage.setItem(SELLER_STORAGE_KEY, JSON.stringify(config));
    showToast('Seller 配置已保存', 'success');
  } catch (e) {
    console.error('保存 Seller 配置失败:', e);
  }
}

// 加载 Seller 配置
function loadSellerConfig() {
  try {
    const saved = localStorage.getItem(SELLER_STORAGE_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      state.sellerConfig = config;
      
      // 填充表单
      if (config.companyName) document.getElementById('sellerCompanyName').value = config.companyName;
      if (config.address) document.getElementById('sellerAddress').value = config.address;
      if (config.tel) document.getElementById('sellerTel').value = config.tel;
      if (config.email) document.getElementById('sellerEmail').value = config.email;
      if (config.website) document.getElementById('sellerWebsite').value = config.website;
      if (config.beneficiary) document.getElementById('sellerBeneficiary').value = config.beneficiary;
      if (config.bankName) document.getElementById('sellerBankName').value = config.bankName;
      if (config.swiftCode) document.getElementById('sellerSwiftCode').value = config.swiftCode;
      if (config.bankAddress) document.getElementById('sellerBankAddress').value = config.bankAddress;
      if (config.account) document.getElementById('sellerAccount').value = config.account;
    }
  } catch (e) {
    console.error('加载 Seller 配置失败:', e);
  }
}

// 保存映射到 localStorage
function saveMapping() {
  if (!state.tableId) return;
  
  const data = {
    fieldMapping: state.fieldMapping,
    productMapping: state.productMapping,
    savedAt: Date.now()
  };
  
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + state.tableId, JSON.stringify(data));
    showToast('映射已保存', 'success');
  } catch (e) {
    console.error('保存映射失败:', e);
  }
}

// 从 localStorage 加载映射
function loadMapping() {
  if (!state.tableId) return false;
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + state.tableId);
    if (saved) {
      const data = JSON.parse(saved);
      
      // 验证保存的字段是否仍然存在
      const fieldNames = state.fields.map(f => f.name);
      const productFieldNames = (state.linkedFields.length > 0 ? state.linkedFields : state.fields).map(f => f.name);
      
      let hasValidMapping = false;
      
      // 恢复主表映射
      if (data.fieldMapping) {
        for (const [key, value] of Object.entries(data.fieldMapping)) {
          if (value && fieldNames.includes(value)) {
            state.fieldMapping[key] = value;
            hasValidMapping = true;
          }
        }
      }
      
      // 恢复产品映射
      if (data.productMapping) {
        for (const [key, value] of Object.entries(data.productMapping)) {
          if (value && productFieldNames.includes(value)) {
            state.productMapping[key] = value;
            hasValidMapping = true;
          }
        }
      }
      
      return hasValidMapping;
    }
  } catch (e) {
    console.error('加载映射失败:', e);
  }
  
  return false;
}

// 清除保存的映射
function clearMapping() {
  if (!state.tableId) return;
  
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + state.tableId);
    initFieldMapping(true); // 重新自动匹配
    showToast('已重置为自动匹配', 'success');
  } catch (e) {
    console.error('清除映射失败:', e);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  initEvents();
  await syncData();
});

async function initTheme() {
  try {
    const theme = await bitable.bridge.getTheme();
    document.body.classList.toggle('dark', theme === 'DARK');
    bitable.bridge.onThemeChange(e => document.body.classList.toggle('dark', e.data.theme === 'DARK'));
  } catch (e) {}
}

// 自动匹配字段
function autoMatchField(templateField, availableFields) {
  const fieldNames = availableFields.map(f => f.name);
  
  // 精确匹配
  if (fieldNames.includes(templateField.key)) {
    return templateField.key;
  }
  
  // 别名匹配
  for (const alias of templateField.aliases) {
    if (fieldNames.includes(alias)) {
      return alias;
    }
  }
  
  // 模糊匹配
  for (const name of fieldNames) {
    if (name.includes(templateField.key) || templateField.key.includes(name)) {
      return name;
    }
    for (const alias of templateField.aliases) {
      if (name.includes(alias) || alias.includes(name)) {
        return name;
      }
    }
  }
  
  return '';
}

// 初始化字段映射
function initFieldMapping(forceAuto = false) {
  state.fieldMapping = {};
  state.productMapping = {};
  
  // 先尝试自动匹配
  for (const tf of TEMPLATE_FIELDS.main) {
    state.fieldMapping[tf.key] = autoMatchField(tf, state.fields);
  }
  
  const productFields = state.linkedFields.length > 0 ? state.linkedFields : state.fields;
  for (const tf of TEMPLATE_FIELDS.product) {
    state.productMapping[tf.key] = autoMatchField(tf, productFields);
  }
  
  // 如果不是强制自动匹配，尝试加载保存的映射
  if (!forceAuto) {
    const loaded = loadMapping();
    if (loaded) {
      showToast('已加载保存的映射', 'success');
    }
  }
  
  renderMappingUI();
}

// 渲染字段映射UI
function renderMappingUI() {
  const container = document.getElementById('mappingList');
  let html = '';
  
  // 主表字段
  html += '<div class="mapping-group"><div class="mapping-group-title">📄 主表字段</div>';
  for (const tf of TEMPLATE_FIELDS.main) {
    const currentValue = state.fieldMapping[tf.key] || '';
    const options = state.fields.map(f => 
      '<option value="' + f.name + '"' + (f.name === currentValue ? ' selected' : '') + '>' + f.name + '</option>'
    ).join('');
    
    html += '<div class="mapping-row">' +
      '<span class="mapping-label">' + tf.label + '</span>' +
      '<select class="mapping-select" data-type="main" data-key="' + tf.key + '">' +
      '<option value="">-- 不映射 --</option>' + options +
      '</select>' +
      (currentValue ? '<span class="mapping-status">✓</span>' : '<span class="mapping-status warning">!</span>') +
    '</div>';
  }
  html += '</div>';
  
  // 产品字段
  const productFields = state.linkedFields.length > 0 ? state.linkedFields : state.fields;
  const productSource = state.linkedFields.length > 0 ? '关联表' : '主表';
  
  html += '<div class="mapping-group"><div class="mapping-group-title">📦 产品字段 (' + productSource + ')</div>';
  for (const tf of TEMPLATE_FIELDS.product) {
    const currentValue = state.productMapping[tf.key] || '';
    const options = productFields.map(f => 
      '<option value="' + f.name + '"' + (f.name === currentValue ? ' selected' : '') + '>' + f.name + '</option>'
    ).join('');
    
    html += '<div class="mapping-row">' +
      '<span class="mapping-label">' + tf.label + '</span>' +
      '<select class="mapping-select" data-type="product" data-key="' + tf.key + '">' +
      '<option value="">-- 不映射 --</option>' + options +
      '</select>' +
      (currentValue ? '<span class="mapping-status">✓</span>' : '<span class="mapping-status warning">!</span>') +
    '</div>';
  }
  html += '</div>';
  
  // 操作按钮
  html += '<div class="mapping-actions">' +
    '<button class="btn-mapping" id="saveMappingBtn">💾 保存映射</button>' +
    '<button class="btn-mapping btn-reset" id="resetMappingBtn">🔄 重置</button>' +
  '</div>';
  
  container.innerHTML = html;
  
  // 绑定下拉框事件
  container.querySelectorAll('.mapping-select').forEach(select => {
    select.onchange = (e) => {
      const type = e.target.dataset.type;
      const key = e.target.dataset.key;
      const value = e.target.value;
      
      if (type === 'main') {
        state.fieldMapping[key] = value;
      } else {
        state.productMapping[key] = value;
      }
      
      // 更新状态图标
      const status = e.target.parentElement.querySelector('.mapping-status');
      if (value) {
        status.textContent = '✓';
        status.className = 'mapping-status';
      } else {
        status.textContent = '!';
        status.className = 'mapping-status warning';
      }
    };
  });
  
  // 绑定保存按钮
  document.getElementById('saveMappingBtn').onclick = saveMapping;
  document.getElementById('resetMappingBtn').onclick = clearMapping;
}

// 根据映射获取数据值
function getMappedValue(data, templateKey, isProduct = false) {
  const mapping = isProduct ? state.productMapping : state.fieldMapping;
  const fieldName = mapping[templateKey];
  if (!fieldName) return '';
  return data[fieldName] || '';
}

// 同步数据
async function syncData() {
  showLoading('正在同步数据...');
  try {
    state.table = await bitable.base.getActiveTable();
    state.tableId = state.table.id; // 保存表ID用于存储映射
    state.fields = await state.table.getFieldMetaList();
    
    // 查找关联字段
    const linkField = state.fields.find(f => 
      f.type === 21 || f.type === FieldType.Link || 
      f.name.includes('产品') || f.name.includes('对应')
    );
    
    if (linkField) {
      try {
        const field = await state.table.getField(linkField.id);
        const linkTableId = await field.getProperty('tableId');
        if (linkTableId) {
          state.linkedTable = await bitable.base.getTableById(linkTableId);
          state.linkedFields = await state.linkedTable.getFieldMetaList();
        }
      } catch (e) {}
    }
    
    // 初始化字段映射（会自动尝试加载保存的映射）
    initFieldMapping();
    
    // 获取当前视图的筛选后数据
    let ids = [];
    try {
      const view = await state.table.getActiveView();
      if (view) {
        const visibleIds = await view.getVisibleRecordIdList();
        if (visibleIds && visibleIds.length > 0) {
          ids = visibleIds;
        }
      }
    } catch (e) {}
    
    if (ids.length === 0) {
      ids = await state.table.getRecordIdList();
    }
    
    state.records = [];
    state.linkedRecords = {};
    const rawFieldsMap = {};

    for (const id of ids) {
      const rec = await state.table.getRecordById(id);
      const data = { _id: id };
      rawFieldsMap[id] = rec.fields;
      
      for (const f of state.fields) {
        const rawValue = rec.fields[f.id];
        
        if (f.type === 21 || f.type === FieldType.Link) {
          data[f.name] = formatValue(rawValue, f.type);
          
          if (state.linkedTable && Array.isArray(rawValue) && rawValue.length > 0) {
            const linkedItems = [];
            for (const linkItem of rawValue) {
              const linkRecordId = linkItem.record_id || linkItem.recordId || linkItem;
              if (linkRecordId && typeof linkRecordId === 'string') {
                try {
                  const linkedRec = await state.linkedTable.getRecordById(linkRecordId);
                  const linkedData = {};
                  for (const lf of state.linkedFields) {
                    linkedData[lf.name] = formatValue(linkedRec.fields[lf.id], lf.type);
                  }
                  linkedItems.push(linkedData);
                } catch (e) {}
              }
            }
            state.linkedRecords[id] = linkedItems;
          }
        } else {
          data[f.name] = formatValue(rawValue, f.type);
        }
      }
      state.records.push(data);
    }
    
    // 处理主从表结构
    console.log('=== 主从表处理调试 ===');
    console.log('所有字段及类型:', state.fields.map(f => ({ name: f.name, type: f.type })));
    
    const parentOrderField = state.fields.find(f => 
      f.name.includes('所属订单') || f.name.includes('所属报价单')
    );
    const orderNoField = state.fields.find(f => 
      f.name.includes('报价单编号') || f.name.includes('订单编号')
    );
    
    console.log('找到所属订单字段:', parentOrderField?.name, '类型:', parentOrderField?.type);
    console.log('找到报价单编号字段:', orderNoField?.name, '类型:', orderNoField?.type);
    
    if (parentOrderField && orderNoField) {
      const groupedMap = new Map();
      const childRecords = [];
      
      const extractTextValue = (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value.trim();
        if (typeof value === 'number') return String(value);
        if (Array.isArray(value)) {
          const first = value[0];
          if (first?.text) return first.text.trim();
          if (first?.value) return first.value.toString().trim(); // 自动编号
          if (typeof first === 'object') return first.text || first.name || first.value || '';
          return String(first || '').trim();
        }
        if (typeof value === 'object') {
          // 自动编号字段格式: { status: "completed", value: "HC031" }
          if (value.value !== undefined) return String(value.value).trim();
          if (value.text) return value.text.trim();
          if (value.name) return value.name.trim();
          return '';
        }
        return String(value).trim();
      };
      
      // 打印每条记录的关键字段原始值
      console.log('=== 记录原始数据 ===');
      for (const rec of state.records) {
        const rawFields = rawFieldsMap[rec._id];
        const orderNoFieldMeta = state.fields.find(f => f.name === orderNoField.name);
        const parentOrderFieldMeta = state.fields.find(f => f.name === parentOrderField.name);
        
        console.log('记录', rec._id, {
          '报价单编号原始值': rawFields[orderNoFieldMeta.id],
          '所属订单原始值': rawFields[parentOrderFieldMeta.id],
          '报价单编号格式化': rec[orderNoField.name],
          '所属订单格式化': rec[parentOrderField.name]
        });
      }
      
      for (const rec of state.records) {
        const rawFields = rawFieldsMap[rec._id];
        const parentOrderFieldId = state.fields.find(f => f.name === parentOrderField.name)?.id;
        const rawParentValue = rawFields ? rawFields[parentOrderFieldId] : null;
        
        // 提取所属订单的值
        let parentOrder = extractTextValue(rawParentValue);
        // 也尝试从格式化后的值获取
        if (!parentOrder) {
          parentOrder = extractTextValue(rec[parentOrderField.name]);
        }
        
        // 提取报价单编号
        const orderNoFieldId = state.fields.find(f => f.name === orderNoField.name)?.id;
        const rawOrderNo = rawFields ? rawFields[orderNoFieldId] : null;
        let orderNo = extractTextValue(rawOrderNo);
        if (!orderNo) {
          orderNo = extractTextValue(rec[orderNoField.name]);
        }
        
        console.log('记录', rec._id, '- 所属订单:', parentOrder, '报价单编号:', orderNo);
        
        // 判断是主表还是从表
        if (!parentOrder && orderNo) {
          // 所属订单为空，报价单编号有值 → 主表记录
          console.log('  → 识别为主表记录:', orderNo);
          const mainRecord = Object.assign({}, rec);
          mainRecord._orderNo = orderNo;
          groupedMap.set(orderNo, mainRecord);
          state.linkedRecords[rec._id] = [];
        } else if (parentOrder) {
          // 所属订单有值 → 从表记录
          console.log('  → 识别为从表记录，所属:', parentOrder);
          const childRecord = Object.assign({}, rec);
          childRecord._parentOrder = parentOrder;
          childRecords.push(childRecord);
        } else {
          console.log('  → 跳过：报价单编号和所属订单都为空');
        }
      }
      
      console.log('主表记录数:', groupedMap.size, '从表记录数:', childRecords.length);
      console.log('主表订单号:', Array.from(groupedMap.keys()));
      
      // 将从表记录关联到主表
      for (const child of childRecords) {
        const mainRec = groupedMap.get(child._parentOrder);
        if (mainRec) {
          const productData = {};
          state.fields.forEach(f => {
            if (f.name !== parentOrderField.name && f.name !== orderNoField.name) {
              productData[f.name] = child[f.name];
            }
          });
          state.linkedRecords[mainRec._id].push(productData);
        } else {
          console.log('  警告: 从表记录找不到主表:', child._parentOrder);
        }
      }
      
      state.records = Array.from(groupedMap.values());
      
      // 打印关联数据
      console.log('=== 关联数据汇总 ===');
      for (const rec of state.records) {
        const products = state.linkedRecords[rec._id] || [];
        console.log('订单', rec._orderNo, '关联产品数:', products.length);
        if (products.length > 0) {
          console.log('  产品列表:', products);
        }
      }
    }
    
    state.selectedIds.clear();
    renderList();
    hideLoading();
    showToast('已加载 ' + state.records.length + ' 条数据', 'success');
  } catch (e) {
    hideLoading();
    console.error('同步失败:', e);
    showToast('同步失败: ' + e.message, 'error');
  }
}

function formatValue(v, t) {
  if (v == null) return '';
  if (t === FieldType.DateTime || t === 5) {
    return typeof v === 'number' ? new Date(v).toLocaleDateString('zh-CN') : String(v);
  }
  if (Array.isArray(v)) {
    return v.map(x => {
      if (typeof x === 'object') {
        return x.text || x.name || x.value || '';
      }
      return String(x);
    }).filter(Boolean).join(', ');
  }
  if (typeof v === 'object') {
    // 自动编号字段格式: { status: "completed", value: "HC031" }
    if (v.value !== undefined) return String(v.value);
    if (v.text) return v.text;
    if (v.name) return v.name;
    return '';
  }
  return String(v);
}


function renderList() {
  const list = document.getElementById('recordList');
  const countEl = document.getElementById('dataCount');
  countEl.textContent = state.records.length + ' 条';
  
  if (!state.records.length) {
    list.innerHTML = '<div class="empty-hint">暂无数据，请点击 🔄 同步</div>';
    return;
  }
  
  // 获取映射的报价单编号字段
  const orderNoFieldName = state.fieldMapping['报价单编号'];
  const customerFieldName = state.fieldMapping['客户名称'];
  
  console.log('=== 渲染列表调试 ===');
  console.log('字段映射:', state.fieldMapping);
  console.log('报价单编号字段:', orderNoFieldName);
  console.log('客户名称字段:', customerFieldName);
  console.log('第一条记录:', state.records[0]);
  
  list.innerHTML = state.records.map(r => {
    // 使用映射的字段获取标题
    let title = '';
    if (orderNoFieldName && r[orderNoFieldName]) {
      title = r[orderNoFieldName];
    } else if (r._orderNo) {
      title = r._orderNo;
    } else {
      title = r._id;
    }
    
    // 使用映射的字段获取客户名称
    let sub = '';
    if (customerFieldName && r[customerFieldName]) {
      sub = r[customerFieldName];
    }
    
    const selected = state.selectedIds.has(r._id);
    const linkedCount = state.linkedRecords[r._id]?.length || 0;
    
    return '<div class="record-item ' + (selected ? 'selected' : '') + '" data-id="' + r._id + '">' +
      '<input type="checkbox" ' + (selected ? 'checked' : '') + '>' +
      '<div class="record-info">' +
        '<span class="record-title">' + title + '</span>' +
        (sub ? '<span class="record-sub">' + sub + '</span>' : '') +
        (linkedCount > 0 ? '<span class="record-sub">📦 ' + linkedCount + ' 个产品</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
  
  list.querySelectorAll('.record-item').forEach(el => {
    el.onclick = e => {
      if (e.target.tagName !== 'INPUT') {
        el.querySelector('input').click();
      }
    };
    el.querySelector('input').onchange = e => {
      const id = el.dataset.id;
      if (e.target.checked) {
        state.selectedIds.add(id);
      } else {
        state.selectedIds.delete(id);
      }
      el.classList.toggle('selected', e.target.checked);
      updateUI();
    };
  });
  
  updateUI();
}

function updateUI() {
  const n = state.selectedIds.size;
  document.getElementById('selectedInfo').textContent = '已选 ' + n + ' 条';
  document.getElementById('selectAll').checked = n === state.records.length && n > 0;
  
  const exportBtn = document.getElementById('exportBtn');
  const previewBtn = document.getElementById('previewBtn');
  
  exportBtn.disabled = n === 0;
  previewBtn.disabled = n === 0;
  exportBtn.textContent = n > 0 ? '📥 导出 ' + n + ' 份PDF' : '📥 导出PDF';
}

function initEvents() {
  document.getElementById('syncBtn').onclick = syncData;
  
  // 模板类型切换
  document.querySelectorAll('input[name="templateType"]').forEach(radio => {
    radio.onchange = (e) => {
      const uploadArea = document.getElementById('templateUploadArea');
      if (e.target.value === 'custom') {
        uploadArea.style.display = 'flex';
      } else {
        uploadArea.style.display = 'none';
        state.customTemplate = null;
      }
    };
  });
  
  // 模板上传
  document.getElementById('uploadArea').onclick = () => {
    document.getElementById('templateInput').click();
  };
  
  document.getElementById('templateInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showLoading('正在解析模板...');
    
    try {
      const parser = new TemplateParser();
      const result = await parser.parse(file);
      
      state.customTemplate = file;
      state.parsedTemplate = result;
      state.useCustomTemplate = true;
      
      // 更新占位符映射
      updatePlaceholderMapping(result.placeholders);
      
      document.getElementById('templateName').textContent = '✅ ' + file.name;
      document.getElementById('uploadArea').classList.add('has-file');
      document.getElementById('clearTemplate').style.display = 'block';
      
      hideLoading();
      showToast('模板解析成功，发现 ' + result.placeholders.length + ' 个变量', 'success');
      
      // 自动展开映射面板
      document.getElementById('mappingContent').style.display = 'block';
      document.getElementById('toggleMapping').textContent = '收起';
      
    } catch (err) {
      hideLoading();
      console.error('模板解析失败:', err);
      showToast('模板解析失败: ' + err.message, 'error');
    }
  };
  
  document.getElementById('clearTemplate').onclick = (e) => {
    e.stopPropagation();
    state.customTemplate = null;
    state.parsedTemplate = null;
    state.useCustomTemplate = false;
    document.getElementById('templateName').textContent = '点击上传 Excel 模板';
    document.getElementById('uploadArea').classList.remove('has-file');
    document.getElementById('clearTemplate').style.display = 'none';
    document.getElementById('templateInput').value = '';
    // 切换回内置模板
    document.querySelector('input[name="templateType"][value="builtin"]').checked = true;
    initFieldMapping(true);
  };
  
  // 字段映射展开/收起
  document.getElementById('toggleMapping').onclick = (e) => {
    const content = document.getElementById('mappingContent');
    const btn = e.target;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      btn.textContent = '收起';
    } else {
      content.style.display = 'none';
      btn.textContent = '展开';
    }
  };
  
  // Seller 配置展开/收起
  document.getElementById('toggleSeller').onclick = (e) => {
    const content = document.getElementById('sellerContent');
    const btn = e.target;
    if (content.style.display === 'none') {
      content.style.display = 'block';
      btn.textContent = '收起';
    } else {
      content.style.display = 'none';
      btn.textContent = '展开';
    }
  };
  
  // 保存 Seller 配置
  document.getElementById('saveSellerBtn').onclick = saveSellerConfig;
  
  // 加载已保存的 Seller 配置
  loadSellerConfig();
  
  // 印章上传
  document.getElementById('uploadStampBtn').onclick = () => {
    document.getElementById('stampInput').click();
  };
  document.getElementById('stampInput').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      localStorage.setItem('feishu_quote_stamp', base64);
      state.stampData = base64;
      document.getElementById('stampStatus').textContent = '✅ ' + file.name;
      showToast('印章已保存', 'success');
    };
    reader.readAsDataURL(file);
  };
  // 加载印章：优先 localStorage，否则加载 public/stamp.png
  const savedStamp = localStorage.getItem('feishu_quote_stamp');
  if (savedStamp) {
    state.stampData = savedStamp;
    document.getElementById('stampStatus').textContent = '✅ 已加载';
  } else {
    // 自动加载 public 目录的默认印章
    fetch('./stamp.png')
      .then(res => { if (res.ok) return res.blob(); throw new Error('not found'); })
      .then(blob => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          state.stampData = ev.target.result;
          localStorage.setItem('feishu_quote_stamp', ev.target.result);
          document.getElementById('stampStatus').textContent = '✅ 默认印章';
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }
  
  document.getElementById('selectAll').onchange = e => {
    if (e.target.checked) {
      state.selectedIds = new Set(state.records.map(r => r._id));
    } else {
      state.selectedIds.clear();
    }
    renderList();
  };
  
  document.getElementById('previewBtn').onclick = doPreview;
  document.getElementById('exportBtn').onclick = doExport;
}

// 根据模板占位符更新映射
function updatePlaceholderMapping(placeholders) {
  // 清空现有映射
  state.fieldMapping = {};
  state.productMapping = {};
  
  // 为每个占位符尝试自动匹配字段
  for (const ph of placeholders) {
    // 尝试在主表字段中匹配
    const mainField = state.fields.find(f => 
      f.name === ph || f.name.includes(ph) || ph.includes(f.name)
    );
    if (mainField) {
      state.fieldMapping[ph] = mainField.name;
      continue;
    }
    
    // 尝试在产品字段中匹配
    const productFields = state.linkedFields.length > 0 ? state.linkedFields : state.fields;
    const prodField = productFields.find(f => 
      f.name === ph || f.name.includes(ph) || ph.includes(f.name)
    );
    if (prodField) {
      state.productMapping[ph] = prodField.name;
    }
  }
  
  // 更新映射UI
  renderCustomMappingUI(placeholders);
}

// 渲染自定义模板的映射UI
function renderCustomMappingUI(placeholders) {
  const container = document.getElementById('mappingList');
  let html = '';
  
  html += '<div class="mapping-group"><div class="mapping-group-title">📝 模板变量映射</div>';
  
  const allFields = [...state.fields];
  if (state.linkedFields.length > 0) {
    allFields.push(...state.linkedFields.map(f => ({ ...f, name: '[产品] ' + f.name, originalName: f.name })));
  }
  
  for (const ph of placeholders) {
    const currentValue = state.fieldMapping[ph] || state.productMapping[ph] || '';
    const options = allFields.map(f => {
      const displayName = f.name;
      const value = f.originalName || f.name;
      return '<option value="' + value + '"' + (value === currentValue || displayName === currentValue ? ' selected' : '') + '>' + displayName + '</option>';
    }).join('');
    
    html += '<div class="mapping-row">' +
      '<span class="mapping-label" title="{{' + ph + '}}">' + ph + '</span>' +
      '<select class="mapping-select" data-key="' + ph + '">' +
      '<option value="">-- 不映射 --</option>' + options +
      '</select>' +
      (currentValue ? '<span class="mapping-status">✓</span>' : '<span class="mapping-status warning">!</span>') +
    '</div>';
  }
  
  html += '</div>';
  
  // 操作按钮
  html += '<div class="mapping-actions">' +
    '<button class="btn-mapping" id="saveMappingBtn">💾 保存映射</button>' +
    '<button class="btn-mapping btn-reset" id="resetMappingBtn">🔄 重置</button>' +
  '</div>';
  
  container.innerHTML = html;
  
  // 绑定事件
  container.querySelectorAll('.mapping-select').forEach(select => {
    select.onchange = (e) => {
      const key = e.target.dataset.key;
      const value = e.target.value;
      
      // 判断是主表字段还是产品字段
      const isProductField = value.startsWith('[产品] ');
      const actualValue = isProductField ? value.replace('[产品] ', '') : value;
      
      if (isProductField) {
        state.productMapping[key] = actualValue;
        delete state.fieldMapping[key];
      } else {
        state.fieldMapping[key] = actualValue;
        delete state.productMapping[key];
      }
      
      const status = e.target.parentElement.querySelector('.mapping-status');
      if (value) {
        status.textContent = '✓';
        status.className = 'mapping-status';
      } else {
        status.textContent = '!';
        status.className = 'mapping-status warning';
      }
    };
  });
  
  document.getElementById('saveMappingBtn').onclick = saveMapping;
  document.getElementById('resetMappingBtn').onclick = clearMapping;
}

// 转换数据为模板格式（支持自定义模板）
function convertToTemplateData(record) {
  const data = {};
  
  if (state.useCustomTemplate && state.parsedTemplate) {
    // 自定义模板：使用模板中的占位符
    for (const ph of state.parsedTemplate.placeholders) {
      const fieldName = state.fieldMapping[ph];
      if (fieldName) {
        data[ph] = record[fieldName] || '';
      }
    }
  } else {
    // 内置模板：使用预定义字段
    for (const tf of TEMPLATE_FIELDS.main) {
      const fieldName = state.fieldMapping[tf.key];
      data[tf.key] = fieldName ? (record[fieldName] || '') : '';
    }
  }
  
  return data;
}

// 转换产品数据为模板格式
function convertProductData(items) {
  return items.map(item => {
    const data = {};
    
    if (state.useCustomTemplate && state.parsedTemplate) {
      for (const ph of state.parsedTemplate.placeholders) {
        const fieldName = state.productMapping[ph];
        if (fieldName) {
          data[ph] = item[fieldName] || '';
        }
      }
    } else {
      for (const tf of TEMPLATE_FIELDS.product) {
        const fieldName = state.productMapping[tf.key];
        data[tf.key] = fieldName ? (item[fieldName] || '') : '';
      }
    }
    
    return data;
  });
}

// 生成预览HTML
function generateHtmlForRecord(record) {
  const data = convertToTemplateData(record);
  const linkedItems = convertProductData(state.linkedRecords[record._id] || []);
  const docTitle = document.querySelector('input[name="docTitle"]:checked')?.value || 'Proforma Invoice';
  const showStamp = document.getElementById('showStamp')?.checked !== false;
  
  if (state.useCustomTemplate && state.parsedTemplate) {
    return fillTemplate(state.parsedTemplate.html, data, linkedItems);
  } else {
    return generatePreviewHtml(data, linkedItems, state.sellerConfig, docTitle, showStamp, state.stampData);
  }
}

async function doPreview() {
  const selected = state.records.filter(r => state.selectedIds.has(r._id));
  if (!selected.length) {
    showToast('请选择数据', 'error');
    return;
  }
  
  const record = selected[0];
  const html = generateHtmlForRecord(record);
  
  const win = window.open('', '_blank', 'width=900,height=900');
  win.document.write(html);
  win.document.close();
}

async function doExport() {
  const selected = state.records.filter(r => state.selectedIds.has(r._id));
  if (!selected.length) {
    showToast('请选择数据', 'error');
    return;
  }
  
  const mode = document.querySelector('input[name="outputMode"]:checked').value;
  
  showLoading('正在生成 ' + selected.length + ' 份PDF...');
  
  try {
    const pdfOptions = {
      margin: 0,
      filename: 'quote.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'avoid-all' }
    };
    
    if (mode === 'single' && selected.length > 1) {
      const zip = new JSZip();
      
      for (const record of selected) {
        const html = generateHtmlForRecord(record);
        const data = convertToTemplateData(record);
        
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        const element = container.querySelector('.container');
        fitToOnePage(element);
        
        const pdfBlob = await html2pdf().set(pdfOptions).from(element).outputPdf('blob');
        
        document.body.removeChild(container);
        
        const fileName = '报价单_' + (data['报价单编号'] || data['订单号'] || record._id) + '.pdf';
        zip.file(fileName, pdfBlob);
      }
      
      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, '报价单_' + new Date().toISOString().slice(0, 10) + '.zip');
    } else if (selected.length === 1) {
      const record = selected[0];
      const html = generateHtmlForRecord(record);
      const data = convertToTemplateData(record);
      
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      document.body.appendChild(container);
      
      const element = container.querySelector('.container');
      fitToOnePage(element);
      
      const fileName = '报价单_' + (data['报价单编号'] || data['订单号'] || record._id) + '.pdf';
      
      await html2pdf().set({...pdfOptions, filename: fileName}).from(element).save();
      
      document.body.removeChild(container);
    } else {
      const { jsPDF } = await import('jspdf');
      const mergedPdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      let isFirst = true;
      
      for (const record of selected) {
        const data = convertToTemplateData(record);
        const linkedItems = convertProductData(state.linkedRecords[record._id] || []);
        const docTitle = document.querySelector('input[name="docTitle"]:checked')?.value || 'Proforma Invoice';
        const showStamp = document.getElementById('showStamp')?.checked !== false;
        const html = generatePreviewHtml(data, linkedItems, state.sellerConfig, docTitle, showStamp, state.stampData);
        
        const container = document.createElement('div');
        container.innerHTML = html;
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        const element = container.querySelector('.container');
        fitToOnePage(element);
        
        if (!isFirst) {
          mergedPdf.addPage();
        }
        isFirst = false;
        
        const canvas = await html2pdf().set(pdfOptions).from(element).outputImg('canvas');
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        mergedPdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        document.body.removeChild(container);
      }
      
      mergedPdf.save('报价单合集_' + new Date().toISOString().slice(0, 10) + '.pdf');
    }
    
    hideLoading();
    showToast('成功导出 ' + selected.length + ' 份报价单！', 'success');
  } catch (err) {
    hideLoading();
    console.error(err);
    showToast('导出失败: ' + err.message, 'error');
  }
}

// 将内容缩放到一页 A4 内
function fitToOnePage(element) {
  // A4 高度约 1123px (297mm at 96dpi)
  const a4Height = 1123;
  const a4Width = 794; // 210mm
  
  // 先设置固定宽度让内容正确渲染
  element.style.width = a4Width + 'px';
  element.style.height = 'auto';
  element.style.minHeight = 'auto';
  element.style.overflow = 'visible';
  
  // 获取实际内容高度
  const contentHeight = element.scrollHeight;
  
  if (contentHeight > a4Height) {
    // 内容超出一页，计算缩放比例
    const scale = a4Height / contentHeight;
    element.style.transform = 'scale(' + scale + ')';
    element.style.transformOrigin = 'top left';
    element.style.width = (a4Width / scale) + 'px';
    element.style.height = (a4Height / scale) + 'px';
  }
  
  // 最终限制输出尺寸
  element.style.maxHeight = a4Height + 'px';
  element.style.overflow = 'hidden';
}

function showLoading(text) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('loadingText').textContent = text || '加载中...';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

function showToast(msg, type) {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
