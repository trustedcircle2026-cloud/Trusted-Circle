function success_(data) {
  return { ok: true, data: data || null, error: null, timestamp: isoNow_() };
}

function failure_(code, message) {
  return { ok: false, data: null, error: { code: code || 'ERROR', message: message || 'Request failed.' }, timestamp: isoNow_() };
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
