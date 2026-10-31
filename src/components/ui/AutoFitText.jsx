import { useRef, useEffect } from 'react'

export function AutoFitText({ children, className = '', style = {}, minFontSize = 10, maxFontSize = 32, onFit, fontSize }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    if (fontSize) return
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    function fitText() {
      const containerWidth = container.offsetWidth
      text.style.fontSize = maxFontSize + 'px'
      const textWidth = text.scrollWidth

      if (textWidth <= containerWidth) {
        text.style.fontSize = maxFontSize + 'px'
        if (onFit) onFit(maxFontSize)
        return
      }

      let low = minFontSize
      let high = maxFontSize

      while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        text.style.fontSize = mid + 'px'
        if (text.scrollWidth <= containerWidth) {
          low = mid + 1
        } else {
          high = mid - 1
        }
      }
      text.style.fontSize = high + 'px'
      if (onFit) onFit(high)
    }

    fitText()

    const observer = new ResizeObserver(fitText)
    observer.observe(container)

    return () => observer.disconnect()
  }, [children, minFontSize, maxFontSize, onFit, fontSize])

  if (fontSize) {
    return (
      <div ref={containerRef} className={className} style={{ ...style, overflow: 'hidden' }}>
        <span ref={textRef} style={{ display: 'block', width: '100%', whiteSpace: 'nowrap', fontSize: fontSize + 'px' }}>
          {children}
        </span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={className} style={{ ...style, overflow: 'hidden' }}>
      <span ref={textRef} style={{ display: 'block', width: '100%', whiteSpace: 'nowrap' }}>
        {children}
      </span>
    </div>
  )
}
