export function money(n: number, digits = 1): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(digits)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(digits)}M`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(a >= 1e5 ? 0 : digits)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function num(n: number, digits = 1): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(digits)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(digits)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}k`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(digits)}k`;
  if (a >= 100) return `${Math.round(n)}`;
  return n.toFixed(a < 10 && a % 1 !== 0 ? 1 : 0);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)}%`;
}

export function ms(n: number): string {
  if (n >= 10_000) return `${(n / 1000).toFixed(0)}s`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

export function dateLabel(day: number): string {
  const y = Math.floor(day / 365) + 1;
  const rem = day % 365;
  const m = Math.floor(rem / 30.42) + 1;
  return `Y${y} · M${Math.min(12, m)} · D${day}`;
}

export function uptime(u: number): string {
  if (u >= 0.99999) return '100%';
  if (u >= 0.999) return `${(u * 100).toFixed(2)}%`;
  return `${(u * 100).toFixed(1)}%`;
}

export function utilColor(u: number): string {
  if (u > 1) return 'var(--bad)';
  if (u > 0.85) return 'var(--warn)';
  if (u > 0.6) return 'var(--ok)';
  return 'var(--good)';
}

export function satColor(v: number): string {
  if (v >= 75) return 'var(--good)';
  if (v >= 50) return 'var(--ok)';
  if (v >= 35) return 'var(--warn)';
  return 'var(--bad)';
}
