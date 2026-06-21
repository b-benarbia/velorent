// Standalone not-found page — includes own <html>/<body> to bypass the root
// layout and avoid next-intl initialization during static prerendering.
export default function NotFound() {
  return (
    <html lang="en">
      <body style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'sans-serif', background: '#f8fafc', margin: 0,
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '5rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>404</h1>
          <p style={{ color: '#64748b', marginTop: 8 }}>Page not found</p>
          <a href="/" style={{ color: '#0D9488', fontSize: 14 }}>← Go home</a>
        </div>
      </body>
    </html>
  )
}
