import { bitable } from '@lark-base-open/js-sdk';

// 从飞书云文档获取内容
export async function loadFeishuDocument(url) {
  // 解析文档 ID
  const docMatch = url.match(/\/docx\/([a-zA-Z0-9]+)/);
  if (!docMatch) {
    throw new Error('无效的飞书文档链接');
  }
  
  const docToken = docMatch[1];
  
  try {
    // 使用飞书 API 获取文档内容
    // 注意：需要在飞书开放平台配置相应权限
    const response = await fetch(`/api/doc/${docToken}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取文档失败');
    }
    
    const data = await response.json();
    return parseDocContent(data);
  } catch (error) {
    // 如果 API 调用失败，提示用户手动导出
    throw new Error('无法直接获取飞书文档，请将文档导出为 .docx 后上传');
  }
}

// 从飞书电子表格获取内容
export async function loadFeishuSheet(url) {
  // 解析表格 ID
  const sheetMatch = url.match(/\/sheets\/([a-zA-Z0-9]+)/);
  if (!sheetMatch) {
    throw new Error('无效的飞书电子表格链接');
  }
  
  const sheetToken = sheetMatch[1];
  
  try {
    const response = await fetch(`/api/sheet/${sheetToken}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取表格失败');
    }
    
    const data = await response.json();
    return parseSheetContent(data);
  } catch (error) {
    throw new Error('无法直接获取飞书表格，请将表格导出为 .xlsx 后上传');
  }
}

// 解析文档内容
function parseDocContent(data) {
  // 提取文本内容和占位符
  const content = data.content || '';
  const placeholders = extractPlaceholders(content);
  
  return {
    type: 'feishu-doc',
    content,
    placeholders,
    raw: data
  };
}

// 解析表格内容
function parseSheetContent(data) {
  const placeholders = new Set();
  const cells = data.cells || [];
  
  cells.forEach(cell => {
    const value = cell.value?.toString() || '';
    const matches = value.match(/\{\{([^}]+)\}\}/g);
    if (matches) {
      matches.forEach(m => {
        placeholders.add(m.replace(/\{\{|\}\}/g, ''));
      });
    }
  });
  
  return {
    type: 'feishu-sheet',
    placeholders: Array.from(placeholders),
    raw: data
  };
}

// 提取占位符
function extractPlaceholders(text) {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  const placeholders = new Set();
  
  matches.forEach(m => {
    const field = m.replace(/\{\{|\}\}/g, '').trim();
    if (field && !field.startsWith('#') && !field.startsWith('/')) {
      placeholders.add(field);
    }
  });
  
  return Array.from(placeholders);
}

// 在飞书环境中，可以使用 bitable API 获取关联的文档
export async function getLinkedDocuments() {
  try {
    // 这个功能需要飞书多维表格支持
    // 目前作为预留接口
    return [];
  } catch (error) {
    console.error('获取关联文档失败:', error);
    return [];
  }
}
