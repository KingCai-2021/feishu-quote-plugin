// Seller 公司信息配置（可修改）
const SELLER_CONFIG = {
  companyName: 'Guangdong Heli Cutter Technology CO., LTD',
  companyNameFull: 'GUANGDONG HELI CUTTER TECHNOLOGY CO., LTD',
  address: 'Room 101, Building 2, No. 5 Xinjiqiao South Road, Luciwo, Wanjiang District, Dongguan City, Guangdong Province, China',
  tel: '0086-15382820881',
  email: 'marketing@helicutter.com',
  website: 'helicutter.com',
  beneficiary: 'GUANGDONG HELI CUTTER TECHNOLOGY CO., LIMITED',
  bankName: 'CITIBANK N.A.HONG KONG BRANCH',
  swiftCode: 'CITIHKHX',
  bankAddress: 'Champion Tower THREE Garden ROAD CENTRAL, HONG KONG',
  account: '342581976'
};

// 使用 public 文件夹中的 logo
const LOGO_URL = './logo.png';

// 预览函数
export function generatePreviewHtml(data, linkedItems, sellerConfig, docTitle, showStamp, stampData) {
  // 获取数据 - 支持多种字段名
  const invoiceNo = data['报价单编号'] || data['订单号'] || data['编号'] || '';
  const date = data['日期'] || data['Date'] || new Date().toLocaleDateString('zh-CN');
  // Seller 信息 - 优先使用传入的配置
  const seller = sellerConfig || SELLER_CONFIG;
  if (!seller.companyNameFull) {
    seller.companyNameFull = (seller.companyName || '').toUpperCase();
  }
  
  // 文档标题
  const title = docTitle || 'Proforma Invoice';
  
  // Buyer 信息 - 从数据中获取
  const buyerName = data['客户名称'] || data['客户'] || '';
  const buyerAddress = data['客户地址'] || data['地址'] || '';
  const contactPerson = data['联系人'] || data['Contact'] || '';
  const phone = data['电话'] || data['Phone'] || '';
  const email = data['邮箱'] || data['Email'] || '';
  const salesperson = data['卖家姓名'] || data['销售员'] || data['业务员'] || data['人员'] || '';
  
  // 获取备注和条款
  const productionNote1 = data['生产备注1'] || data['生产备注'] || '';
  const productionNote2 = data['生产备注2'] || '';
  const shippingTerm = data['运输条款'] || data['贸易条款'] || 'FOB Shenzhen';
  const deliveryDays = data['交货天数'] || data['交期'] || '30';
  const note = data['备注'] || data['Note'] || '';
  const depositRate = parseFloat(data['定金比例'] || '30') / 100;
  
  // 计算总价
  let totalAmount = 0;
  
  // 生成产品行 HTML - 动态行数
  let productRowsHtml = '';
  for (const item of linkedItems) {
    if (item) {
      // 支持多种字段名
      const itemName = item['产品名称'] || item['对应产品品类'] || item['Items'] || item['品名'] || '';
      const itemDesc = item['产品编号-SKU'] || item['SKU'] || item['Descriptions'] || item['产品编号'] || '';
      const qty = parseFloat(item['订购数量'] || item['数量'] || item['Quantities'] || 0);
      const unit = item['单位'] || item['Unit'] || 'pcs';
      const price = parseFloat(item['报价（外币）'] || item['单价'] || item['Unit Price'] || item['报价'] || 0);
      let total = parseFloat(item['报价总价（外币）'] || item['单项总价（外币）'] || item['总价'] || item['Total Price'] || 0);
      
      // 如果没有总价但有单价和数量，计算总价
      if (total === 0 && price > 0 && qty > 0) {
        total = price * qty;
      }
      
      totalAmount += total;
      
      const priceStr = price > 0 ? '$' + price.toFixed(3) : '';
      const totalStr = total > 0 ? '$' + total.toFixed(2) : '';
      
      productRowsHtml += '<tr>' +
        '<td class="border">' + itemName + '</td>' +
        '<td class="border" colspan="3">' + itemDesc + '</td>' +
        '<td class="border tc">' + (qty > 0 ? qty : '') + '</td>' +
        '<td class="border tc">' + unit + '</td>' +
        '<td class="border tc">' + priceStr + '</td>' +
        '<td class="border tc">' + totalStr + '</td>' +
        '</tr>';
    }
  }

  // 如果没有产品数据，显示一行空行
  if (productRowsHtml === '') {
    productRowsHtml = '<tr>' +
      '<td class="border">&nbsp;</td>' +
      '<td class="border" colspan="3">&nbsp;</td>' +
      '<td class="border">&nbsp;</td>' +
      '<td class="border">&nbsp;</td>' +
      '<td class="border">&nbsp;</td>' +
      '<td class="border">&nbsp;</td>' +
      '</tr>';
  }

  // 计算定金和余额
  const deposit = totalAmount * depositRate;
  const balance = totalAmount - deposit;
  
  const totalStr = '$' + totalAmount.toFixed(2);
  const depositStr = '$' + deposit.toFixed(2);
  const balanceStr = '$' + balance.toFixed(2);

  // 生成完整 HTML
  return '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <style>' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }' +
'    html, body { width: 210mm; height: 297mm; overflow: hidden; }' +
'    body { font-family: "Times New Roman", serif; font-size: 12px; color: #000; background: #fff; }' +
'    .container { width: 210mm; height: 297mm; padding: 6mm 8mm; position: relative; overflow: hidden; }' +
'    table { width: 100%; border-collapse: collapse; }' +
'    .border { border: 1px solid #000; padding: 2px 4px; }' +
'    .tc { text-align: center; }' +
'    .tr { text-align: right; }' +
'    .bold { font-weight: bold; }' +
'    .red { color: #cc0000; }' +
'    .underline { text-decoration: underline; }' +
'    .italic { font-style: italic; }' +
'    .vm { vertical-align: middle; }' +
'    .vt { vertical-align: top; }' +
'    .logo { position: absolute; top: 6mm; left: 8mm; width: 45px; height: 45px; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="container">' +
'    <img class="logo" src="' + LOGO_URL + '" alt="Logo">' +
'    <table>' +
'      <tr style="height: 28px;">' +
'        <td colspan="8" class="tc bold" style="font-size: 14px;">' + seller.companyNameFull + '</td>' +
'      </tr>' +
'      <tr style="height: 48px;">' +
'        <td colspan="8" class="tc italic" style="font-size: 9px; white-space: pre-wrap;">' +
'Add: ' + seller.address + '\nTEL: ' + seller.tel + '  EMAIL: ' + seller.email + '  WEBSITE: ' + seller.website + '</td>' +
'      </tr>' +
'      <tr style="height: 24px;">' +
'        <td colspan="8" class="tc bold" style="font-size: 14px;">' + title + '</td>' +
'      </tr>' +
'      <tr style="height: 22px;">' +
'        <td colspan="2" class="vm" style="font-size: 11px;">Invoice NO: ' + invoiceNo + '</td>' +
'        <td colspan="2" class="vm" style="font-size: 11px;">Date: ' + date + '</td>' +
'        <td colspan="4" class="vm tr" style="font-size: 11px;">Validity of Profoma: Two Month</td>' +
'      </tr>' +
'      <tr>' +
'        <td colspan="4" class="vt" style="padding: 6px 4px; height: 100px;">' +
'          <div class="bold underline" style="margin-bottom: 4px;">Seller</div>' +
'          <div class="bold" style="margin-bottom: 4px; font-size: 11px;">' + seller.companyName + '</div>' +
'          <div style="margin-bottom: 2px; font-size: 10px;">Address: ' + seller.address + '</div>' +
'          <div style="margin-bottom: 2px; font-size: 11px;">Contact person: ' + salesperson + '</div>' +
'          <div style="margin-bottom: 2px; font-size: 11px;">Phone: ' + seller.tel + '</div>' +
'          <div style="font-size: 11px;">Email: ' + seller.email + '</div>' +
'        </td>' +
'        <td colspan="4" class="vt" style="padding: 6px 4px; height: 100px;">' +
'          <div class="bold underline" style="margin-bottom: 4px;">Buyer</div>' +
'          <div style="margin-bottom: 2px; font-size: 10px;">Address: ' + buyerAddress + '</div>' +
'          <div style="margin-bottom: 2px; font-size: 11px;">Contact person: ' + (contactPerson || buyerName) + '</div>' +
'          <div style="margin-bottom: 2px; font-size: 11px;">Phone: ' + phone + '</div>' +
'          <div style="font-size: 11px;">Email: ' + email + '</div>' +
'        </td>' +
'      </tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr style="height: 24px;">' +
'        <td class="border tc bold vm">Items</td>' +
'        <td class="border tc bold vm" colspan="3">Descriptions</td>' +
'        <td class="border tc bold vm">Quantities</td>' +
'        <td class="border tc bold vm">Unit</td>' +
'        <td class="border tc bold vm">Unit Price</td>' +
'        <td class="border tc bold vm">Total Price</td>' +
'      </tr>' +
       productRowsHtml +
'      <tr style="height: 20px;">' +
'        <td class="border tc bold" colspan="7">TOTAL</td>' +
'        <td class="border tc bold">' + totalStr + '</td>' +
'      </tr>' +
'      <tr style="height: 20px;">' +
'        <td class="border tc bold" colspan="7">DEPOSIT</td>' +
'        <td class="border tc">' + depositStr + '</td>' +
'      </tr>' +
'      <tr style="height: 20px;">' +
'        <td class="border tc bold" colspan="7">BALANCE</td>' +
'        <td class="border tc bold red">' + balanceStr + '</td>' +
'      </tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr><td colspan="8" class="bold" style="font-size: 11px;">1.Production Note</td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;">' + productionNote1 + '</td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;">' + productionNote2 + '</td></tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr><td colspan="8" class="bold" style="font-size: 11px;">2. Shippment Term</td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;">- ' + shippingTerm + '</td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;">- Latest date of delivery: <span class="red">' + deliveryDays + '</span> days after the customer\'s deposit</td></tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr><td colspan="8" class="bold" style="font-size: 11px;">3. Payment terms: TT</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">- Deposit</td><td style="font-size: 11px;">' + depositStr + '</td><td colspan="5" style="font-size: 11px;">TT in advance of the purchase value within 03 working days from the date of PI.</td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;">- The balance of the purchase value will be paid before the loading.</td></tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr><td colspan="8" class="bold" style="font-size: 11px;">Seller\'s Bank Information:</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">BENEFICIARY</td><td colspan="6" style="font-size: 11px;">' + seller.beneficiary + '</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">BANK NAME</td><td colspan="6" style="font-size: 11px;">' + seller.bankName + '</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">SWIFT CODE</td><td colspan="6" style="font-size: 11px;">' + seller.swiftCode + '</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">BANK ADDRESS</td><td colspan="6" style="font-size: 11px;">' + seller.bankAddress + '</td></tr>' +
'      <tr><td colspan="2" style="font-size: 11px;">ACCOUNT</td><td colspan="6" style="font-size: 11px;">' + seller.account + '</td></tr>' +
'      <tr><td colspan="8" style="height: 4px;"></td></tr>' +
'      <tr><td colspan="8" style="font-size: 11px;"><span class="red">Note: </span>' + note + '</td></tr>' +
'      <tr>' +
'        <td colspan="6"></td>' +
'        <td colspan="2" class="tc" style="padding: 4px 0;">' +
           (showStamp !== false && stampData ? '<img src="' + stampData + '" alt="Stamp" style="width: 70px; height: 70px; opacity: 0.8; display: block; margin: 0 auto;">' : '') +
'          <div class="bold" style="font-size: 11px; margin-top: 4px;">SELLER SIGNATURE</div>' +
'        </td>' +
'      </tr>' +
'    </table>' +
'  </div>' +
'</body>' +
'</html>';
}
