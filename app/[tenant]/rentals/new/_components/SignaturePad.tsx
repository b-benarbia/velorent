'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import SignaturePadLib from 'signature_pad'

export interface SignaturePadHandle {
  toDataURL: () => string
  isEmpty: () => boolean
  clear: () => void
}

interface Props {
  onChange?: (empty: boolean) => void
  color?: string
  label?: string
  placeholder?: string
}

const SignaturePad = forwardRef<SignaturePadHandle, Props>(
  ({ onChange, color = '#0D9488', label, placeholder }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const padRef    = useRef<SignaturePadLib | null>(null)

    // Init / cleanup
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Scale canvas for device pixel ratio → crisp on retina
      function resize() {
        if (!canvas) return
        const ratio  = window.devicePixelRatio || 1
        const rect   = canvas.getBoundingClientRect()
        canvas.width  = rect.width  * ratio
        canvas.height = rect.height * ratio
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.scale(ratio, ratio)
        // After resize the pad must re-read the canvas
        padRef.current?.clear()
      }

      const pad = new SignaturePadLib(canvas, {
        penColor:  color,
        minWidth:  1.5,
        maxWidth:  2.5,
        throttle:  0,        // No throttle — smoother on fast devices
        velocityFilterWeight: 0.7,
      })
      padRef.current = pad

      pad.addEventListener('afterUpdateStroke', () => {
        onChange?.(!pad.isEmpty())
      })

      resize()

      // Resize listener (orientation change on mobile)
      const observer = new ResizeObserver(resize)
      observer.observe(canvas)

      return () => {
        pad.off()
        observer.disconnect()
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
      toDataURL: () => padRef.current?.toDataURL('image/png') ?? '',
      isEmpty:   () => padRef.current?.isEmpty() ?? true,
      clear:     () => {
        padRef.current?.clear()
        onChange?.(false)
      },
    }))

    return (
      <div>
        {label && (
          <p style={{
            fontSize: 11, fontWeight: 700, color: '#475569',
            textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
          }}>
            {label}
          </p>
        )}
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            // touchAction: none prevents the page from scrolling while signing — critical on mobile
            style={{
              touchAction: 'none', display: 'block', width: '100%', height: 140,
              border: '2px dashed #e2e8f0', borderRadius: 14,
              background: '#f8fafc', cursor: 'crosshair',
            }}
          />
          {placeholder && (
            <p style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 12, color: '#cbd5e1',
              pointerEvents: 'none', userSelect: 'none',
            }}>
              {placeholder}
            </p>
          )}
        </div>
      </div>
    )
  }
)

SignaturePad.displayName = 'SignaturePad'
export default SignaturePad
