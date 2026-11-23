'use client';

interface ProfilePreviewProps {
  slug: string | null;
  password: string;
  // Vertical space (px) used by content above/around the preview
  offset?: number;
}

export default function ProfilePreview({ slug, offset = 110 }: ProfilePreviewProps) {
  const displayUrl = slug ? `/r/${slug}` : '/';
  // Use ?view=base to bypass the profile_lock cookie redirect in middleware
  const iframeSrc = slug ? `/r/${slug}` : '/?view=base';

  return (
    <div style={styles.container}>
      <iframe
        src={iframeSrc}
        style={{ ...styles.iframe, height: `calc(100vh - ${offset}px)` }}
        title={slug ? `Profile: ${slug}` : 'Base Resume'}
      />
      <a href={displayUrl} target="_blank" rel="noopener" title={displayUrl} style={styles.openBtn}>
        Open in new tab ↗
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
  },
  iframe: {
    display: 'block',
    width: '100%',
    minHeight: 500,
    border: 'none',
    background: 'var(--bg)',
  },
  openBtn: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    padding: '0.35rem 0.7rem',
    background: 'color-mix(in srgb, var(--bg2) 85%, transparent)',
    border: '1px solid var(--border)',
    borderRadius: 999,
    fontSize: '0.7rem',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontFamily: 'var(--font-mono)',
    backdropFilter: 'blur(6px)',
  },
};
