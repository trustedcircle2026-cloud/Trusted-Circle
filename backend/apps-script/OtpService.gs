function requestOtp_(payload) {
  const email = normalizeEmail_(payload.email);
  const purpose = cleanText_(payload.purpose || 'SHOP_LOGIN', 40).toUpperCase();
  require_(isValidEmail_(email), 'Enter a valid email address.');
  require_(['SHOP_LOGIN','SHOP_REGISTER','INVESTOR_LOGIN','INVESTOR_REGISTER','ADMIN_LOGIN'].indexOf(purpose) >= 0, 'Invalid OTP purpose.');

  const cache = CacheService.getScriptCache();
  const cooldownKey = 'OTP_COOLDOWN_' + hash_(email + '|' + purpose).substring(0, 32);
  require_(!cache.get(cooldownKey), 'Please wait before requesting another OTP.');

  const otp = randomOtp_();
  const otpId = newId_('TCOTP');
  const expires = new Date(Date.now() + TC_CONFIG.OTP_TTL_SECONDS * 1000);
  appendRowObject_(TC_CONFIG.SHEETS.OTP, {
    OtpID: otpId,
    Email: email,
    Purpose: purpose,
    OtpHash: hash_(otpId + ':' + otp),
    ExpiresAt: expires.toISOString(),
    Attempts: 0,
    MaxAttempts: TC_CONFIG.OTP_MAX_ATTEMPTS,
    CreatedAt: isoNow_(),
    UsedAt: '',
    Status: 'ACTIVE'
  });

  MailApp.sendEmail({
    to: email,
    subject: 'Trusted Circle — Your verification code',
    htmlBody: '<p>Your Trusted Circle verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">' + otp + '</p><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>',
    body: 'Your Trusted Circle verification code is ' + otp + '. It expires in 10 minutes.'
  });
  cache.put(cooldownKey, '1', TC_CONFIG.OTP_RESEND_COOLDOWN_SECONDS);
  return { message: 'OTP sent successfully.', expiresInSeconds: TC_CONFIG.OTP_TTL_SECONDS };
}

function verifyOtp_(payload) {
  const email = normalizeEmail_(payload.email);
  const otp = String(payload.otp || '').trim();
  const purpose = cleanText_(payload.purpose || 'SHOP_LOGIN', 40).toUpperCase();
  require_(isValidEmail_(email), 'Invalid email address.');
  require_(/^\d{6}$/.test(otp), 'Enter the 6-digit OTP.');

  const rows = getRows_(TC_CONFIG.SHEETS.OTP).filter(function(row) {
    return normalizeEmail_(row.Email) === email && String(row.Purpose) === purpose && String(row.Status) === 'ACTIVE';
  });
  require_(rows.length > 0, 'OTP is invalid or expired.');
  rows.sort(function(a,b) { return new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime(); });
  const record = rows[0];
  require_(new Date(record.ExpiresAt).getTime() > Date.now(), 'OTP has expired.');
  require_(Number(record.Attempts || 0) < Number(record.MaxAttempts || TC_CONFIG.OTP_MAX_ATTEMPTS), 'Too many OTP attempts.');

  if (!constantTimeEquals_(String(record.OtpHash), hash_(String(record.OtpID) + ':' + otp))) {
    updateRowById_(TC_CONFIG.SHEETS.OTP, 'OtpID', record.OtpID, { Attempts: Number(record.Attempts || 0) + 1 });
    throw new Error('OTP is invalid.');
  }

  updateRowById_(TC_CONFIG.SHEETS.OTP, 'OtpID', record.OtpID, { Status: 'USED', UsedAt: isoNow_() });
  return true;
}
