'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'linear-gradient(135deg, #6366F1 0%, #8b5cf6 100%)',
        color: 'white', padding: '10px 20px', borderRadius: '10px',
        fontSize: '13px', fontWeight: '600', fontFamily: 'Arial, sans-serif',
        border: 'none', cursor: 'pointer', letterSpacing: '0.01em',
        boxShadow: '0 2px 12px rgba(99,102,241,0.3)',
        transition: 'opacity 0.15s ease, transform 0.1s ease',
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.opacity = '0.9' }}
      onMouseLeave={e => { (e.target as HTMLElement).style.opacity = '1' }}
    >
      <Printer size={15} />
      Imprimer / Sauvegarder PDF
    </button>
  )
}
