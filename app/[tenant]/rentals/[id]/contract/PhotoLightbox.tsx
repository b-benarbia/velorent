'use client'
import { useState, useEffect } from 'react'

export default function PhotoLightbox({
  src,
  alt,
  thumbStyle,
}: {
  src: string
  alt?: string
  thumbStyle?: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? 'ID'}
        onClick={() => setOpen(true)}
        title="Cliquer pour agrandir"
        style={{
          height: 72, width: 108, borderRadius: 5,
          border: '1px solid #E2E8F0', objectFit: 'cover',
          flexShrink: 0, cursor: 'zoom-in',
          transition: 'box-shadow 0.15s',
          ...thumbStyle,
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 10px rgba(13,148,136,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
      />

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(15,23,42,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 20,
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%', width: 40, height: 40,
              color: 'white', fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            aria-label="Fermer"
          >✕</button>

          {/* Full-size image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? 'ID'}
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '88vw', maxHeight: '88vh',
              borderRadius: 12, objectFit: 'contain',
              boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
            }}
          />
          <p style={{
            position: 'absolute', bottom: 20,
            color: 'rgba(255,255,255,0.35)', fontSize: 12, letterSpacing: '0.05em',
          }}>
            Appuyez sur Echap ou cliquez en dehors pour fermer
          </p>
        </div>
      )}
    </>
  )
}
