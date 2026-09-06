/** Persistent shopping cart service. */
var CartService = {
  getCart: function(data) {
    var user = authenticate_(data.token);
    var rows = getRows_(TC_CONFIG.SHEETS.CART).filter(function(r){ return String(r.UserID) === String(user.UserID); });
    return { items: rows };
  },
  addItem: function(data) {
    var user = authenticate_(data.token);
    var productId = cleanText_(data.productId || '', 80);
    var quantity = Number(data.quantity || 1);
    require_(productId && isFinite(quantity) && quantity >= 1 && quantity <= 20, 'Valid productId and quantity are required.');
    var product = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', productId);
    if (!product || String(product.Active).toUpperCase() === 'FALSE') throw new Error('Product unavailable.');
    var rows = getRows_(TC_CONFIG.SHEETS.CART);
    var existing = rows.find(function(r){ return String(r.UserID) === String(user.UserID) && String(r.ProductID) === productId; });
    if (existing) {
      var next = Number(existing.Quantity || 0) + quantity;
      require_(next <= 20, 'Maximum quantity per product is 20.');
      updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', existing.CartID, { Quantity: next, UpdatedAt: isoNow_() });
    } else {
      appendRowObject_(TC_CONFIG.SHEETS.CART, { CartID: newId_('TCART'), UserID: user.UserID, ProductID: productId, Quantity: quantity, CreatedAt: isoNow_(), UpdatedAt: isoNow_() });
    }
    return this.getCart(data);
  },
  updateItem: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var quantity = Number(data.quantity);
    var item = findOne_(TC_CONFIG.SHEETS.CART, 'CartID', itemId);
    require_(item && String(item.UserID) === String(user.UserID), 'Cart item not found.');
    require_(isFinite(quantity) && quantity >= 1 && quantity <= 20, 'Quantity must be between 1 and 20.');
    updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', itemId, { Quantity: quantity, UpdatedAt: isoNow_() });
    return this.getCart(data);
  },
  removeItem: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var item = findOne_(TC_CONFIG.SHEETS.CART, 'CartID', itemId);
    require_(item && String(item.UserID) === String(user.UserID), 'Cart item not found.');
    updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', itemId, { Quantity: 0, UpdatedAt: isoNow_() });
    return this.getCart(data);
  }
};
