import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, PageNumber, PageBreak, AlignmentType, BorderStyle, convertMillimetersToTwip } from 'docx';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

const PAPER_SIZES = {
  A4: { width: 11906, height: 16838 },
  A3: { width: 16838, height: 23811 },
  Letter: { width: 12240, height: 15840 }
};

export async function exportToWord(htmlContent, settings) {
  const doc = createDocument([htmlContent], settings, false);
  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  saveAs(blob, `文档_${Date.now()}.docx`);
}

export async function exportBatchWord(templates, settings, outputMode, dataList) {
  if (outputMode === 'merge') {
    // 合并为一个文件
    const doc = createDocument(templates, settings, true);
    const buffer = await Packer.toBuffer(doc);
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, `批量文档_${Date.now()}.docx`);
  } else {
    // 每条数据单独文件，打包为 zip
    const zip = new JSZip();
    
    for (let i = 0; i < templates.length; i++) {
      const doc = createDocument([templates[i]], settings, false);
      const buffer = await Packer.toBuffer(doc);
      const fileName = `文档_${dataList[i].姓名 || dataList[i][Object.keys(dataList[i])[0]] || i + 1}.docx`;
      zip.file(fileName, buffer);
    }
    
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `批量文档_${Date.now()}.zip`);
  }
}

function createDocument(templates, settings, addPageBreaks) {
  const { paperSize, orientation, margins, header, footer, showPageNumber } = settings;
  
  const size = PAPER_SIZES[paperSize] || PAPER_SIZES.A4;
  const pageSize = orientation === 'landscape' 
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
  
  const children = [];
  
  templates.forEach((template, index) => {
    const elements = parseHtmlToDocx(template);
    children.push(...elements);
    
    // 添加分页符（除了最后一个）
    if (addPageBreaks && index < templates.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });
  
  return new Document({
    sections: [{
      properties: {
        page: {
          size: pageSize,
          margin: {
            top: convertMillimetersToTwip(margins.top),
            right: convertMillimetersToTwip(margins.right),
            bottom: convertMillimetersToTwip(margins.bottom),
            left: convertMillimetersToTwip(margins.left)
          }
        }
      },
      headers: header ? {
        default: new Header({
          children: [new Paragraph({ children: [new TextRun(header)], alignment: AlignmentType.CENTER })]
        })
      } : undefined,
      footers: (footer || showPageNumber) ? {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                ...(footer ? [new TextRun(footer + '  ')] : []),
                ...(showPageNumber ? [new TextRun('第 '), PageNumber.CURRENT, new TextRun(' 页')] : [])
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        })
      } : undefined,
      children
    }]
  });
}

function parseHtmlToDocx(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = [];
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        elements.push(new Paragraph({ children: [new TextRun(text)] }));
      }
      return;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const tag = node.tagName.toLowerCase();
    const style = node.style || {};
    const align = getAlignment(style.textAlign);
    
    switch (tag) {
      case 'h1':
        elements.push(new Paragraph({
          children: [new TextRun({ text: node.textContent, bold: true, size: 48 })],
          alignment: align, spacing: { after: 200 }
        }));
        break;
      case 'h2':
        elements.push(new Paragraph({
          children: [new TextRun({ text: node.textContent, bold: true, size: 36 })],
          alignment: align, spacing: { after: 160 }
        }));
        break;
      case 'h3':
        elements.push(new Paragraph({
          children: [new TextRun({ text: node.textContent, bold: true, size: 28 })],
          alignment: align, spacing: { after: 120 }
        }));
        break;
      case 'p':
      case 'div':
        const runs = parseInlineElements(node);
        if (runs.length > 0) {
          elements.push(new Paragraph({ children: runs, alignment: align, spacing: { after: 100 } }));
        }
        break;
      case 'hr':
        elements.push(new Paragraph({
          children: [new TextRun({ text: '─'.repeat(50) })],
          spacing: { before: 100, after: 100 }
        }));
        break;
      case 'ul':
      case 'ol':
        node.querySelectorAll('li').forEach((li, index) => {
          const bullet = tag === 'ul' ? '• ' : `${index + 1}. `;
          elements.push(new Paragraph({
            children: [new TextRun(bullet + li.textContent)],
            spacing: { after: 60 }
          }));
        });
        break;
      case 'table':
        elements.push(parseTable(node));
        break;
      default:
        Array.from(node.childNodes).forEach(processNode);
    }
  }
  
  Array.from(doc.body.childNodes).forEach(processNode);
  return elements.length > 0 ? elements : [new Paragraph({ children: [new TextRun('')] })];
}

function parseInlineElements(node) {
  const runs = [];
  
  function traverse(n, styles = {}) {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = n.textContent;
      if (text) {
        runs.push(new TextRun({ text, ...styles }));
      }
      return;
    }
    
    if (n.nodeType === Node.ELEMENT_NODE) {
      const tag = n.tagName.toLowerCase();
      const newStyles = { ...styles };
      
      if (tag === 'b' || tag === 'strong') newStyles.bold = true;
      if (tag === 'i' || tag === 'em') newStyles.italics = true;
      if (tag === 'u') newStyles.underline = {};
      
      Array.from(n.childNodes).forEach(child => traverse(child, newStyles));
    }
  }
  
  Array.from(node.childNodes).forEach(child => traverse(child));
  return runs;
}

function parseTable(tableNode) {
  const rows = [];
  
  tableNode.querySelectorAll('tr').forEach(tr => {
    const cells = [];
    tr.querySelectorAll('th, td').forEach(cell => {
      cells.push(new TableCell({
        children: [new Paragraph({ children: [new TextRun(cell.textContent)] })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 }
        }
      }));
    });
    if (cells.length > 0) {
      rows.push(new TableRow({ children: cells }));
    }
  });
  
  return new Table({ rows });
}

function getAlignment(align) {
  switch (align) {
    case 'center': return AlignmentType.CENTER;
    case 'right': return AlignmentType.RIGHT;
    case 'justify': return AlignmentType.JUSTIFIED;
    default: return AlignmentType.LEFT;
  }
}
