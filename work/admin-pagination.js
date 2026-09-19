export function pageBounds({ total, page, pageSize }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * pageSize;

  return {
    from,
    to: Math.min(from + pageSize - 1, Math.max(total - 1, 0)),
    totalPages,
  };
}
