'use client'

export function LogoutButton() {
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }
  return (
    <button
      onClick={logout}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: 'var(--text-sub)',
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 600,
        padding: '7px 14px',
        borderRadius: 999,
        cursor: 'pointer',
      }}
    >
      Se déconnecter
    </button>
  )
}
