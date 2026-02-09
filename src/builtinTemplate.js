import ExcelJS from 'exceljs';

// 内置报价单模板 - 与模板.xlsx结构完全一致
export async function createBuiltinTemplate() {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Sheet1');

  // 设置列宽 - 与模板一致 (8列)
  sheet.columns = [
    { width: 36.88 },  // A - Items
    { width: 12.33 },  // B - Descriptions
    { width: 12.33 },  // C - Descriptions
    { width: 25.51 },  // D - Descriptions
    { width: 21.38 },  // E - Quantities
    { width: 21.38 },  // F - Unit
    { width: 19.63 },  // G - Unit Price
    { width: 16.56 },  // H - Total Price
  ];

  // 通用样式
  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // 辅助函数：创建字体对象
  function createFont(options) {
    const font = { name: 'Times New Roman', size: 14, color: { argb: 'FF000000' } };
    if (options) {
      if (options.bold) font.bold = true;
      if (options.italic) font.italic = true;
      if (options.underline) font.underline = true;
      if (options.size) font.size = options.size;
      if (options.color) font.color = { argb: options.color };
    }
    return font;
  }

  const defaultFont = createFont();

  // Row 1: 公司名称 (合并 A1:H1)
  sheet.mergeCells('A1:H1');
  const row1 = sheet.getRow(1);
  row1.height = 39;
  row1.getCell(1).value = 'GUANGDONG HELI CUTTER TECHNOLOGY CO., LTD';
  row1.getCell(1).style = {
    font: createFont({ bold: true, size: 16 }),
    alignment: { horizontal: 'center', vertical: 'middle' }
  };

  // Row 2: 公司地址和联系方式 (合并 A2:H2)
  sheet.mergeCells('A2:H2');
  const row2 = sheet.getRow(2);
  row2.height = 77;
  row2.getCell(1).value = 'Add: Room 101, Building 2, No.5 Xinjiqiao South Road, Luciguo, Wanjiang Street, Dongguan City, Guangdong Province, China. \nTEL: 0086-15382820881\nEMAIL: marketing@helicutter.com\nWEBSITE: helicutter.com';
  row2.getCell(1).style = {
    font: createFont({ italic: true, size: 11 }),
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
  };


  // Row 3: 标题 Proforma Invoice (合并 A3:H3)
  sheet.mergeCells('A3:H3');
  const row3 = sheet.getRow(3);
  row3.height = 35;
  row3.getCell(1).value = 'Proforma Invoice';
  row3.getCell(1).style = {
    font: createFont({ bold: true, size: 18 }),
    alignment: { horizontal: 'center', vertical: 'middle' }
  };

  // Row 4: Invoice NO, Date, Validity
  const row4 = sheet.getRow(4);
  row4.height = 35;
  row4.getCell(1).value = 'Invoice NO: {{订单号}}';
  row4.getCell(1).style = { font: defaultFont, alignment: { vertical: 'middle' } };
  row4.getCell(3).value = 'Date: {{日期}}';
  row4.getCell(3).style = { font: defaultFont, alignment: { vertical: 'middle' } };
  row4.getCell(7).value = 'Validity of Profoma: Two Month';
  row4.getCell(7).style = { font: defaultFont, alignment: { vertical: 'middle' } };

  // Row 5: Seller & Buyer (合并 A5:C5 和 D5:H5)
  sheet.mergeCells('A5:C5');
  sheet.mergeCells('D5:H5');
  const row5 = sheet.getRow(5);
  row5.height = 167;
  
  // Seller 信息 - 使用 RichText
  row5.getCell(1).value = {
    richText: [
      { font: createFont({ bold: true, underline: true }), text: 'Seller' },
      { font: createFont({ bold: true }), text: '\n\nGuangdong Heli Cutter Technology CO., LTD\n\nAddress: Room 101, Building 2, No. 5 Xinjiqiao South Road, Luciwo, Wanjiang District, Dongguan City, Guangdong Province, China' }
    ]
  };
  row5.getCell(1).style = { alignment: { vertical: 'top', wrapText: true } };

  // Buyer 信息 - 使用 RichText
  row5.getCell(4).value = {
    richText: [
      { font: createFont({ bold: true, underline: true }), text: 'Buyer' },
      { font: createFont({ bold: true }), text: '\n\n{{客户名称}}\n\nAddress: {{客户地址}}\n\nContact person: {{联系人}}\nPhone: {{电话}}\nEmail: {{邮箱}}' }
    ]
  };
  row5.getCell(4).style = { alignment: { vertical: 'top', wrapText: true } };

  // Row 6: 空行
  sheet.getRow(6).height = 15;

  // Row 7: 表头
  sheet.mergeCells('B7:D7');
  const row7 = sheet.getRow(7);
  row7.height = 39;
  const headers = ['Items', 'Descriptions', '', '', 'Quantities', 'Unit', 'Unit Price', 'Total Price'];
  headers.forEach((h, i) => {
    if (i === 0 || i === 1 || i >= 4) {
      const cell = row7.getCell(i + 1);
      cell.value = i === 1 ? 'Descriptions' : h;
      cell.style = {
        font: createFont({ bold: true }),
        border: thinBorder,
        alignment: { horizontal: 'center', vertical: 'middle', wrapText: true }
      };
      if (i === 6) cell.style.numFmt = '$#,##0.000;-$#,##0.000';
      if (i === 7) cell.style.numFmt = '$#,##0.00;-$#,##0.00';
    }
  });

  // Row 8-15: 数据行模板 (8行产品)
  for (let r = 8; r <= 15; r++) {
    sheet.mergeCells('B' + r + ':D' + r);
    const row = sheet.getRow(r);
    row.height = 25;
    
    if (r === 8) {
      row.getCell(1).value = '{{item}}';
      row.getCell(2).value = '{{desc}}';
      row.getCell(5).value = '{{qty}}';
      row.getCell(6).value = '{{unit}}';
      row.getCell(7).value = '{{price}}';
      row.getCell(8).value = '{{total}}';
    }
    
    row.getCell(1).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
    row.getCell(2).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'left', vertical: 'middle', wrapText: true } };
    row.getCell(5).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'center', vertical: 'middle' } };
    row.getCell(6).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'center', vertical: 'middle' } };
    row.getCell(7).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '$#,##0.000;-$#,##0.000' };
    row.getCell(8).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '$#,##0.00;-$#,##0.00' };
  }

  // Row 16: TOTAL
  sheet.mergeCells('A16:G16');
  const row16 = sheet.getRow(16);
  row16.height = 25;
  row16.getCell(1).value = 'TOTAL';
  row16.getCell(1).style = { font: createFont({ bold: true }), border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' } };
  row16.getCell(8).value = '{{TOTAL}}';
  row16.getCell(8).style = { font: createFont({ bold: true }), border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '$#,##0.00;-$#,##0.00' };

  // Row 17: DEPOSIT
  sheet.mergeCells('A17:G17');
  const row17 = sheet.getRow(17);
  row17.height = 25;
  row17.getCell(1).value = 'DEPOSIT';
  row17.getCell(1).style = { font: createFont({ bold: true }), border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' } };
  row17.getCell(8).value = '{{DEPOSIT}}';
  row17.getCell(8).style = { font: defaultFont, border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '$#,##0.00;-$#,##0.00' };

  // Row 18: BALANCE
  sheet.mergeCells('A18:G18');
  const row18 = sheet.getRow(18);
  row18.height = 25;
  row18.getCell(1).value = 'BALANCE';
  row18.getCell(1).style = { font: createFont({ bold: true }), border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' } };
  row18.getCell(8).value = '{{BALANCE}}';
  row18.getCell(8).style = { font: createFont({ bold: true, color: 'FFFF0000' }), border: thinBorder, alignment: { horizontal: 'right', vertical: 'middle' }, numFmt: '$#,##0.00;-$#,##0.00' };

  // Row 19: 空行
  sheet.getRow(19).height = 15;

  // Row 20: 1.Production Note
  const row20 = sheet.getRow(20);
  row20.getCell(1).value = '1.Production Note';
  row20.getCell(1).style = { font: createFont({ bold: true }) };

  // Row 21-22: 生产备注
  sheet.getRow(21).getCell(1).value = '{{生产备注1}}';
  sheet.getRow(21).getCell(1).style = { font: defaultFont };
  sheet.getRow(22).getCell(1).value = '{{生产备注2}}';
  sheet.getRow(22).getCell(1).style = { font: defaultFont };

  // Row 23: 空行
  sheet.getRow(23).height = 15;

  // Row 24: 2. Shipment Term
  const row24 = sheet.getRow(24);
  row24.height = 17.25;
  row24.getCell(1).value = '2. Shippment Term';
  row24.getCell(1).style = { font: createFont({ bold: true }) };

  // Row 25: 运输条款
  sheet.getRow(25).getCell(1).value = '- {{运输条款}}';
  sheet.getRow(25).getCell(1).style = { font: defaultFont };

  // Row 26: 交货日期
  sheet.getRow(26).getCell(1).value = {
    richText: [
      { font: defaultFont, text: '- Latest date of delivery: ' },
      { font: createFont({ color: 'FFFF0000' }), text: '{{交货天数}}' },
      { font: defaultFont, text: " days after the customer's deposit" }
    ]
  };

  // Row 27: 空行
  sheet.getRow(27).height = 15;

  // Row 28: 3. Payment terms
  sheet.getRow(28).getCell(1).value = '3. Payment terms: TT';
  sheet.getRow(28).getCell(1).style = { font: createFont({ bold: true }) };

  // Row 29: Deposit 说明
  const row29 = sheet.getRow(29);
  row29.getCell(1).value = '- Deposit';
  row29.getCell(1).style = { font: defaultFont };
  row29.getCell(2).value = '{{DEPOSIT}}';
  row29.getCell(2).style = { font: defaultFont, numFmt: '$#,##0.00' };
  row29.getCell(3).value = 'TT in advance of the purchase value within 03 working days from the date of PI.';
  row29.getCell(3).style = { font: defaultFont };

  // Row 30: Balance 说明
  sheet.getRow(30).getCell(1).value = {
    richText: [
      { font: defaultFont, text: '- ' },
      { font: defaultFont, text: 'The balance of the purchase value will be paid before the loading.' }
    ]
  };

  // Row 31: 空行
  sheet.getRow(31).height = 15;

  // Row 32: Seller's Bank Information
  sheet.getRow(32).getCell(1).value = "Seller's Bank Information:";
  sheet.getRow(32).getCell(1).style = { font: createFont({ bold: true }) };

  // Row 33-37: 银行信息
  const bankInfo = [
    ['BENEFICIARY', 'GUANGDONG HELI CUTTER TECHNOLOGY CO., LIMITED'],
    ['BANK NAME', 'CITIBANK N.A.HONG KONG BRANCH'],
    ['SWIFT CODE', 'CITIHKHX'],
    ['BANK ADDRESS', 'Champion Tower THREE Garden ROAD CENTRAL, HONG KONG'],
    ['ACCOUNT', '342581976']
  ];
  
  for (let i = 0; i < bankInfo.length; i++) {
    const row = sheet.getRow(33 + i);
    row.getCell(1).value = bankInfo[i][0];
    row.getCell(1).style = { font: defaultFont };
    row.getCell(2).value = bankInfo[i][1];
    row.getCell(2).style = { font: defaultFont };
  }

  // Row 38: 空行
  sheet.getRow(38).height = 15;

  // Row 39: 备注
  sheet.getRow(39).getCell(1).value = {
    richText: [
      { font: createFont({ color: 'FFFF0000' }), text: 'Note: ' },
      { font: defaultFont, text: '{{备注}}' }
    ]
  };

  // Row 40: SELLER SIGNATURE
  sheet.getRow(40).getCell(7).value = 'SELLER SIGNATURE';
  sheet.getRow(40).getCell(7).style = { font: createFont({ bold: true }), alignment: { horizontal: 'center' } };

  // 设置打印区域
  sheet.pageSetup = {
    paperSize: 9,
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
  };

  return wb;
}

// Logo SVG
export const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="none" stroke="#1a56db" stroke-width="2"/><path d="M20 25 L30 15 L40 25 L40 45 L20 45 Z" fill="#1a56db"/><text x="30" y="38" text-anchor="middle" fill="white" font-size="10" font-weight="bold">HELI</text></svg>';

// 印章 SVG
export const STAMP_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#cc0000" stroke-width="3"/><circle cx="50" cy="50" r="38" fill="none" stroke="#cc0000" stroke-width="1"/><text x="50" y="35" text-anchor="middle" fill="#cc0000" font-size="8" font-weight="bold">GUANGDONG HELI CUTTER</text><text x="50" y="50" text-anchor="middle" fill="#cc0000" font-size="10" font-weight="bold">★</text><text x="50" y="65" text-anchor="middle" fill="#cc0000" font-size="8" font-weight="bold">TECHNOLOGY CO., LTD</text><text x="50" y="78" text-anchor="middle" fill="#cc0000" font-size="6">CONTRACT SEAL</text></svg>';
