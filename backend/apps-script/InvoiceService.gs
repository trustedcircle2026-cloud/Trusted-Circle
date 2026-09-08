/** Trusted Circle invoice PDF service. Generates a server-side PDF only after payment verification and voucher delivery. */
var TC_INVOICE={LOGO_URL:'https://raw.githubusercontent.com/trustedcircle2026-cloud/Trusted-Circle/main/Logo%20new.jpg'};
function createInvoicePdf_(data){
  var user=authenticate_(data.token),orderId=cleanText_(data.orderId,100);
  require_(orderId,'Order ID is required.');
  var order=findOne_(TC_CONFIG.SHEETS.ORDERS,'OrderID',orderId);
  require_(order&&String(order.UserID)===String(user.UserID),'Order not found.');
  require_(String(order.Status||'').toUpperCase()==='DELIVERED','Invoice is available only after voucher delivery.');
  var payments=getRows_(TC_CONFIG.SHEETS.PAYMENTS).filter(function(r){return String(r.OrderID)===orderId;});
  var payment=payments.length?payments[payments.length-1]:null;
  require_(payment&&['VERIFIED','PAID'].indexOf(String(payment.Status||'').toUpperCase())>=0,'Invoice is available only after verified payment.');
  var vouchers=getRows_(TC_CONFIG.SHEETS.VOUCHERS).filter(function(r){return String(r.OrderID)===orderId&&String(r.Status||'').toUpperCase()==='DELIVERED';});
  require_(vouchers.length>0,'Invoice is available after the voucher has been delivered.');
  var items=getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r){return String(r.OrderID)===orderId;});
  require_(items.length>0,'No invoice items found.');
  var products=getRows_(TC_CONFIG.SHEETS.PRODUCTS),brands=getRows_(TC_CONFIG.SHEETS.BRANDS);
  var ss=SpreadsheetApp.create('TC Invoice '+String(order.OrderNumber||orderId));
  var sheet=ss.getSheets()[0]; sheet.setName('Invoice');
  sheet.setHiddenGridlines(true);
  sheet.setColumnWidths(1,1,48);sheet.setColumnWidths(2,1,180);sheet.setColumnWidths(3,1,190);sheet.setColumnWidths(4,1,78);sheet.setColumnWidths(5,1,95);sheet.setColumnWidths(6,1,95);sheet.setColumnWidths(7,1,105);sheet.setColumnWidths(8,1,115);
  sheet.setRowHeights(1,2,28);
  try{var logo=UrlFetchApp.fetch(TC_INVOICE.LOGO_URL,{muteHttpExceptions:true}).getBlob();sheet.insertImage(logo,1,1).setWidth(58).setHeight(58);}catch(ignore){}
  sheet.getRange('B1:H2').merge().setValue('TRUSTED CIRCLE\nSALES / VOUCHER INVOICE').setFontWeight('bold').setFontSize(18).setVerticalAlignment('middle');
  sheet.getRange('B1:H2').setHorizontalAlignment('left');
  sheet.getRange('A4:H4').merge().setValue('INVOICE DETAILS').setFontWeight('bold').setBackground('#eaf4ee');
  sheet.getRange('A5:D8').setValues([
    ['Invoice / Order No.',order.OrderNumber,'Order ID',order.OrderID],
    ['Order Date',order.CreatedAt,'Customer',user.Name||''],
    ['Customer Email',user.Email||'','Order Status',order.Status],
    ['Payment Provider',payment.Provider||'','Payment Reference',payment.ProviderPaymentID||payment.ProviderOrderID||'']
  ]);
  sheet.getRange('A5:A8').setFontWeight('bold');sheet.getRange('C5:C8').setFontWeight('bold');
  sheet.getRange('E5:H8').merge().setValue('BILL TO\n'+(user.Name||'')+'\n'+(user.Email||'')+'\nTrusted Circle User ID: '+String(user.UserID||'' )).setWrap(true).setVerticalAlignment('top');
  sheet.getRange('A10:H10').setValues([['#','Brand / Voucher','SKU / Product ID','Qty','Denomination','Unit Price','Discount','Line Total']]).setFontWeight('bold').setBackground('#17231d').setFontColor('#ffffff');
  var rows=items.map(function(item,index){var product=products.find(function(p){return String(p.ProductID)===String(item.ProductID);})||{};var brand=brands.find(function(b){return String(b.BrandID)===String(product.BrandID);})||{};var qty=Number(item.Quantity||1),face=Number(item.Denomination||item.FaceValue||0),unit=Number(item.UnitPrice||0),line=Number(item.Total||unit*qty),discount=Math.max(0,face-unit)*qty;return [index+1,(brand.Name?brand.Name+' — ':'')+(product.Title||item.ProductID||'Gift Voucher'),product.SKU||item.ProductID,qty,face,unit,discount,line];});
  sheet.getRange(11,1,rows.length,8).setValues(rows);sheet.getRange(11,4,rows.length,5).setNumberFormat('₹#,##0.00');sheet.getRange(11,1,rows.length,8).setWrap(true);
  var totalRow=11+rows.length+1;
  sheet.getRange(totalRow,5,4,4).setValues([['','','Subtotal',Number(order.Subtotal||0)],['','','Discount',Number(order.Discount||0)],['','','Net Payable',Number(order.Total||0)],['','','Payment Status',String(payment.Status||'VERIFIED')]]);
  sheet.getRange(totalRow,7,4,1).setFontWeight('bold');sheet.getRange(totalRow,8,3,1).setNumberFormat('₹#,##0.00');sheet.getRange(totalRow+2,7,1,2).setFontWeight('bold').setBackground('#eaf4ee');
  var voucherStart=totalRow+6;
  sheet.getRange(voucherStart,1,1,8).merge().setValue('VOUCHER DELIVERY DETAILS').setFontWeight('bold').setBackground('#eaf4ee');
  var vRows=vouchers.map(function(v){var product=products.find(function(p){return String(p.ProductID)===String(v.ProductID);})||{};return [product.Title||v.ProductID,v.Code||'',v.Pin||'',v.Status||'',v.IssuedAt||'',v.DeliveredAt||'','',''];});
  sheet.getRange(voucherStart+1,1,vRows.length,8).setValues(vRows);sheet.getRange(voucherStart+1,1,vRows.length,8).setWrap(true);
  sheet.getRange(voucherStart+1,1,1,6).setFontWeight('bold');
  var noteRow=voucherStart+3+vRows.length;
  sheet.getRange(noteRow,1,2,8).merge().setValue('This invoice records the completed Trusted Circle voucher order. Payment is shown only after server-side verification and voucher details are shown only after delivery. Please retain this invoice for your records.\nSupport: info@trustedcircle.in | +91 94424 56039').setWrap(true).setVerticalAlignment('middle');
  sheet.getRange(noteRow,1,2,8).setBackground('#f7faf8').setFontSize(9);
  sheet.getRange(1,1,Math.max(noteRow+2,20),8).setBorder(true,true,true,true,true,true,'#d7e1db',SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(10);
  SpreadsheetApp.flush();Utilities.sleep(600);
  var exportUrl='https://docs.google.com/spreadsheets/d/'+ss.getId()+'/export?format=pdf&size=A4&portrait=true&fitw=true&gridlines=false&printtitle=false&sheetnames=false&pagenum=UNDEFINED&fzr=true&top_margin=0.35&bottom_margin=0.35&left_margin=0.35&right_margin=0.35&gid='+sheet.getSheetId()+'&r1=0&c1=0&r2='+(noteRow+2)+'&c2=8';
  var pdf=UrlFetchApp.fetch(exportUrl,{method:'GET',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()}}).getBlob().setName('Trusted-Circle-Invoice-'+String(order.OrderNumber||orderId)+'.pdf');
  var base64=Utilities.base64Encode(pdf.getBytes());
  try{DriveApp.getFileById(ss.getId()).setTrashed(true);}catch(ignore2){}
  return{fileName:pdf.getName(),mimeType:'application/pdf',base64:base64,orderNumber:order.OrderNumber};
}
