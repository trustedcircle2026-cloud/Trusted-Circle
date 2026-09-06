function doGet(e) {
  return handleRequest_(e, false);
}

function doPost(e) {
  return handleRequest_(e, true);
}

function handleRequest_(e, isPost) {
  try {
    let input = {};

    if (isPost) {
      const body = e && e.postData ? String(e.postData.contents || '') : '';
      const type = e && e.postData ? String(e.postData.type || '').toLowerCase() : '';
      if (body && type.indexOf('application/json') >= 0) {
        input = safeJsonParse_(body);
      } else if (e && e.parameter) {
        input = e.parameter;
      } else {
        input = body ? safeJsonParse_(body) : {};
      }
    } else {
      input = e && e.parameter ? e.parameter : {};
    }

    require_(input, 'Invalid request.');
    const action = cleanText_(input.action || 'health', 50);
    return jsonResponse_(success_(routeAction_(action, input)));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonResponse_(failure_('REQUEST_FAILED', err.message || 'Request failed.'));
  }
}

function routeAction_(action, input) {
  switch (action) {
    case 'health':
      return { service: TC_CONFIG.APP_NAME + ' API', status: 'ok', version: '1.2.0' };
    case 'setupBackend':
      return setupBackend();
    case 'requestOtp':
      return requestOtp_(input);
    case 'verifyOtp':
      return verifyOtpAndLogin_(input);
    case 'logout':
      return { loggedOut: revokeSession_(input.token) };
    case 'me':
      return publicUser_(authenticate_(input.token));
    case 'brands':
      return ProductService.listBrands(input);
    case 'products':
      return ProductService.listProducts(input);
    case 'product':
      return ProductService.getProduct(input);
    case 'cart':
      return CartService.getCart(input);
    case 'cartAdd':
      return CartService.addItem(input);
    case 'cartUpdate':
      return CartService.updateItem(input);
    case 'cartRemove':
      return CartService.removeItem(input);
    default:
      throw new Error('Unknown API action.');
  }
}

function verifyOtpAndLogin_(input) {
  verifyOtp_(input);
  const email = normalizeEmail_(input.email);
  const user = createOrGetUser_(email, input.name);

  updateRowById_(TC_CONFIG.SHEETS.USERS, 'UserID', user.UserID, {
    LastLoginAt: isoNow_(),
    UpdatedAt: isoNow_()
  });

  const refreshedUser = getUserByEmail_(email);
  const session = issueSession_(refreshedUser);

  return {
    user: publicUser_(refreshedUser),
    session: session
  };
}
