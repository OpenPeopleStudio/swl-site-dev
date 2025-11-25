export function formatServiceDate(dateString: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return formatter.format(new Date(dateString));
}

export function formatWindow(start: string, end: string) {
  return `${start.slice(0, 5)}–${end.slice(0, 5)}`;
}

export function formatSyncTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

