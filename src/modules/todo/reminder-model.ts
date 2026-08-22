export function oneHourFrom(now: Date): Date {
  return new Date(now.getTime() + 60 * 60 * 1000);
}

export function tomorrowAtNine(now: Date): Date {
  const result = new Date(now);
  result.setDate(result.getDate() + 1);
  result.setHours(9, 0, 0, 0);
  return result;
}

export function formatReminder(iso: string, now = new Date()): string {
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) return '';
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startValue = new Date(value);
  startValue.setHours(0, 0, 0, 0);
  const dayDifference = Math.round(
    (startValue.getTime() - startToday.getTime()) / 86_400_000
  );
  const time = value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (dayDifference === 0) return `Today · ${time}`;
  if (dayDifference === 1) return `Tomorrow · ${time}`;
  return `${value.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })} · ${time}`;
}

export function toLocalDateTimeValue(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
