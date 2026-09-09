function getUserByEmail_(email) {
  return findOne_(TC_CONFIG.SHEETS.USERS, 'Email', normalizeEmail_(email));
}

function createOrGetUser_(email, name) {
  email = normalizeEmail_(email);
  let user = getUserByEmail_(email);
  if (user) return user;
  const now = isoNow_();
  const userId = newId_('TCUSR');
  appendRowObject_(TC_CONFIG.SHEETS.USERS, {
    UserID: userId,
    Email: email,
    Name: cleanText_(name || '', 120),
    Role: email === getAdminEmail_() ? 'ADMIN' : 'SHOPPING_USER',
    Status: 'ACTIVE',
    CreatedAt: now,
    UpdatedAt: now,
    LastLoginAt: ''
  });
  return getUserByEmail_(email);
}

function updateProfile_(data) {
  var user = authenticate_(data.token);
  var name = cleanText_(data.name || '', 120);
  require_(name.length >= 2, 'Name must contain at least 2 characters.');
  updateRowById_(TC_CONFIG.SHEETS.USERS, 'UserID', user.UserID, { Name: name, UpdatedAt: isoNow_() });
  return publicUser_(getUserByEmail_(user.Email));
}

function publicUser_(user) {
  if (!user) return null;
  return {
    userId: String(user.UserID),
    email: String(user.Email),
    name: String(user.Name || ''),
    role: String(user.Role || 'SHOPPING_USER'),
    status: String(user.Status || 'ACTIVE'),
    createdAt: String(user.CreatedAt || ''),
    lastLoginAt: String(user.LastLoginAt || '')
  };
}
