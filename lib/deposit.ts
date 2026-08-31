// No deposit-percentage field exists on Trip/Tier, so this is a single,
// easily-changed constant rather than something configurable per trip.
export const DEPOSIT_PERCENTAGE = 0.2;

export function computeDepositAmount(price: number): number {
  return Math.round(price * DEPOSIT_PERCENTAGE * 100) / 100;
}
