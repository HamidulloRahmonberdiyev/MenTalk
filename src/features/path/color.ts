/** Lightens (amount > 0) or darkens (amount < 0) a `#RRGGBB` colour by a share of the way to white or black. */
export function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  const target = amount < 0 ? 0 : 255;
  const share = Math.abs(amount);
  const channel = (shift: number) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (target - c) * share)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

export const GOLD = '#FFC233';
export const GOLD_DEEP = '#F09A0C';
