import { format, isToday, isYesterday } from 'date-fns'

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '₦0'
  return '₦' + Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function formatTime(dateString) {
  return format(new Date(dateString), 'hh:mm a')
}

export function formatDate(dateString) {
  return format(new Date(dateString), 'dd MMM yyyy')
}

export function formatRelativeDate(dateString) {
  const date = new Date(dateString)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'dd MMM yyyy')
}
