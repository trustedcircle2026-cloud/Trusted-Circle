/** Product and brand read APIs. */
var ProductService = {
  listBrands: function(data) {
    var rows = getRows_(TC_CONFIG.SHEETS.BRANDS);
    var seen = {};
    var items = rows.filter(function(r) {
      if (String(r.Active).toUpperCase() === 'FALSE') return false;
      var key = String(r.Name || r.BrandID || '').trim().toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
    items.sort(function(a,b){
      var aAmazon=String(a.Name||'').toLowerCase()==='amazon pay',bAmazon=String(b.Name||'').toLowerCase()==='amazon pay';
      if(aAmazon&&!bAmazon)return -1;if(!aAmazon&&bAmazon)return 1;return 0;
    });
    return { items: items };
  },

  listProducts: function(data) {
    var rows = getRows_(TC_CONFIG.SHEETS.PRODUCTS);
    var q = cleanText_(data.q || '', 100).toLowerCase();
    var brand = cleanText_(data.brand || '', 100).toLowerCase();

    var active = rows.filter(function(r) {
      return String(r.Active).toUpperCase() !== 'FALSE' &&
        String(r.InventoryStatus || 'AVAILABLE').toUpperCase() !== 'OUT_OF_STOCK';
    });

    if (q) {
      active = active.filter(function(r) {
        return [r.Title, r.Description, r.SKU, r.BrandID]
          .join(' ')
          .toLowerCase()
          .indexOf(q) >= 0;
      });
    }

    if (brand) {
      active = active.filter(function(r) {
        return String(r.BrandID || '').toLowerCase() === brand;
      });
    }

    active.sort(function(a,b){
      var aAmazon=String(a.BrandID||'').toUpperCase()==='TCBRDAMAZONPAY',bAmazon=String(b.BrandID||'').toUpperCase()==='TCBRDAMAZONPAY';
      if(aAmazon&&!bAmazon)return -1;if(!aAmazon&&bAmazon)return 1;return 0;
    });
    return { items: active };
  },

  getProduct: function(data) {
    var id = cleanText_(data.productId || '', 80);
    require_(id, 'productId is required.');

    var row = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', id);
    if (!row || String(row.Active).toUpperCase() === 'FALSE') {
      throw new Error('Product not found.');
    }

    return { product: row };
  }
};
