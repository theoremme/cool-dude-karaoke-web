const crypto = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion

function generateInviteCode(length = 6) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARS[bytes[i] % CHARS.length];
  }
  return code;
}

module.exports = { generateInviteCode };
