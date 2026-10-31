export function PageWrapper({ children, hasBottomNav = true }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <div className={`max-w-[480px] mx-auto px-4 ${hasBottomNav ? 'pt-16 pb-24' : 'pt-16 pb-8'}`}>
        {children}
      </div>
    </div>
  )
}
