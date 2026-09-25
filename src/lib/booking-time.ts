// Public bookings use Philippine time regardless of the browser/server timezone.
export function getBookingToday(now = Date.now()): string {
  return new Date(now + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function getBookingTimestamp(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return NaN;
  }
  const timestamp = Date.parse(`${date}T${time}:00+08:00`);
  // Reject impossible dates that JavaScript would otherwise normalize.
  if (!Number.isFinite(timestamp) || getBookingToday(timestamp) !== date) return NaN;
  return timestamp;
}

export function isFutureBooking(date: string, time: string, now = Date.now()): boolean {
  return getBookingTimestamp(date, time) > now;
}
