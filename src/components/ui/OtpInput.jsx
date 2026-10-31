import { useRef, useCallback, useEffect } from 'react'

/**
 * The four boxes that take the access code.
 *
 * `status` paints the borders: 'error' turns them red and shakes the row, and
 * 'success' lights them green one after another, left to right — the border
 * creeps across the boxes while the app decides where to take you next.
 *
 * `attempt` is a rising counter of failures. React will not restart a CSS
 * animation that is already on an element, so the shake is re-applied by hand
 * each time a new attempt fails.
 */
export function OtpInput({ value, onChange, length = 4, autoFocus = true, status = 'idle', attempt = 0 }) {
  const inputs = useRef([])
  const wrapRef = useRef(null)

  useEffect(() => {
    if (status !== 'error' || !wrapRef.current) return
    const el = wrapRef.current
    el.classList.remove('otp-shake')
    void el.offsetWidth // forces a reflow so the animation starts again
    el.classList.add('otp-shake')
  }, [status, attempt])

  const focusInput = useCallback((index) => {
    if (index >= 0 && index < length) {
      inputs.current[index]?.focus()
      inputs.current[index]?.select()
    }
  }, [length])

  function handleChange(index, e) {
    const val = e.target.value.replace(/\D/g, '')
    if (!val) return

    const chars = value.split('')
    chars[index] = val[val.length - 1]
    const next = chars.join('').slice(0, length)
    onChange(next)

    if (index < length - 1) focusInput(index + 1)
  }

  function handleKeyDown(index, e) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const chars = value.split('')
      if (chars[index]) {
        chars[index] = ''
        onChange(chars.join(''))
      } else if (index > 0) {
        chars[index - 1] = ''
        onChange(chars.join(''))
        focusInput(index - 1)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1)
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      focusInput(index + 1)
    }
  }

  function handlePaste(e) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (pasted) {
      onChange(pasted)
      focusInput(Math.min(pasted.length, length - 1))
    }
  }

  const chars = value.split('')

  const borderClass =
    status === 'error' ? 'border-red-500'
    : status === 'success' ? 'border-green-600'
    : 'border-gray-200 focus:border-primary'

  return (
    <div ref={wrapRef} className="flex items-center gap-2" onPaste={handlePaste}>
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={chars[i] ? '•' : ''}
          onChange={e => handleChange(i, e)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          style={{
            // The green border walks across the boxes instead of snapping on.
            transitionDelay: status === 'success' ? `${i * 130}ms` : undefined,
          }}
          className={`w-12 h-14 text-center text-lg font-bold tracking-widest rounded-lg border-[1.5px] outline-none bg-white text-gray-900 transition-colors duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${borderClass}`}
        />
      ))}
    </div>
  )
}
