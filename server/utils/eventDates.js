const { BadRequestError } = require('./AppError');

const DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS = 30;

/**
 * Normalises the dates of an event that may run over several days.
 * Accepts { date, endDate } or { date, days }. Returns { date, endDate } where
 * endDate is undefined for a one-day event. Throws on impossible ranges.
 */
function eventDates({ date, endDate, days } = {}) {
    const start = new Date(date);
    if (!date || Number.isNaN(start.getTime())) throw new BadRequestError('Give the event date.');
    let end = null;
    const n = Math.floor(Number(days));
    if (endDate) {
        end = new Date(endDate);
        if (Number.isNaN(end.getTime())) throw new BadRequestError('The last day is not a valid date.');
    } else if (n > 1) {
        end = new Date(start.getTime() + (n - 1) * DAY);
    }
    if (end) {
        if (end < start) throw new BadRequestError('The last day cannot be before the first day.');
        if ((end - start) / DAY > MAX_DAYS - 1) throw new BadRequestError(`An event can run for at most ${MAX_DAYS} days.`);
        if (end.toDateString() === start.toDateString()) end = null;
    }
    return { date: start, endDate: end || undefined };
}

/** Number of calendar days an event covers (1 for a one-day event). */
const dayCount = (date, endDate) => (endDate ? Math.round((new Date(endDate).setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / DAY) + 1 : 1);

module.exports = { eventDates, dayCount, MAX_DAYS, DAY };
