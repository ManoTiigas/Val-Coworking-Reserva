function bookingKey(booking) {
  return booking.booking_group_id || booking.id || booking.booking_code;
}

export function groupBookings(bookings) {
  const groups = new Map();

  for (const booking of bookings) {
    const key = bookingKey(booking);
    groups.set(key, [...(groups.get(key) || []), booking]);
  }

  return [...groups.values()]
    .map((items) => {
      const ordered = [...items].sort((left, right) => new Date(left.start_at) - new Date(right.start_at));
      const first = ordered[0];
      const last = ordered.at(-1);
      const { booking_group_id, ...details } = first;

      return {
        ...details,
        end_at: last.end_at,
        day_count: ordered.length,
        is_multi_day: ordered.length > 1,
      };
    })
    .sort((left, right) => new Date(right.start_at) - new Date(left.start_at));
}
