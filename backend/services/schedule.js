// Rules for "deliver later" orders.
const AppError = require('../utils/AppError');

const MIN_LEAD_MINS = 45; // earliest slot from now
const MAX_DAYS_AHEAD = 3;
const OPEN_HOUR = 8; // 8:00 am IST
const CLOSE_HOUR = 23; // 11:00 pm IST
const RELEASE_BEFORE_MINS = 45; // order goes to the kitchen this long before the slot

const istHour = (d) => Number(d.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));

const validateSchedule = (when, now = new Date()) => {
  if (!when) return null;
  const at = new Date(when);
  if (Number.isNaN(at.getTime())) throw AppError.badRequest('Invalid delivery time');
  if (at.getTime() < now.getTime() + MIN_LEAD_MINS * 60 * 1000) {
    throw AppError.badRequest(`Scheduled orders must be at least ${MIN_LEAD_MINS} minutes from now`);
  }
  if (at.getTime() > now.getTime() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000) {
    throw AppError.badRequest(`You can schedule up to ${MAX_DAYS_AHEAD} days ahead`);
  }
  const hour = istHour(at);
  if (hour < OPEN_HOUR || hour >= CLOSE_HOUR) throw AppError.badRequest('We deliver scheduled orders between 8 am and 11 pm');
  return at;
};

module.exports = { validateSchedule, RELEASE_BEFORE_MINS, MIN_LEAD_MINS, MAX_DAYS_AHEAD };
