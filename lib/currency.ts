export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)

  // Thermal printers may render non-breaking spaces as garbled characters.
  return formatted
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}
