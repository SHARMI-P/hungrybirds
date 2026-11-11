// Phone OTP login. Providers:
//   demo   – code generated here and returned to the browser (for portfolio demos; no SMS sent)
//   twilio – real SMS through Twilio Verify (set TWILIO_* env vars)
//   off    – feature disabled
const crypto = require('crypto');
const Otp = require('../models/Otp');
const AppError = require('../utils/AppError');
const config = require('../config');

const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const normalizePhone = (raw) => {
  const digits = String(raw || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  if (!/^[6-9]\d{9}$/.test(digits)) throw AppError.badRequest('Enter a valid 10-digit Indian mobile number');
  return digits;
};

const hash = (phone, code) => crypto.createHmac('sha256', config.JWT_SECRET).update(`${phone}:${code}`).digest('hex');

const twilio = async (path, params) => {
  const auth = Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64');
  const res = await fetch(`https://verify.twilio.com/v2/Services/${config.TWILIO_VERIFY_SERVICE_SID}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw AppError.badRequest(data.message || 'Could not send OTP, please try again');
  return data;
};

const sendOtp = async (phone) => {
  if (config.OTP_PROVIDER === 'twilio') {
    await twilio('Verifications', { To: `+91${phone}`, Channel: 'sms' });
    return {};
  }
  const recent = await Otp.findOne({ phone }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < RESEND_AFTER_MS) {
    throw AppError.badRequest('Please wait 30 seconds before requesting another code');
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.deleteMany({ phone });
  await Otp.create({ phone, codeHash: hash(phone, code), expiresAt: new Date(Date.now() + CODE_TTL_MS) });
  return { devCode: code }; // demo mode only
};

const checkOtp = async (phone, code) => {
  if (config.OTP_PROVIDER === 'twilio') {
    const data = await twilio('VerificationCheck', { To: `+91${phone}`, Code: code });
    if (data.status !== 'approved') throw AppError.badRequest('Incorrect or expired code');
    return;
  }
  const otp = await Otp.findOne({ phone, expiresAt: { $gt: new Date() } });
  if (!otp) throw AppError.badRequest('Code expired — request a new one');
  if (otp.attempts >= MAX_ATTEMPTS) throw AppError.badRequest('Too many wrong attempts — request a new code');
  const ok = crypto.timingSafeEqual(Buffer.from(otp.codeHash), Buffer.from(hash(phone, code)));
  if (!ok) {
    await Otp.updateOne({ _id: otp._id }, { $inc: { attempts: 1 } });
    throw AppError.badRequest('Incorrect code');
  }
  await Otp.deleteOne({ _id: otp._id });
};

module.exports = { normalizePhone, sendOtp, checkOtp };
