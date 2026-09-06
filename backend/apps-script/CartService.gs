/** Persistent shopping cart service with editable voucher denominations. */
function normalizeDenomination_(value, fallback) {
  var amount = value === undefined || value === null || value === '' ? Number(fallback || 0) : Number(value);
  require_(isFinite(amount) && amount >= 100 && amount <= 10000, 'Denomination must be between ₹100 and ₹10,000.');
  require_(Math.round(amount * 100) === amount * 100, 'Denomination can have at most 2 decimal places.');
  return Math.round(amount * 100) / 100;
}

var CartService = {
  getCart: function(data) {
    var user = authenticate_(data.token);
    var rows = getRows_(TC_CONFIG.SHEETS.CART).filter(function(r) {
      return String(r.UserID) === String(user.UserID) && Number(r.Quantity || 0) > 0;
    });
    return { items: rows };
  },

  addItem: function(data) {
    var user = authenticate_(data.token);
    var productId = cleanText_(data.productId || '', 80);
    var quantity = Number(data.quantity || 1);
    require_(productId && isFinite(quantity) && Math.floor(quantity) === quantity && quantity >= 1 && quantity <= 20, 'Valid productId and integer quantity are required.');

    var product = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', productId);
    if (!product || String(product.Active).toUpperCase() === 'FALSE') throw new Error('Product unavailable.');
    if (String(product.InventoryStatus || 'AVAILABLE').toUpperCase() === 'OUT_OF_STOCK') throw new Error('Product is out of stock.');

    var denomination = normalizeDenomination_(data.denomination, product.FaceValue);
    var rows = getRows_(TC_CONFIG.SHEETS.CART);
    var existing = rows.find(function(r) {
      return String(r.UserID) === String(user.UserID) && String(r.ProductID) === productId && Number(r.Denomination || 0) === denomination;
    });

    if (existing) {
      var next = Number(existing.Quantity || 0) + quantity;
      require_(next <= 20, 'Maximum quantity per denomination is 20.');
      updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', existing.CartID, { Quantity: next, UpdatedAt: isoNow_() });
    } else {
      appendRowObject_(TC_CONFIG.SHEETS.CART, {
        CartID: newId_('TCART'), UserID: user.UserID, ProductID: productId,
        Quantity: quantity, Denomination: denomination, CreatedAt: isoNow_(), UpdatedAt: isoNow_()
      });
    }
    return this.getCart(data);
  },

  updateItem: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var quantity = Number(data.quantity);
    var item = findOne_(TC_CONFIG.SHEETS.CART, 'CartID', itemId);
    require_(item && String(item.UserID) === String(user.UserID), 'Cart item not found.');
    require_(isFinite(quantity) && Math.floor(quantity) === quantity && quantity >= 1 && quantity <= 20, 'Quantity must be an integer between 1 and 20.');
    updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', itemId, { Quantity: quantity, UpdatedAt: isoNow_() });
    return this.getCart(data);
  },

  updateDenomination: function(data) {
    var user = authenticate_(data.token);
    var itemId = cleanText_(data.cartItemId || '', 80);
    var item = findOne_(TC_CONFIG.SHEETS.CART, 'CartID', itemId);
    require_(item && String(item.UserID) === String(user.UserID), 'Cart item not found.');
    var product = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', item.ProductID);
    require_(product, 'Product not found.');
    var denomination = normalizeDenomination_(data.denomination, product.FaceValue);
    var rows = getRows_(TC_CONFIG.SHEETS.CART);
    var duplicate = rows.find(function(r) {
      return String(r.UserID) === String(user.UserID) && String(r.ProductID) === String(item.ProductID) && String(r.CartID) !== String(item.CartID) && Number(r.Denomination || 0) === denomination && Number(r.Quantity || 0) > 0;
    });
    if (duplicate) {
      var merged = Number(duplicate.Quantity || 0) + Number(item.Quantity || 0);
      require_(merged <= 20, 'Maximum quantity per denomination is 20.');
      updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', duplicate.CartID, { Quantity: merged, UpdatedAt: isoNow_() });
      updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', item.CartID, { Quantity: 0, UpdatedAt: isoNow_() });
    } else {
      updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', itemId, { Denomination: denomination, UpdatedAt: isoNow_() });
    }
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
