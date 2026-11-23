// The Studio follows the site theme (light by default, dark via the toggle in the sidebar).
// All Studio colours come from the theme tokens in app/globals.css.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>{children}</div>;
}
