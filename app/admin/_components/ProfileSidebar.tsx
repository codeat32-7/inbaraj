'use client';

import { useEffect, useState } from 'react';

interface RegistryEntry {
  company: string;
  created: string;
  active: boolean;
}

interface ProfileSidebarProps {
  registry: Record<string, RegistryEntry>;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function ProfileSidebar({ registry, activeTab, onTabChange }: ProfileSidebarProps) {
  // Most recent first
  const profileEntries = Object.entries(registry).sort(
    ([, a], [, b]) => (b.created || '').localeCompare(a.created || '')
  );

  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem('studio-sidebar') === 'open') setCollapsed(false);
    } catch {}
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem('studio-sidebar', c ? 'open' : 'closed'); } catch {}
      return !c;
    });
  };

  if (collapsed) {
    return (
      <aside
        className="studio-sidebar"
        style={{ ...styles.sidebar, width: 56, alignItems: 'center', padding: '1rem 0.4rem' }}
      >
        <button onClick={toggle} title="Expand sidebar" aria-label="Expand sidebar" style={styles.iconBtn}>
          »
        </button>
        <button
          onClick={() => onTabChange('create')}
          title="New resume"
          aria-label="New resume"
          style={{
            ...styles.iconBtn,
            color: activeTab === 'create' ? '#0a0a0b' : '#2dd4a8',
            background: activeTab === 'create' ? '#2dd4a8' : 'transparent',
            border: '1px solid #2dd4a8',
          }}
        >
          +
        </button>
        <button
          onClick={() => onTabChange('base')}
          title="Base Resume"
          aria-label="Base Resume"
          style={{ ...styles.iconBtn, ...(activeTab === 'base' ? styles.iconActive : {}) }}
        >
          B
        </button>
        <div style={styles.stripList}>
          {profileEntries.map(([slug, entry]) => (
            <button
              key={slug}
              onClick={() => onTabChange(slug)}
              title={entry.company}
              aria-label={entry.company}
              style={{ ...styles.iconBtn, ...(activeTab === slug ? styles.iconActive : {}) }}
            >
              {(entry.company || '?').charAt(0).toUpperCase()}
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="studio-sidebar" style={styles.sidebar}>
      <div style={{ ...styles.brand, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={styles.brandName}>Resume Studio</div>
          <div style={styles.brandSub}>Tailored resumes</div>
        </div>
        <button onClick={toggle} title="Collapse sidebar" aria-label="Collapse sidebar" style={styles.collapseBtn}>
          «
        </button>
      </div>

      <button
        onClick={() => onTabChange('create')}
        style={{
          ...styles.newBtn,
          ...(activeTab === 'create' ? styles.newBtnActive : {}),
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> New resume
      </button>

      <div style={styles.nav}>
        <div style={styles.sectionLabel}>Base</div>
        <button
          onClick={() => onTabChange('base')}
          style={{ ...styles.item, ...(activeTab === 'base' ? styles.itemActive : {}) }}
        >
          <span style={styles.itemName}>Base Resume</span>
        </button>

        <div style={{ ...styles.sectionLabel, marginTop: '1rem' }}>
          Tailored ({profileEntries.length})
        </div>
        <div style={styles.list}>
          {profileEntries.length === 0 && <div style={styles.empty}>No tailored resumes yet</div>}
          {profileEntries.map(([slug, entry]) => (
            <button
              key={slug}
              onClick={() => onTabChange(slug)}
              title={`/r/${slug}`}
              style={{ ...styles.item, ...(activeTab === slug ? styles.itemActive : {}) }}
            >
              <span style={styles.itemName}>{entry.company}</span>
              <span style={styles.itemDate}>{entry.created}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: 248,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.1rem 0.9rem',
    background: '#0e0e10',
    borderRight: '1px solid #2a2a30',
    height: '100vh',
    position: 'sticky',
    top: 0,
    boxSizing: 'border-box',
  },
  brand: { padding: '0 0.4rem' },
  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: '#70708a',
    fontSize: '1.1rem',
    cursor: 'pointer',
    padding: '0 0.3rem',
  },
  iconBtn: {
    width: 36,
    height: 36,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 8,
    color: '#b0b0c0',
    fontSize: '0.9rem',
    fontFamily: "'DM Mono', monospace",
    cursor: 'pointer',
  },
  iconActive: { background: '#1a1a1f', borderColor: '#7c6cfa', color: '#e8e8ec' },
  stripList: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    overflowY: 'auto',
    minHeight: 0,
    width: '100%',
    marginTop: 6,
    paddingTop: 10,
    borderTop: '1px solid #2a2a30',
  },
  brandName: {
    fontFamily: "'Spectral', serif",
    fontSize: '1.2rem',
    fontWeight: 300,
    color: '#e8e8ec',
  },
  brandSub: {
    fontSize: '0.72rem',
    color: '#70708a',
    fontFamily: "'DM Mono', monospace",
    marginTop: 2,
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.6rem 0.8rem',
    background: 'transparent',
    border: '1px solid #2dd4a8',
    borderRadius: 6,
    color: '#2dd4a8',
    fontSize: '0.82rem',
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
  },
  newBtnActive: { background: '#2dd4a8', color: '#0a0a0b' },
  nav: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 },
  sectionLabel: {
    padding: '0 0.5rem 0.35rem',
    fontSize: '0.68rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#70708a',
    fontFamily: "'DM Mono', monospace",
  },
  list: { display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0 },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    padding: '0.5rem 0.6rem',
    background: 'transparent',
    border: 'none',
    borderLeft: '2px solid transparent',
    borderRadius: 4,
    color: '#b0b0c0',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    fontFamily: "'DM Sans', sans-serif",
  },
  itemActive: {
    background: '#1a1a1f',
    borderLeftColor: '#7c6cfa',
    color: '#e8e8ec',
  },
  itemName: {
    fontSize: '0.84rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  itemDate: { fontSize: '0.68rem', color: '#70708a', fontFamily: "'DM Mono', monospace" },
  empty: { padding: '0.5rem 0.6rem', fontSize: '0.78rem', color: '#70708a' },
};
