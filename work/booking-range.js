function localDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function consecutiveDays(firstDay, lastDay) {
  const start = localDay(firstDay);
  const end = localDay(lastDay);
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const days = [];

  for (const day = new Date(from); day <= to; day.setDate(day.getDate() + 1)) {
    if (day.getDay() !== 0) days.push(new Date(day));
  }

  return days;
}

export function isRateAvailableForDays(rate, days) {
  return days.length === 1 || ['day', 'hour'].includes(rate.booking_unit);
}

export function bookingTotalCents(rate, dayCount) {
  return rate.price_cents * (rate.booking_unit === 'month' ? 1 : dayCount);
}

export function occurrenceRanges(days, { startTime, endTime }) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  return days.map((day) => {
    const start = localDay(day);
    start.setHours(startHour, startMinute, 0, 0);
    const end = localDay(day);
    end.setHours(endHour, endMinute, 0, 0);
    return { start, end };
  });
}
