function doGet(e) {
  return handleRequest_(e, false);
}

function doPost(e) {
  return handleRequest_(e, true);
}

function handleRequest_(e, isPost) {
  try {
    const input = isPost ? safeJsonParse_(e && e.postData ? e.postData.contents : '') : (e && e.parameter ? e.parameter : {});
    require_(input, 'Invalid request body.');
    const action = cleanText_(input.action, 50);
    const result = routeAction_(action, input);
    return jsonResponse_(success_(result));
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return jsonResponse_(failure_('REQUEST_FAILED', err.message || 'Request failed.'));
  }
}

function routeAction_(action, input) {
  switch (action) {
    case 'health':
      return { service: TC_CONFIG.APP_NAME + ' API', status: 'ok', version: '1.0.0' };
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
    default:
      throw new Error('Unknown API action.');
  }
}

function verifyOtpAndLogin_(input) {
  verifyOtp_(input);
  const email = normalizeEmail_(input.email);
  const user = createOrGetUser_(email, input.name);
  updateRowById_(TC_CONFIG.SHEETS.USERS, 'UserID', user.UserID, { LastLoginAt: isoNow_(), UpdatedAt: isoNow_() });
  const session = issueSession_(user);
  return { user: publicUser_(user), session: session };
}
