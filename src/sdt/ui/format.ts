export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${sign}$${(a / 1e3).toFixed(0)}k`;
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}k`;
  return `${sign}$${Math.round(a)}`;
}

export function num(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 2)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(0)}k`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;

export function ms(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s`;
  return `${Math.round(n)}ms`;
}

export function avail(a: number): string {
  if (a >= 0.99995) return '99.99%';
  if (a >= 0.999) return `${(Math.floor(a * 10000) / 100).toFixed(2)}%`;
  return `${(Math.floor(a * 1000) / 10).toFixed(1)}%`;
}

/** Utilisation → status colour token. */
export function utilTone(u: number): 'ok' | 'busy' | 'hot' | 'over' {
  if (u >= 1) return 'over';
  if (u >= 0.85) return 'hot';
  if (u >= 0.7) return 'busy';
  return 'ok';
}
