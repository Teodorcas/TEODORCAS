export function Badge({ label, type = 'info' }) {
  const styles = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-orange-100 text-orange-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-primary-light text-primary',
    bulk: 'bg-primary-light text-primary',
    small: 'bg-gray-100 text-gray-600',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[type] || styles.info}`}>
      {label}
    </span>
  )
}
