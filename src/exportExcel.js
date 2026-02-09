import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

export async function exportToExcel(htmlContent, settings) {
  const workbook = createWorkbook([htmlContent], settings, false);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `文档_${Date.now()}.xlsx`);
}

export async function exportBatchExcel(templates, settings, outputMode, dataList, fields) {
  if (outputMode === 'merge') {
    // 合并为一个文件 - 使用表格形式
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '飞书排版打印插件';
    
    const sheet = workbook.addWorksheet('数据汇总');
    
    // 表头
    sheet.addRow(['序号', ...fields]);
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3370FF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = getBorder();
    });
    headerRow.height = 25;
    
    // 数据行
    dataList.forEach((data, index) => {
      const rowData = [index + 1, ...fields.map(f => data[f] || '')];
      const row = sheet.addRow(rowData);
      row.eachCell(cell => {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = getBorder();
      });
    });
    
    // 设置列宽
    sheet.columns.forEach((col, i) => {
      col.width = i === 0 ? 8 : 15;
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `批量数据_${Date.now()}.xlsx`);
  } else {
    // 每条数据单独文件
    const zip = new JSZip();
    
    for (let i = 0; i < templates.length; i++) {
      const workbook = createWorkbook([templates[i]], settings, false);
      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `文档_${dataList[i].姓名 || dataList[i][Object.keys(dataList[i])[0]] || i + 1}.xlsx`;
      zip.file(fileName, buffer);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `批量文档_${Date.now()}.zip`);
  }
}

function createWorkbook(templates, settings, addSheets) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = '飞书排版打印插件';
  workbook.created = new Date();
  
  templates.forEach((template, index) => {
    const sheetName = addSheets ? `文档${index + 1}` : '文档内容';
    const sheet = workbook.addWorksheet(sheetName);
    
    parseHtmlToExcel(template, sheet);
    
    // 设置页眉页脚
    if (settings.header) {
      sheet.headerFooter.oddHeader = settings.header;
    }
    if (settings.footer) {
      sheet.headerFooter.oddFooter = settings.footer;
    }
  });
  
  return workbook;
}

function parseHtmlToExcel(html, sheet) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  let rowIndex = 1;
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        const row = sheet.getRow(rowIndex++);
        row.getCell(1).value = text;
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const tag = node.tagName.toLowerCase();
    
    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3': {
        const row = sheet.getRow(rowIndex++);
        const cell = row.getCell(1);
        cell.value = node.textContent;
        cell.font = { bold: true, size: tag === 'h1' ? 18 : tag === 'h2' ? 16 : 14 };
        cell.alignment = { horizontal: getExcelAlign(node.style?.textAlign) };
        row.height = tag === 'h1' ? 30 : 25;
        break;
      }
      case 'p':
      case 'div': {
        const text = node.textContent.trim();
        if (text) {
          const row = sheet.getRow(rowIndex++);
          row.getCell(1).value = text;
        }
        break;
      }
      case 'hr': {
        const row = sheet.getRow(rowIndex++);
        row.getCell(1).value = '─'.repeat(30);
        row.getCell(1).font = { color: { argb: 'FF999999' } };
        break;
      }
      case 'ul':
      case 'ol':
        node.querySelectorAll('li').forEach((li, index) => {
          const bullet = tag === 'ul' ? '• ' : `${index + 1}. `;
          const row = sheet.getRow(rowIndex++);
          row.getCell(1).value = bullet + li.textContent;
        });
        break;
      case 'table':
        processTable(node, sheet, rowIndex);
        rowIndex += node.querySelectorAll('tr').length;
        break;
      default:
        Array.from(node.childNodes).forEach(processNode);
    }
  }
  
  Array.from(doc.body.childNodes).forEach(processNode);
  
  // 设置默认列宽
  sheet.getColumn(1).width = 60;
}

function processTable(tableNode, sheet, startRow) {
  let rowIndex = startRow;
  
  tableNode.querySelectorAll('tr').forEach(tr => {
    const row = sheet.getRow(rowIndex++);
    let colIndex = 1;
    
    tr.querySelectorAll('th, td').forEach(cell => {
      const excelCell = row.getCell(colIndex++);
      excelCell.value = cell.textContent;
      excelCell.border = getBorder();
      
      if (cell.tagName.toLowerCase() === 'th') {
        excelCell.font = { bold: true };
        excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
      }
      
      excelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });
}

function getBorder() {
  return {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };
}

function getExcelAlign(align) {
  switch (align) {
    case 'center': return 'center';
    case 'right': return 'right';
    default: return 'left';
  }
}
