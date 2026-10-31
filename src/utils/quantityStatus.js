export function getQuantityStatus(quantity, threshold) {
  if (quantity === 0) return 'critical'
  if (quantity <= threshold) return 'low'
  return 'healthy'
}

export function getQuantityColorClass(status) {
  switch (status) {
    case 'healthy': return 'text-green-600'
    case 'low': return 'text-orange-500'
    case 'critical': return 'text-red-600'
    default: return 'text-gray-600'
  }
}
