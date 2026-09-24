export function paymentReferenceUpdates(booking, paymentReference) {
  if (booking.booking_group_id) {
    return [
      {
        values: { payment_provider: 'mercado_pago' },
        filters: { booking_group_id: booking.booking_group_id }
      },
      {
        values: { payment_reference: paymentReference },
        filters: { id: booking.id, payment_token: booking.payment_token }
      }
    ];
  }

  return [{
    values: { payment_provider: 'mercado_pago', payment_reference: paymentReference },
    filters: { id: booking.id, payment_token: booking.payment_token }
  }];
}

export function paymentStatusTarget(booking) {
  return booking.booking_group_id
    ? { booking_group_id: booking.booking_group_id }
    : { id: booking.id };
}
