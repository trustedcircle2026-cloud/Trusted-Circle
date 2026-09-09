var DEFAULT_CATALOG = [
  ['Goibibo','GOIBIBO','Goibibo Hotel E-Gift Card',16],
  ['MakeMyTrip','MAKEMYTRIP','MakeMyTrip Hotel E-Gift Card',14],
  ['AJIO','AJIO','AJIO E-Gift Card',8],
  ['Cleartrip','CLEARTRIP','Cleartrip Hotel E-Gift Card',8],
  ['MakeMyTrip','MAKEMYTRIP','MakeMyTrip E-Gift Card',7.5],
  ['Swiggy','SWIGGY','Swiggy Money E-Gift Card',7],
  ['Zomato','ZOMATO','Zomato E-Gift Card',7],
  ['Max Fashion','MAXFASHION','Max Fashion E-Gift Card',7],
  ['Uber','UBER','Uber E-Gift Card',4],
  ['Decathlon','DECATHLON','Decathlon E-Gift Card',4],
  ['Croma','CROMA','Croma E-Gift Card',3.5],
  ['Kalyan Jewellers','KALYAN','Kalyan Jewellers E-Gift Card',3.5],
  ['Myntra','MYNTRA','Myntra E-Gift Card',3],
  ['Amazon','AMAZON','Amazon Shopping Voucher',2],
  ['Flipkart','FLIPKART','Flipkart E-Gift Voucher',1.5],
  ['Nykaa','NYKAA','Nykaa E-Gift Card',3],
  ["Domino's",'DOMINOS','Domino\'s E-Gift Card',3],
  ['PVR INOX','PVRINOX','PVR INOX E-Gift Card',3],
  ['Reliance Digital','RELIANCEDIGITAL','Reliance Digital E-Gift Card',2.5],
  ['Tanishq','TANISHQ','Tanishq E-Gift Card',2],
  ['Starbucks','STARBUCKS','Starbucks E-Gift Card',2],
  ['BookMyShow','BOOKMYSHOW','BookMyShow E-Gift Card',3],
  ['Lifestyle','LIFESTYLE','Lifestyle E-Gift Card',3],
  ['Shoppers Stop','SHOPPERSSTOP','Shoppers Stop E-Gift Card',3],
  ['Tata CLiQ','TATACLIQ','Tata CLiQ E-Gift Card',2.5]
];

function seedDefaultCatalog_() {
  var now = isoNow_();
  var brands = getRows_(TC_CONFIG.SHEETS.BRANDS);
  var products = getRows_(TC_CONFIG.SHEETS.PRODUCTS);
  var brandMap = {};

  DEFAULT_CATALOG.forEach(function(row) {
    var brandName = row[0];
    var brandId = 'TCBRD' + row[1];
    brandMap[brandName] = brandId;
    if (!brands.some(function(b) { return String(b.BrandID) === brandId; })) {
      appendRowObject_(TC_CONFIG.SHEETS.BRANDS, {
        BrandID: brandId, Name: brandName, Slug: row[1].toLowerCase(), LogoURL: '', Active: true,
        CreatedAt: now, UpdatedAt: now
      });
    }
  });

  DEFAULT_CATALOG.forEach(function(row, index) {
    var brandName = row[0];
    var code = row[1];
    var title = row[2];
    var discount = Number(row[3]);
    var sku = 'TC-' + code + '-' + (index + 1);
    var existing = products.find(function(p) { return String(p.SKU) === sku; });
    var faceValue = 1000;
    var sellingPrice = Math.round(faceValue * (1 - discount / 100) * 100) / 100;
    var data = {
      BrandID: brandMap[brandName], SKU: sku, Title: title,
      Description: title + ' — standard demo denomination ₹1,000. Configure live denominations before production.',
      FaceValue: faceValue, SellingPrice: sellingPrice, DiscountPercent: discount,
      Currency: 'INR', InventoryStatus: 'AVAILABLE', Active: true, UpdatedAt: now
    };
    if (existing) {
      updateRowById_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', existing.ProductID, data);
    } else {
      appendRowObject_(TC_CONFIG.SHEETS.PRODUCTS, Object.assign({ ProductID: newId_('TCPRD'), CreatedAt: now }, data));
    }
  });
  return { seeded: DEFAULT_CATALOG.length, denomination: 1000, note: 'Demo denomination only; configure live voucher denominations and fulfilment before production.' };
}
