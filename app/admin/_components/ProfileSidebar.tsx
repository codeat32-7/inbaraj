'use client';

import { useSyncExternalStore } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

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

const SIDEBAR_EVENT = 'studio-sidebar-change';
const subscribeSidebar = (onChange: () => void) => {
  window.addEventListener(SIDEBAR_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};
const readSidebarCollapsed = () => {
  try { return localStorage.getItem('studio-sidebar') !== 'open'; } catch { return true; }
};

export default function ProfileSidebar({ registry, activeTab, onTabChange }: ProfileSidebarProps) {
  // Most recent first
  const profileEntries = Object.entries(registry).sort(
    ([, a], [, b]) => (b.created || '').localeCompare(a.created || '')
  );

  // Collapsed by default; "open" is remembered in this browser (no setState-in-effect, no hydration mismatch).
  const collapsed = useSyncExternalStore(subscribeSidebar, readSidebarCollapsed, () => true);

  const toggle = () => {
    try { localStorage.setItem('studio-sidebar', collapsed ? 'open' : 'closed'); } catch {}
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
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
            color: activeTab === 'create' ? 'var(--bg)' : 'var(--teal)',
            background: activeTab === 'create' ? 'var(--teal)' : 'transparent',
            border: '1px solid var(--teal)',
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
        <a href="/admin/workbench" title="ATS workbench" aria-label="ATS workbench" style={{ ...styles.iconBtn, textDecoration: 'none' }}>
          W
        </a>
        <a href="/admin/ats" title="ATS validator" aria-label="ATS validator" style={{ ...styles.iconBtn, textDecoration: 'none' }}>
          A
        </a>
        <ThemeToggle />
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <ThemeToggle />
          <button onClick={toggle} title="Collapse sidebar" aria-label="Collapse sidebar" style={styles.collapseBtn}>
            «
          </button>
        </div>
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

        <div style={{ ...styles.sectionLabel, marginTop: '1rem' }}>Tools</div>
        <a href="/admin/workbench" style={{ ...styles.item, textDecoration: 'none' }}>
          <span style={styles.itemName}>ATS workbench</span>
          <span style={styles.itemDate}>Fix gaps with Claude + Jev</span>
        </a>
        <a href="/admin/ats" style={{ ...styles.item, textDecoration: 'none' }}>
          <span style={styles.itemName}>ATS validator</span>
          <span style={styles.itemDate}>Jev vs Claude</span>
        </a>

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
    background: 'var(--bg2)',
    borderRight: '1px solid var(--border)',
    height: '100vh',
    position: 'sticky',
    top: 0,
    boxSizing: 'border-box',
  },
  brand: { padding: '0 0.4rem' },
  collapseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text3)',
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
    color: 'var(--text2)',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-mono)',
    cursor: 'pointer',
  },
  iconActive: { background: 'var(--bg3)', borderColor: 'var(--accent)', color: 'var(--text)' },
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
    borderTop: '1px solid var(--border)',
  },
  brandName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 300,
    color: 'var(--text)',
  },
  brandSub: {
    fontSize: '0.72rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    marginTop: 2,
  },
  newBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.6rem 0.8rem',
    background: 'transparent',
    border: '1px solid var(--teal)',
    borderRadius: 6,
    color: 'var(--teal)',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    cursor: 'pointer',
  },
  newBtnActive: { background: 'var(--teal)', color: 'var(--bg)' },
  nav: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 },
  sectionLabel: {
    padding: '0 0.5rem 0.35rem',
    fontSize: '0.68rem',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0 },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 1,
    padding: '0.5rem 0.6rem',
    background: 'transparent',
    borderTop: 'none',
    borderRight: 'none',
    borderBottom: 'none',
    borderLeft: '2px solid transparent',
    borderRadius: 4,
    color: 'var(--text2)',
    textAlign: 'left',
    cursor: 'pointer',
    width: '100%',
    fontFamily: 'var(--font-body)',
  },
  itemActive: {
    background: 'var(--bg3)',
    borderLeft: '2px solid var(--accent)',
    color: 'var(--text)',
  },
  itemName: {
    fontSize: '0.84rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '100%',
  },
  itemDate: { fontSize: '0.68rem', color: 'var(--text3)', fontFamily: 'var(--font-mono)' },
  empty: { padding: '0.5rem 0.6rem', fontSize: '0.78rem', color: 'var(--text3)' },
};
