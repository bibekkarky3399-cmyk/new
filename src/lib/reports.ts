export function parseDateRange(searchParams: URLSearchParams): {
  from: Date;
  to: Date;
} {
  const now = new Date();
  const defaultTo = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
  );
  const defaultFrom = new Date(defaultTo);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 30);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam && !Number.isNaN(Date.parse(fromParam))
    ? new Date(fromParam)
    : defaultFrom;
  const toRaw = toParam && !Number.isNaN(Date.parse(toParam))
    ? new Date(toParam)
    : defaultTo;
  // Treat `to` as inclusive of the whole day.
  const to = new Date(toRaw);
  if (toParam) to.setUTCDate(to.getUTCDate() + 1);

  return { from, to };
}
