import type { Booking, CancellationRule, CancellationTerms } from '@/types/domain'

export function cancellationRules(terms: CancellationTerms): CancellationRule[] {
  const source = terms.rules?.length ? terms.rules : [
    { hoursBeforeCheckIn: terms.freeUntilHours, refundRate: 1 },
    { hoursBeforeCheckIn: 0, refundRate: Math.max(0, 1 - terms.lateFeeRate) },
  ]
  return [...source].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn)
}

export function cancellationPolicyText(rules: CancellationRule[]) {
  const sorted = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn)
  const clauses = sorted.map(rule => `hủy trước ít nhất ${rule.hoursBeforeCheckIn} giờ: hoàn ${Math.round(rule.refundRate * 100)}%`)
  const lowest = sorted.at(-1)
  if (lowest && lowest.hoursBeforeCheckIn > 0) clauses.push(`hủy dưới ${lowest.hoursBeforeCheckIn} giờ: không hoàn tiền`)
  return clauses.length ? clauses.join('; ').replace(/^./, value => value.toUpperCase()) + '.' : ''
}

export function cancellationQuote(booking: Booking, now = Date.now()) {
  const terms = booking.policyTermsSnapshot
  const checkInTime = String(terms.checkInHour).padStart(2, '0')
  const hoursUntilCheckIn = (Date.parse(`${booking.checkIn}T${checkInTime}:00:00+07:00`) - now) / 3600000
  const allowed = hoursUntilCheckIn > 0
  const rule = cancellationRules(terms).find(item => hoursUntilCheckIn >= item.hoursBeforeCheckIn)
  const refundRate = allowed ? rule?.refundRate ?? 0 : 0
  const fee = allowed ? Math.round(booking.total * (1 - refundRate)) : booking.total
  return { allowed, fee, refund: allowed ? booking.total - fee : 0 }
}
