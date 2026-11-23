// The Studio's UI is built with inline dark-theme colours, so it always renders in the dark theme
// regardless of the public site's light default / visitor toggle.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {children}
    </div>
  );
}
