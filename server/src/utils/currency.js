export function formatKES(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  return `KES ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function toDecimal(value) {
  return Math.round(parseFloat(value) * 100) / 100;
}

export function calculateVAT(amount, taxClass = 'standard', inclusive = true) {
  const rate = taxClass === 'standard' ? 0.16 : 0;
  if (rate === 0) return { net: toDecimal(amount), vat: 0, gross: toDecimal(amount) };

  if (inclusive) {
    const net = toDecimal(amount / (1 + rate));
    const vat = toDecimal(amount - net);
    return { net, vat, gross: toDecimal(amount) };
  }

  const vat = toDecimal(amount * rate);
  return { net: toDecimal(amount), vat, gross: toDecimal(amount + vat) };
}
