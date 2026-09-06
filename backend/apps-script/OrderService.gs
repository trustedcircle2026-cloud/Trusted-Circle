var OrderService = {
  placeOrder: function(data) {
    var user = authenticate_(data.token);
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      var cartRows = getRows_(TC_CONFIG.SHEETS.CART).filter(function(r) {
        return String(r.UserID) === String(user.UserID) && Number(r.Quantity || 0) > 0;
      });
      require_(cartRows.length > 0, 'Your cart is empty.');

      var items = [];
      var subtotal = 0;
      var discount = 0;
      cartRows.forEach(function(cart) {
        var product = findOne_(TC_CONFIG.SHEETS.PRODUCTS, 'ProductID', cart.ProductID);
        require_(product && String(product.Active).toUpperCase() !== 'FALSE', 'A cart item is no longer available.');
        require_(String(product.InventoryStatus || 'AVAILABLE').toUpperCase() !== 'OUT_OF_STOCK', 'A cart item is out of stock.');
        var qty = Number(cart.Quantity || 0);
        var face = Number(product.FaceValue || 0);
        var unit = Number(product.SellingPrice || 0);
        var line = unit * qty;
        subtotal += face * qty;
        discount += Math.max(0, (face - unit) * qty);
        items.push({ product: product, quantity: qty, faceValue: face, unitPrice: unit, total: line });
      });

      var total = subtotal - discount;
      var now = isoNow_();
      var orderId = newId_('TCORD');
      var orderNumber = 'TC-' + Utilities.formatDate(new Date(), TC_CONFIG.TIMEZONE, 'yyyyMMdd') + '-' + Utilities.getUuid().replace(/-/g, '').substring(0, 8).toUpperCase();

      appendRowObject_(TC_CONFIG.SHEETS.ORDERS, {
        OrderID: orderId,
        UserID: user.UserID,
        OrderNumber: orderNumber,
        Status: 'PENDING_PAYMENT',
        Subtotal: subtotal,
        Discount: discount,
        Total: total,
        Currency: 'INR',
        CreatedAt: now,
        UpdatedAt: now
      });

      items.forEach(function(item) {
        appendRowObject_(TC_CONFIG.SHEETS.ORDER_ITEMS, {
          OrderItemID: newId_('TCORI'),
          OrderID: orderId,
          ProductID: item.product.ProductID,
          Quantity: item.quantity,
          FaceValue: item.faceValue,
          UnitPrice: item.unitPrice,
          Total: item.total
        });
      });

      cartRows.forEach(function(cart) {
        updateRowById_(TC_CONFIG.SHEETS.CART, 'CartID', cart.CartID, { Quantity: 0, UpdatedAt: now });
      });

      appendRowObject_(TC_CONFIG.SHEETS.NOTIFICATIONS, {
        NotificationID: newId_('TCNOT'), UserID: user.UserID, Type: 'ORDER',
        Title: 'Order created', Message: 'Order ' + orderNumber + ' is ready for payment.', ReadAt: '', CreatedAt: now
      });

      return { order: getOrder_(user.UserID, orderId) };
    } finally {
      lock.releaseLock();
    }
  },

  listOrders: function(data) {
    var user = authenticate_(data.token);
    var rows = getRows_(TC_CONFIG.SHEETS.ORDERS).filter(function(r) { return String(r.UserID) === String(user.UserID); });
    rows.sort(function(a, b) { return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime(); });
    return { items: rows.slice(0, 50) };
  }
};

function getOrder_(userId, orderId) {
  var order = findOne_(TC_CONFIG.SHEETS.ORDERS, 'OrderID', orderId);
  require_(order && String(order.UserID) === String(userId), 'Order not found.');
  var items = getRows_(TC_CONFIG.SHEETS.ORDER_ITEMS).filter(function(r) { return String(r.OrderID) === String(orderId); });
  return { order: order, items: items };
}
