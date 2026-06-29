export function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatTime(date) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getDateRange(period) {
  const now = new Date();
  const end = endOfDay(now);
  let start;

  switch (period) {
    case 'today':
      start = startOfDay(now);
      break;
    case 'week':
      start = startOfDay(new Date(now.setDate(now.getDate() - 7)));
      break;
    case 'month':
      start = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      break;
    case 'year':
      start = startOfDay(new Date(now.getFullYear(), 0, 1));
      break;
    default:
      start = startOfDay(now);
  }

  return { start, end };
}
