/** Product and brand read APIs. */
var ProductService = {
  listBrands: function(data) {
    var rows = SheetService.read(TC_CONFIG.SHEETS.BRANDS);
    return ok_({ items: rows.filter(function(r){ return String(r.Status || 'ACTIVE') === 'ACTIVE'; }) });
  },
  listProducts: function(data) {
    var rows = SheetService.read(TC_CONFIG.SHEETS.PRODUCTS);
    var q = cleanText_(data.q || '', 100).toLowerCase();
    var brand = cleanText_(data.brand || '', 100).toLowerCase();
    var active = rows.filter(function(r){ return String(r.Status || 'ACTIVE') === 'ACTIVE'; });
    if (q) active = active.filter(function(r){ return [r.ProductName,r.BrandName,r.Category].join(' ').toLowerCase().indexOf(q) >= 0; });
    if (brand) active = active.filter(function(r){ return String(r.BrandName || '').toLowerCase() === brand; });
    return ok_({ items: active });
  },
  getProduct: function(data) {
    var id = cleanText_(data.productId || '', 80);
    if (!id) throw appError_('VALIDATION_ERROR','productId is required.');
    var row = SheetService.findById(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', id);
    if (!row || String(row.Status || 'ACTIVE') !== 'ACTIVE') throw appError_('NOT_FOUND','Product not found.');
    return ok_({ product: row });
  }
};
