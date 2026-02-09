import { bitable } from '@lark-base-open/js-sdk';

// 飞书多维表格 SDK 封装
export const bitableService = {
  table: null,
  view: null,
  fieldMetaList: [],
  
  // 初始化连接
  async init() {
    try {
      // 获取当前激活的表格
      this.table = await bitable.base.getActiveTable();
      // 获取当前视图
      this.view = await this.table.getActiveView();
      // 获取字段元信息
      this.fieldMetaList = await this.table.getFieldMetaList();
      
      return {
        success: true,
        tableName: await this.table.getName(),
        viewName: await this.view.getName(),
        fields: this.fieldMetaList.map(f => f.name)
      };
    } catch (error) {
      console.error('初始化失败:', error);
      return { success: false, error: error.message };
    }
  },
  
  // 获取字段列表
  getFields() {
    return this.fieldMetaList.map(f => ({
      id: f.id,
      name: f.name,
      type: f.type
    }));
  },
  
  // 获取所有记录数据
  async getRecords() {
    if (!this.table) {
      throw new Error('请先初始化表格连接');
    }
    
    const records = [];
    const recordIdList = await this.table.getRecordIdList();
    
    for (const recordId of recordIdList) {
      const record = await this.table.getRecordById(recordId);
      const rowData = { _recordId: recordId };
      
      for (const field of this.fieldMetaList) {
        const cellValue = record.fields[field.id];
        rowData[field.name] = await this.formatCellValue(cellValue, field.type);
      }
      
      records.push(rowData);
    }
    
    return records;
  },
  
  // 格式化单元格值
  async formatCellValue(value, fieldType) {
    if (value === null || value === undefined) {
      return '';
    }
    
    // 根据字段类型处理
    switch (fieldType) {
      case 1: // 文本
        return Array.isArray(value) ? value.map(v => v.text || v).join('') : String(value);
      
      case 2: // 数字
        return String(value);
      
      case 3: // 单选
        return value.text || value;
      
      case 4: // 多选
        return Array.isArray(value) ? value.map(v => v.text || v).join(', ') : String(value);
      
      case 5: // 日期
        if (typeof value === 'number') {
          return new Date(value).toLocaleDateString('zh-CN');
        }
        return String(value);
      
      case 7: // 复选框
        return value ? '是' : '否';
      
      case 11: // 人员
        if (Array.isArray(value)) {
          return value.map(v => v.name || v.en_name || '').join(', ');
        }
        return value.name || value.en_name || '';
      
      case 13: // 电话
        return String(value);
      
      case 15: // URL
        return Array.isArray(value) ? value.map(v => v.link || v).join(', ') : (value.link || String(value));
      
      case 17: // 附件
        if (Array.isArray(value)) {
          return value.map(v => v.name || '附件').join(', ');
        }
        return '附件';
      
      case 19: // 查找引用
      case 20: // 公式
      case 21: // 双向关联
        if (Array.isArray(value)) {
          return value.map(v => {
            if (typeof v === 'object') {
              return v.text || v.name || JSON.stringify(v);
            }
            return String(v);
          }).join(', ');
        }
        return String(value);
      
      default:
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return String(value);
    }
  },
  
  // 监听选择变化
  onSelectionChange(callback) {
    return bitable.base.onSelectionChange(callback);
  },
  
  // 获取选中的记录
  async getSelectedRecords() {
    const selection = await bitable.base.getSelection();
    if (!selection || !selection.recordId) {
      return [];
    }
    
    // 如果只选中了一条
    const record = await this.table.getRecordById(selection.recordId);
    const rowData = { _recordId: selection.recordId };
    
    for (const field of this.fieldMetaList) {
      const cellValue = record.fields[field.id];
      rowData[field.name] = await this.formatCellValue(cellValue, field.type);
    }
    
    return [rowData];
  }
};

// 检测是否在飞书环境中
export function isInFeishu() {
  try {
    // 检查是否在飞书多维表格环境
    return typeof window !== 'undefined' && 
           window.parent !== window && 
           typeof bitable !== 'undefined' && 
           bitable !== null;
  } catch {
    return false;
  }
}
