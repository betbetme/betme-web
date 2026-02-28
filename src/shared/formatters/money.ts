export function formatMoneyU(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return `${safeValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}U`
}
