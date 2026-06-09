export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#FDF8F3', minHeight: '100vh' }}>
      {children}
    </div>
  )
}
