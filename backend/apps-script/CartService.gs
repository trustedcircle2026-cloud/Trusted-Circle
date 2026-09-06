/** Persistent shopping cart service. */
var CartService = {
  getCart: function(data) {
    var user = authenticate_(data.token);
    var rows = SheetService.read(TC_CONFIG.SHEETS.CART).filter(function(r){ return r.UserID === user.UserID && String(r.Status || 'ACTIVE') === 'ACTIVE'; });
    return ok_({ items: rows });
  },
  addItem: function(data) {
    var user = authenticate_(data.token);
    var productId = cleanText_(data.productId || '', 80);
    var quantity = Math.max(1, Math.min(20, Number(data.quantity || 1)));
    if (!productId || !isFinite(quantity)) throw appError_('VALIDATION_ERROR','Valid productId and quantity are required.');
    var product = SheetService.findById(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', productId);
    if (!product || String(product.Status || 'ACTIVE') !== 'ACTIVE') throw appError_('NOT_FOUND','Product unavailable.');
    var existing = SheetService.read(TC_CONFIG.SHEETS.CART).find(function(r){ return r.UserID === user.UserID && r.ProductID === productId && String(r.Status || 'ACTIVE') === 'ACTIVE'; });
    if (existing) SheetService.updateById(TC_CONFIG.SHEETS.CART, 'CartItemID', existing.CartItemID, { Quantity: Number(existing.Quantity || 0) + quantity, UpdatedAt: isoNow_() });
    else SheetService.append(TC_CONFIG.SHEETS.CART, { CartItemID: id_('TCART'), UserID: user.UserID, ProductID: productId, Quantity: quantity, Status: 'ACTIVE', CreatedAt: isoNow_(), UpdatedAt: isoNow_() });
    return this.getCart(data);
  },
  updateItem: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var quantity = Number(data.quantity);
    var item = SheetService.findById(TC_CONFIG.SHEETS.CART, 'CartItemID', itemId);
    if (!item || item.UserID !== user.UserID) throw appError_('NOT_FOUND','Cart item not found.');
    if (!isFinite(quantity) || quantity < 1 || quantity > 20) throw appError_('VALIDATION_ERROR','Quantity must be between 1 and 20.');
    SheetService.updateById(TC_CONFIG.SHEETS.CART, 'CartItemID', itemId, { Quantity: quantity, UpdatedAt: isoNow_() });
    return this.getCart(data);
  },
  removeItem: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var item = SheetService.findById(TC_CONFIG.SHEETS.CART, 'CartItemID', itemId);
    if (!item || item.UserID !== user.UserID) throw appError_('NOT_FOUND','Cart item not found.');
    SheetService.updateById(TC_CONFIG.SHEETS.CART, 'CartItemID', itemId, { Status: 'REMOVED', UpdatedAt: isoNow_() });
    return this.getCart(data);
  }
};
