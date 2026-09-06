function issueSession_(user) {
  const rawToken = Utilities.getUuid() + '.' + Utilities.getUuid();
  const sessionId = newId_('TCSES');
  const expires = new Date(Date.now() + getSessionTtl_() * 1000);
  appendRowObject_(TC_CONFIG.SHEETS.SESSIONS, {
    SessionID: sessionId,
    UserID: user.UserID,
    TokenHash: hash_(rawToken),
    ExpiresAt: expires.toISOString(),
    CreatedAt: isoNow_(),
    RevokedAt: '',
    Status: 'ACTIVE'
  });
  return { token: rawToken, expiresAt: expires.toISOString() };
}

function authenticate_(token) {
  require_(token, 'Authentication required.');
  const tokenHash = hash_(String(token));
  const rows = getRows_(TC_CONFIG.SHEETS.SESSIONS);
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.Status === 'ACTIVE' && constantTimeEquals_(String(row.TokenHash), tokenHash)) {
      require_(new Date(row.ExpiresAt).getTime() > Date.now(), 'Session expired.');
      const user = findOne_(TC_CONFIG.SHEETS.USERS, 'UserID', row.UserID);
      require_(user && user.Status === 'ACTIVE', 'User account is inactive.');
      return user;
    }
  }
  throw new Error('Invalid session.');
}

function revokeSession_(token) {
  const tokenHash = hash_(String(token || ''));
  const rows = getRows_(TC_CONFIG.SHEETS.SESSIONS);
  for (let i = rows.length - 1; i >= 0; i--) {
    if (constantTimeEquals_(String(rows[i].TokenHash), tokenHash) && rows[i].Status === 'ACTIVE') {
      updateRowById_(TC_CONFIG.SHEETS.SESSIONS, 'SessionID', rows[i].SessionID, { Status: 'REVOKED', RevokedAt: isoNow_() });
      return true;
    }
  }
  return false;
}
