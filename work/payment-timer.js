export function paymentTimeRemaining(expiresAt, now = new Date()) {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / 1000));
}

export function formatPaymentTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
