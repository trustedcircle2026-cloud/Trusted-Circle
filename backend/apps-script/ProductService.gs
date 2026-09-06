/** Product and brand read APIs. */
var ProductService = {
  listBrands: function(data) {
    var rows = getRows_(TC_CONFIG.SHEETS.BRANDS);
    return { items: rows.filter(function(r){ return String(r.Active).toUpperCase() !== 'FALSE'; }) };
  },
  listProducts: function(data) {
    var rows = getRows_(TC_CONFIG.SHEETS.PRODUCTS);
    var q = cleanText_(data.q || '', 100).toLowerCase();
    var brand = cleanText_(data.brand || '', 100).toLowerCase();
    var active = rows.filter(function(r){ return String(r.Active).toUpperCase() !== 'FALSE' && String(r.InventoryStatus || 'AVAILABLE').toUpperCase() !== 'OUT_OF_STOCK'; });
    if (q) active = active.filter(function(r){ return [r.Title,r.Description,r.SKU].join(' ').toLowerCase().indexOf(q) >= 0; });
    if (brand) active = active.filter(function(r){ return String(r.BrandID || '').toLowerCase() === brand; });
    return { items: active };
  },
  getProduct: function(data) {
    var id = cleanText_(data.productId || '', 80);
    require_(id, 'productId is required.');
    var row = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', id);
    if (!row || String(row.Active).toUpperCase() === 'FALSE') throw new Error('Product not found.');
    return { product: row };
  }
};
