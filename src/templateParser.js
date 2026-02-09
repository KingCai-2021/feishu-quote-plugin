import ExcelJS from 'exceljs';

// Excel 模板解析器 - 将 Excel 转换为 HTML 模板
export class TemplateParser {
  constructor() {
    this.images = [];      // 提取的图片 { name, data, position }
    this.placeholders = []; // 发现的占位符 {{ xxx }}
    this.htmlTemplate = '';
  }

  // 解析 Excel 文件
  async parse(file) {
    const wb = new ExcelJS.Workbook();
    const buffer = await file.arrayBuffer();
    await wb.xlsx.load(buffer);
    
    const sheet = wb.worksheets[0];
    if (!sheet) {
      throw new Error('Excel 文件没有工作表');
    }

    // 提取图片
    this.extractImages(sheet);
    
    // 提取占位符
    this.extractPlaceholders(sheet);
    
    // 生成 HTML 模板
    this.htmlTemplate = this.generateHtml(sheet);
    
    return {
      html: this.htmlTemplate,
      images: this.images,
      placeholders: this.placeholders
    };
  }

  // 提取图片
  extractImages(sheet) {
    this.images = [];
    
    if (sheet.getImages && sheet.getImages().length > 0) {
      const images = sheet.getImages();
      images.forEach((img, idx) => {
        const imageId = img.imageId;
        const workbook = sheet.workbook;
        const image = workbook.getImage(imageId);
        
        if (image && image.buffer) {
          const ext = image.extension || 'png';
          const name = `template_img_${idx}.${ext}`;
          const base64 = this.bufferToBase64(image.buffer);
          
          this.images.push({
            name,
            data: `data:image/${ext};base64,${base64}`,
            position: img.range ? {
              row: img.range.tl.row,
              col: img.range.tl.col
            } : null
          });
        }
      });
    }
  }

  // Buffer 转 Base64
  bufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // 提取占位符 {{ xxx }}
  extractPlaceholders(sheet) {
    const placeholderSet = new Set();
    const regex = /\{\{([^}]+)\}\}/g;
    
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        const value = this.getCellText(cell);
        let match;
        while ((match = regex.exec(value)) !== null) {
          placeholderSet.add(match[1].trim());
        }
      });
    });
    
    this.placeholders = Array.from(placeholderSet);
  }

  // 获取单元格文本
  getCellText(cell) {
    if (!cell.value) return '';
    
    if (typeof cell.value === 'string') {
      return cell.value;
    }
    
    if (typeof cell.value === 'number') {
      return String(cell.value);
    }
    
    if (cell.value.richText) {
      return cell.value.richText.map(rt => rt.text || '').join('');
    }
    
    if (cell.value.text) {
      return cell.value.text;
    }
    
    return String(cell.value);
  }

  // 生成 HTML 模板
  generateHtml(sheet) {
    const merges = this.getMerges(sheet);
    const colWidths = this.getColumnWidths(sheet);
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', serif; font-size: 14px; color: #000; background: #fff; }
    .container { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm; position: relative; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    td { padding: 4px 6px; vertical-align: middle; word-wrap: break-word; }
    .border { border: 1px solid #000; }
    .tc { text-align: center; }
    .tr { text-align: right; }
    .tl { text-align: left; }
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .underline { text-decoration: underline; }
    .red { color: #cc0000; }
    .wrap { white-space: pre-wrap; }
    img.template-img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
  <div class="container">
`;

    // 添加图片（绝对定位）
    this.images.forEach((img, idx) => {
      if (img.position) {
        html += `    <img class="template-img" src="${img.data}" style="position:absolute; top:${img.position.row * 20}px; left:${img.position.col * 80}px; max-width:100px;" alt="img${idx}">\n`;
      }
    });

    html += '    <table>\n';
    
    // 生成列宽
    html += '      <colgroup>\n';
    colWidths.forEach(w => {
      const pct = (w / totalWidth * 100).toFixed(2);
      html += `        <col style="width:${pct}%">\n`;
    });
    html += '      </colgroup>\n';

    // 生成行
    sheet.eachRow((row, rowNum) => {
      const rowHeight = row.height || 20;
      html += `      <tr style="height:${rowHeight}px">\n`;
      
      const processedCols = new Set();
      
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (processedCols.has(colNum)) return;
        
        // 检查是否是合并单元格的一部分
        const mergeInfo = this.getMergeInfo(merges, rowNum, colNum);
        
        if (mergeInfo) {
          if (mergeInfo.isStart) {
            // 合并单元格的起始位置
            const colspan = mergeInfo.endCol - mergeInfo.startCol + 1;
            const rowspan = mergeInfo.endRow - mergeInfo.startRow + 1;
            
            const cellHtml = this.generateCellHtml(cell, colspan, rowspan);
            html += cellHtml;
            
            // 标记已处理的列
            for (let c = colNum; c <= mergeInfo.endCol; c++) {
              processedCols.add(c);
            }
          }
          // 如果不是起始位置，跳过（已被合并）
        } else {
          // 普通单元格
          html += this.generateCellHtml(cell, 1, 1);
          processedCols.add(colNum);
        }
      });
      
      html += '      </tr>\n';
    });
    
    html += `    </table>
  </div>
</body>
</html>`;
    
    return html;
  }

  // 获取合并单元格信息
  getMerges(sheet) {
    const merges = [];
    if (sheet.model && sheet.model.merges) {
      sheet.model.merges.forEach(merge => {
        // merge 格式: "A1:C3"
        const match = merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
        if (match) {
          merges.push({
            startCol: this.colToNum(match[1]),
            startRow: parseInt(match[2]),
            endCol: this.colToNum(match[3]),
            endRow: parseInt(match[4])
          });
        }
      });
    }
    return merges;
  }

  // 检查单元格是否在合并区域内
  getMergeInfo(merges, row, col) {
    for (const m of merges) {
      if (row >= m.startRow && row <= m.endRow && col >= m.startCol && col <= m.endCol) {
        return {
          ...m,
          isStart: row === m.startRow && col === m.startCol
        };
      }
    }
    return null;
  }

  // 列字母转数字
  colToNum(col) {
    let num = 0;
    for (let i = 0; i < col.length; i++) {
      num = num * 26 + (col.charCodeAt(i) - 64);
    }
    return num;
  }

  // 获取列宽
  getColumnWidths(sheet) {
    const widths = [];
    const colCount = sheet.columnCount || 8;
    
    for (let i = 1; i <= colCount; i++) {
      const col = sheet.getColumn(i);
      widths.push(col.width || 10);
    }
    
    return widths;
  }

  // 生成单元格 HTML
  generateCellHtml(cell, colspan, rowspan) {
    const text = this.getCellText(cell);
    const style = cell.style || {};
    
    let classes = [];
    let inlineStyle = '';
    
    // 边框
    if (style.border && (style.border.top || style.border.bottom || style.border.left || style.border.right)) {
      classes.push('border');
    }
    
    // 对齐
    if (style.alignment) {
      if (style.alignment.horizontal === 'center') classes.push('tc');
      else if (style.alignment.horizontal === 'right') classes.push('tr');
      else classes.push('tl');
      
      if (style.alignment.vertical === 'top') inlineStyle += 'vertical-align:top;';
      else if (style.alignment.vertical === 'bottom') inlineStyle += 'vertical-align:bottom;';
      
      if (style.alignment.wrapText) classes.push('wrap');
    }
    
    // 字体
    if (style.font) {
      if (style.font.bold) classes.push('bold');
      if (style.font.italic) classes.push('italic');
      if (style.font.underline) classes.push('underline');
      if (style.font.size) inlineStyle += `font-size:${style.font.size}px;`;
      if (style.font.color && style.font.color.argb) {
        const color = '#' + style.font.color.argb.slice(2);
        if (color.toLowerCase() === '#ff0000' || color.toLowerCase() === '#cc0000') {
          classes.push('red');
        } else {
          inlineStyle += `color:${color};`;
        }
      }
    }
    
    // 背景色
    if (style.fill && style.fill.fgColor && style.fill.fgColor.argb) {
      const bgColor = '#' + style.fill.fgColor.argb.slice(2);
      inlineStyle += `background-color:${bgColor};`;
    }
    
    let attrs = '';
    if (colspan > 1) attrs += ` colspan="${colspan}"`;
    if (rowspan > 1) attrs += ` rowspan="${rowspan}"`;
    if (classes.length) attrs += ` class="${classes.join(' ')}"`;
    if (inlineStyle) attrs += ` style="${inlineStyle}"`;
    
    // 处理富文本
    let content = this.formatCellContent(cell);
    
    return `        <td${attrs}>${content}</td>\n`;
  }

  // 格式化单元格内容（处理富文本）
  formatCellContent(cell) {
    if (!cell.value) return '&nbsp;';
    
    if (cell.value.richText) {
      return cell.value.richText.map(rt => {
        let text = rt.text || '';
        text = this.escapeHtml(text);
        
        if (rt.font) {
          if (rt.font.bold) text = `<b>${text}</b>`;
          if (rt.font.italic) text = `<i>${text}</i>`;
          if (rt.font.underline) text = `<u>${text}</u>`;
          if (rt.font.color && rt.font.color.argb) {
            const color = '#' + rt.font.color.argb.slice(2);
            text = `<span style="color:${color}">${text}</span>`;
          }
        }
        
        return text;
      }).join('');
    }
    
    return this.escapeHtml(this.getCellText(cell));
  }

  // HTML 转义
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }
}

// 填充模板数据
export function fillTemplate(htmlTemplate, data, productItems = []) {
  let html = htmlTemplate;
  
  // 替换主表字段占位符
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g');
    html = html.replace(regex, value || '');
  }
  
  // 处理产品行（如果模板中有产品占位符）
  // 这里简化处理，实际可能需要更复杂的逻辑
  
  // 清理未替换的占位符
  html = html.replace(/\{\{[^}]+\}\}/g, '');
  
  return html;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
