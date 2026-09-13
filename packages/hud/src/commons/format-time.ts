/** Milliseconds as `m:ss.mmm`, or `ss.mmm` under a minute; a delta keeps its sign. */
export function formatTime(ms: number, options: { signed?: boolean } = {}): string {
  let sign = '';
  if (ms < 0) sign = '-';
  else if (options.signed) sign = '+';
  const total = Math.abs(Math.round(ms));
  const minutes = Math.floor(total / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  const millis = total % 1000;
  const secondsText = minutes > 0 ? String(seconds).padStart(2, '0') : String(seconds);
  const minutesText = minutes > 0 ? `${String(minutes)}:` : '';
  return `${sign}${minutesText}${secondsText}.${String(millis).padStart(3, '0')}`;
}
