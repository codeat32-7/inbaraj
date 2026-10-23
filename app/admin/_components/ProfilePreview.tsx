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
    background: '#0a0a0b',
  },
  openBtn: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    padding: '0.35rem 0.7rem',
    background: 'rgba(17,17,19,0.85)',
    border: '1px solid #2a2a30',
    borderRadius: 6,
    fontSize: '0.7rem',
    color: '#7c6cfa',
    textDecoration: 'none',
    fontFamily: "'DM Mono', monospace",
    backdropFilter: 'blur(6px)',
  },
};
