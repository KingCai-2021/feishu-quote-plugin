import ExcelJS from 'exceljs';

export async function parseExcelFile(file) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);
  
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new Error('Excel 文件中没有工作表');
  }
  
  const fields = [];
  const data = [];
  
  // 读取表头（第一行）
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const value = cell.value?.toString().trim();
    if (value) {
      fields.push(value);
    }
  });
  
  if (fields.length === 0) {
    throw new Error('未找到有效的表头');
  }
  
  // 读取数据行
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // 跳过表头
    
    const rowData = {};
    let hasData = false;
    
    fields.forEach((field, index) => {
      const cell = row.getCell(index + 1);
      let value = '';
      
      if (cell.value !== null && cell.value !== undefined) {
        if (cell.value instanceof Date) {
          value = cell.value.toLocaleDateString('zh-CN');
        } else if (typeof cell.value === 'object' && cell.value.text) {
          value = cell.value.text;
        } else if (typeof cell.value === 'object' && cell.value.result) {
          value = cell.value.result.toString();
        } else {
          value = cell.value.toString();
        }
        hasData = true;
      }
      
      rowData[field] = value;
    });
    
    if (hasData) {
      data.push(rowData);
    }
  });
  
  return { fields, data };
}
