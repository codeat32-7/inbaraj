'use client';

import { CLAUDE_MODELS } from '@/lib/models';
import { useState, useEffect, useRef, useCallback } from 'react';
import ProfileSidebar from './_components/ProfileSidebar';
import JDForm from './_components/JDForm';
import ProfilePreview from './_components/ProfilePreview';
import GeneratedPreview from './_components/GeneratedPreview';
import EditablePreview from './_components/EditablePreview';
import AtsScore from './_components/AtsScore';

interface RegistryEntry {
  company: string;
  created: string;
  active: boolean;
}

interface ValidationViolation {
  section: string;
  field: string;
  generated: string;
  issue: string;
  suggestion: string;
}

interface ValidationResult {
  valid: boolean;
  violations: ValidationViolation[];
}

interface GeneratedProfile {
  slug: string;
  companyName: string;
  date: string;
  overrides: Record<string, unknown>;
  validation?: ValidationResult;
}

type WizardPhase =
  | { phase: 'intake'; step: 'url' | 'company' | 'role' | 'jd' | 'confirm' | 'select-source' | 'adapt-details' }
  | { phase: 'processing' }
  | { phase: 'review' }
  | { phase: 'publishing' }
  | { phase: 'published'; url: string; slug: string };

interface IntakeData {
  companyName: string;
  roleLabel: string;
  jobDescription: string;
}

const PROGRESS_STEPS = [
  'Reading the job description...',
  'Tailoring your resume...',
  'Checking for accuracy...',
  'Almost done...',
];

const STEP_DELAYS = [3000, 10000, 20000];

const WIZARD_LABELS = ['Start', 'Details', 'Processing', 'Review', 'Published'];

function getWizardStepIndex(phase: WizardPhase): number {
  switch (phase.phase) {
    case 'intake': {
      if (phase.step === 'url') return 0;
      if (phase.step === 'select-source') return 0;
      // All detail steps (company/role/jd/confirm/adapt-details) map to "Details"
      return 1;
    }
    case 'processing': return 2;
    case 'review': return 3;
    case 'publishing': return 4;
    case 'published': return 4;
  }
}

// --- Inline sub-components ---

function FadeIn({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      {children}
    </div>
  );
}

function WizardBreadcrumb({ phase }: { phase: WizardPhase }) {
  const activeIndex = getWizardStepIndex(phase);
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.25rem',
      marginBottom: '1.5rem',
      flexWrap: 'wrap',
    }}>
      {WIZARD_LABELS.map((label, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{
            fontSize: '0.68rem',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.04em',
            color: i < activeIndex ? '#2dd4a8' : i === activeIndex ? '#e8e8ec' : '#3a3a44',
            transition: 'color 0.3s',
          }}>
            {i < activeIndex ? '\u2713 ' : ''}{label}
          </span>
          {i < WIZARD_LABELS.length - 1 && (
            <span style={{ color: '#2a2a30', fontSize: '0.7rem', margin: '0 0.15rem' }}>&rsaquo;</span>
          )}
        </div>
      ))}
    </div>
  );
}

function ProcessingView({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let cumulative = 0;
    STEP_DELAYS.forEach((delay, i) => {
      cumulative += delay;
      timers.push(setTimeout(() => setStep(i + 1), cumulative));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div style={wizardStyles.centeredCard}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%', maxWidth: 340 }}>
        {PROGRESS_STEPS.map((label, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontFamily: "'DM Sans', sans-serif",
            opacity: i <= step ? 1 : 0.3,
            color: i < step ? '#2dd4a8' : i === step ? '#e8e8ec' : '#70708a',
            transition: 'opacity 0.3s, color 0.3s',
          }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '0.7rem', width: 16, textAlign: 'center' as const }}>
              {i < step ? '\u2713' : i === step ? '\u25CF' : '\u25CB'}
            </span>
            {label}
          </div>
        ))}
      </div>
      <button onClick={onCancel} style={wizardStyles.cancelBtn}>Cancel</button>
    </div>
  );
}

function PublishedView({ url, isLive, onViewPage, onCreateAnother, onViewProfile }: {
  url: string;
  isLive: boolean;
  onViewPage: () => void;
  onCreateAnother: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div style={wizardStyles.centeredCard}>
      {isLive ? (
        <span style={{ fontSize: '2rem', color: '#2dd4a8', marginBottom: '0.5rem' }}>{'\u2713'}</span>
      ) : (
        <div style={wizardStyles.spinner} />
      )}
      <h3 style={{
        fontFamily: "'Spectral', serif",
        fontSize: '1.3rem',
        fontWeight: 300,
        color: '#e8e8ec',
        margin: 0,
      }}>
        {isLive ? 'Your page is live!' : 'Publishing your page...'}
      </h3>
      <a
        href={url}
        target="_blank"
        rel="noopener"
        style={{
          fontSize: '0.78rem',
          fontFamily: "'DM Mono', monospace",
          color: isLive ? '#2dd4a8' : '#70708a',
          textDecoration: isLive ? 'underline' : 'none',
          marginTop: '0.25rem',
        }}
      >
        {url}
      </a>
      {!isLive && (
        <p style={{ fontSize: '0.75rem', color: '#70708a', fontFamily: "'DM Mono', monospace", marginTop: '0.25rem' }}>
          This usually takes about a minute...
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem' }}>
        {isLive && (
          <button onClick={onViewPage} style={wizardStyles.primaryBtn}>View Page</button>
        )}
        <button onClick={onViewProfile} style={wizardStyles.secondaryBtn}>View in Dashboard</button>
        <button onClick={onCreateAnother} style={wizardStyles.secondaryBtn}>Create Another</button>
      </div>
    </div>
  );
}

// --- Main component ---

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [model, setModel] = useState<string>(CLAUDE_MODELS[0].id);
  const [password, setPassword] = useState('');
  const [storedPassword, setStoredPassword] = useState('');
  const [registry, setRegistry] = useState<Record<string, RegistryEntry>>({});
  const [activeTab, setActiveTab] = useState<string>('base');
  const [generated, setGenerated] = useState<GeneratedProfile | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [liveCheckUrl, setLiveCheckUrl] = useState<string | null>(null);
  const [liveCheckStatus, setLiveCheckStatus] = useState<'checking' | 'live' | null>(null);
  const [liveCheckSlug, setLiveCheckSlug] = useState<string | null>(null);
  const [violationDecisions, setViolationDecisions] = useState<Record<number, { action: 'keep' | 'remove'; reason?: string }>>({});

  // Wizard state
  const [wizardPhase, setWizardPhase] = useState<WizardPhase>({ phase: 'intake', step: 'url' });
  const [intakeData, setIntakeData] = useState<IntakeData>({ companyName: '', roleLabel: '', jobDescription: '' });
  const abortControllerRef = useRef<AbortController | null>(null);

  // URL scraping state
  const [scrapeState, setScrapeState] = useState<'idle' | 'scraping' | 'done' | 'error'>('idle');
  const [scrapeError, setScrapeError] = useState<string>('');
  const [scrapeUrlValue, setScrapeUrlValue] = useState<string>('');

  // Adapt-from-existing state
  const [adaptSource, setAdaptSource] = useState<string | null>(null); // slug or null for base
  const [adaptInstruction, setAdaptInstruction] = useState<string>('');

  // Inline editing state (pre-publish)
  const [editMode, setEditMode] = useState(false);
  const [baseData, setBaseData] = useState<Record<string, unknown> | null>(null);

  // Post-publish editing state
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileEditOverrides, setProfileEditOverrides] = useState<Record<string, unknown> | null>(null);
  const [profileEditDirty, setProfileEditDirty] = useState(false);
  const [profileEditSaving, setProfileEditSaving] = useState(false);

  // Restore session from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pwd');
    if (saved) {
      setStoredPassword(saved);
      setAuthenticated(true);
      loadProfiles(saved);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredPassword(password);
    setAuthenticated(true);
    sessionStorage.setItem('admin_pwd', password);
    loadProfiles(password);
  };

  const loadProfiles = async (pwd: string) => {
    try {
      const res = await fetch('/api/profiles', {
        headers: { 'x-admin-password': pwd },
      });
      if (res.ok) {
        const data = await res.json();
        setRegistry(data.registry);
      } else {
        setAuthenticated(false);
        sessionStorage.removeItem('admin_pwd');
        setMessage({ type: 'error', text: 'That password didn\'t work. Try again?' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Couldn\'t load your profiles. Please refresh the page.' });
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Poll to check if a newly published profile is live
  useEffect(() => {
    if (!liveCheckUrl || liveCheckStatus === 'live') return;
    setLiveCheckStatus('checking');
    const interval = setInterval(async () => {
      try {
        const res = await fetch(liveCheckUrl, { method: 'HEAD', cache: 'no-store' });
        if (res.ok) {
          setLiveCheckStatus('live');
          setLiveCheckSlug(null);
          clearInterval(interval);
        }
      } catch { /* still building */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [liveCheckUrl, liveCheckStatus]);

  // Tab change with wizard guard
  const handleTabChange = (tab: string) => {
    if (activeTab === 'create' && wizardPhase.phase !== 'intake') {
      if (!confirm('You have work in progress. Switching tabs will discard it. Continue?')) return;
    }
    if (profileEditMode && profileEditDirty) {
      if (!confirm('You have unsaved edits. Switching tabs will discard them. Continue?')) return;
    }
    if (tab !== 'create') {
      resetWizard();
    }
    // Reset profile edit state when switching tabs
    setProfileEditMode(false);
    setProfileEditDirty(false);
    setProfileEditOverrides(null);
    setEditMode(false);
    setActiveTab(tab);
  };

  const resetWizard = () => {
    setWizardPhase({ phase: 'intake', step: 'url' });
    setIntakeData({ companyName: '', roleLabel: '', jobDescription: '' });
    setGenerated(null);
    setViolationDecisions({});
    setScrapeState('idle');
    setScrapeError('');
    setScrapeUrlValue('');
    setAdaptSource(null);
    setAdaptInstruction('');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('resume-model');
      if (saved && CLAUDE_MODELS.some((m) => m.id === saved)) setModel(saved);
    } catch {}
  }, []);

  const handleModelChange = (id: string) => {
    setModel(id);
    try { localStorage.setItem('resume-model', id); } catch {}
  };

  // --- Wizard handlers ---

  const handleStartTailoring = async () => {
    setWizardPhase({ phase: 'processing' });
    setMessage(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({
          companyName: intakeData.companyName,
          jobDescription: intakeData.jobDescription,
          roleLabel: intakeData.roleLabel || undefined,
          model,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      setGenerated(data);
      setViolationDecisions({});
      setWizardPhase({ phase: 'review' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong generating your resume. Try again?',
      });
      setWizardPhase({ phase: 'intake', step: scrapeUrlValue ? 'confirm' : 'jd' });
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleStartAdapt = async () => {
    setWizardPhase({ phase: 'processing' });
    setMessage(null);
    const controller = new AbortController();
    abortControllerRef.current = controller;
    try {
      const res = await fetch('/api/adapt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({
          sourceSlug: adaptSource,
          companyName: intakeData.companyName,
          roleLabel: intakeData.roleLabel || undefined,
          instruction: adaptInstruction,
          model,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Adaptation failed');
      }

      const data = await res.json();
      setGenerated(data);
      setViolationDecisions({});
      setWizardPhase({ phase: 'review' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong adapting your resume. Try again?',
      });
      setWizardPhase({ phase: 'intake', step: 'adapt-details' });
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handlePublish = async () => {
    if (!generated) return;
    setWizardPhase({ phase: 'publishing' });
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify(generated),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Publish failed');
      }

      const data = await res.json();
      const fullUrl = `${window.location.origin}${data.url}`;
      setLiveCheckUrl(fullUrl);
      setLiveCheckSlug(data.slug);
      setLiveCheckStatus(null);
      loadProfiles(storedPassword);
      setWizardPhase({ phase: 'published', url: fullUrl, slug: data.slug });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong publishing your page. Try again?',
      });
      setWizardPhase({ phase: 'review' });
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm(`Remove the ${registry[slug]?.company} profile? This can't be undone.`)) return;
    try {
      const res = await fetch(`/api/profiles/${slug}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': storedPassword },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Profile removed successfully' });
        setActiveTab('base');
        loadProfiles(storedPassword);
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong removing the profile. Try again?' });
    }
  };

  const handleViolationDecision = (index: number, decision: { action: 'keep' | 'remove'; reason?: string }) => {
    setViolationDecisions(prev => ({ ...prev, [index]: decision }));
  };

  const handleIntakeDataChange = (field: keyof IntakeData, value: string) => {
    setIntakeData(prev => ({ ...prev, [field]: value }));
  };

  const handleScrapeUrl = async () => {
    const url = scrapeUrlValue.trim();
    if (!url) return;
    setScrapeState('scraping');
    setScrapeError('');
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Scraping failed');
      }
      const data = await res.json();
      setIntakeData({
        companyName: data.companyName || '',
        roleLabel: data.roleTitle || '',
        jobDescription: data.jobDescription || '',
      });
      setScrapeState('done');
      setWizardPhase({ phase: 'intake', step: 'confirm' });
    } catch (error) {
      setScrapeError(error instanceof Error ? error.message : 'Couldn\'t fetch the job posting. You can enter details manually instead.');
      setScrapeState('error');
    }
  };

  // --- Load base data for editable preview ---
  useEffect(() => {
    if (!storedPassword) return;
    (async () => {
      try {
        const res = await fetch('/api/base', {
          headers: { 'x-admin-password': storedPassword },
        });
        if (res.ok) setBaseData(await res.json());
      } catch { /* base load failed */ }
    })();
  }, [storedPassword]);

  // --- Pre-publish edit handlers ---
  const handlePrePublishOverridesChange = useCallback((newOverrides: Record<string, unknown>) => {
    if (!generated) return;
    setGenerated({ ...generated, overrides: newOverrides });
  }, [generated]);

  // --- Post-publish edit handlers ---
  const handleStartProfileEdit = useCallback(async (slug: string) => {
    try {
      const res = await fetch(`/api/profiles/${slug}`, {
        headers: { 'x-admin-password': storedPassword },
      });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      // Remove meta from overrides (it's stored separately)
      const { meta: _meta, ...overrides } = data;
      void _meta; // meta is stored separately, we only edit overrides
      setProfileEditOverrides(overrides);
      setProfileEditMode(true);
      setProfileEditDirty(false);
    } catch {
      setMessage({ type: 'error', text: 'Couldn\'t load profile for editing. Try again?' });
    }
  }, [storedPassword]);

  const handleProfileEditOverridesChange = useCallback((newOverrides: Record<string, unknown>) => {
    setProfileEditOverrides(newOverrides);
  }, []);

  const handleSaveProfileEdits = useCallback(async (slug: string) => {
    if (!profileEditOverrides) return;
    setProfileEditSaving(true);
    try {
      const res = await fetch(`/api/profiles/${slug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': storedPassword,
        },
        body: JSON.stringify({ overrides: profileEditOverrides }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }
      setProfileEditMode(false);
      setProfileEditDirty(false);
      setProfileEditOverrides(null);
      setMessage({ type: 'success', text: 'Changes saved! Your page will update in about a minute.' });
      // Start live-check polling for the updated profile
      const fullUrl = `${window.location.origin}/r/${slug}`;
      setLiveCheckUrl(fullUrl);
      setLiveCheckSlug(slug);
      setLiveCheckStatus(null);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong saving your edits. Try again?',
      });
    } finally {
      setProfileEditSaving(false);
    }
  }, [profileEditOverrides, storedPassword]);

  const handleCancelProfileEdit = useCallback(() => {
    if (profileEditDirty) {
      if (!confirm('You have unsaved edits. Discard them?')) return;
    }
    setProfileEditMode(false);
    setProfileEditDirty(false);
    setProfileEditOverrides(null);
  }, [profileEditDirty]);

  // --- Render ---

  if (!authenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginBox}>
          <h1 style={styles.loginTitle}>Admin Dashboard</h1>
          <p style={styles.loginSubtitle}>Enter your admin password to continue</p>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={styles.input}
              autoFocus
            />
            <button type="submit" style={styles.primaryBtn}>
              Sign In
            </button>
          </form>
          {message && (
            <p style={{ ...styles.message, color: message.type === 'error' ? '#ef4444' : '#22c55e' }}>
              {message.text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Determine if wizard is in published phase to suppress global live-check banners
  const inWizardPublished = activeTab === 'create' && wizardPhase.phase === 'published';

  return (
    <div className="studio-shell" style={styles.shell}>
      <style>{`
        @media (max-width: 800px) {
          .studio-shell { flex-direction: column !important; }
          .studio-sidebar { width: 100% !important; height: auto !important; max-height: 40vh; position: static !important; border-right: none !important; border-bottom: 1px solid #2a2a30; }
        }
      `}</style>
      <ProfileSidebar
        registry={registry}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <main style={styles.main}>
      {message && (
        <div
          style={{
            ...styles.toast,
            background: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
            borderColor: message.type === 'error' ? '#fca5a5' : '#86efac',
            color: message.type === 'error' ? '#dc2626' : '#16a34a',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Global live-check banners — hidden when wizard shows published phase */}
      {!inWizardPublished && liveCheckStatus === 'checking' && liveCheckUrl && (
        <div style={{
          padding: '0.6rem 1rem',
          borderRadius: 8,
          border: '1px solid #fcd34d',
          background: '#fefce8',
          color: '#a16207',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          fontFamily: "'DM Mono', monospace",
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
          Publishing your page... this usually takes about a minute
        </div>
      )}
      {!inWizardPublished && liveCheckStatus === 'live' && liveCheckUrl && (
        <div style={{
          padding: '0.6rem 1rem',
          borderRadius: 8,
          border: '1px solid #86efac',
          background: '#f0fdf4',
          color: '#16a34a',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          fontFamily: "'DM Mono', monospace",
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
          Your page is live! <a href={liveCheckUrl} target="_blank" rel="noopener" style={{ color: '#16a34a', textDecoration: 'underline' }}>{liveCheckUrl}</a>
        </div>
      )}


      <div style={styles.content}>
        {/* Base resume tab */}
        {activeTab === 'base' && (
          <div>
            <ProfilePreview slug={null} password={storedPassword} offset={32} />
          </div>
        )}

        {/* Create tab — wizard flow */}
        {activeTab === 'create' && (
          <div>
            <WizardBreadcrumb phase={wizardPhase} />

            {/* Phase 1: Intake (step-by-step) */}
            {wizardPhase.phase === 'intake' && (
              <FadeIn key={`intake-${wizardPhase.step}`}>
                <JDForm
                  step={wizardPhase.step}
                  data={intakeData}
                  onDataChange={handleIntakeDataChange}
                  onNext={() => {
                    if (wizardPhase.step === 'company') setWizardPhase({ phase: 'intake', step: 'role' });
                    else if (wizardPhase.step === 'role') setWizardPhase({ phase: 'intake', step: 'jd' });
                    else if (wizardPhase.step === 'select-source') setWizardPhase({ phase: 'intake', step: 'adapt-details' });
                  }}
                  onBack={() => {
                    if (wizardPhase.step === 'company') {
                      setWizardPhase({ phase: 'intake', step: 'url' });
                    } else if (wizardPhase.step === 'role') {
                      setWizardPhase({ phase: 'intake', step: 'company' });
                    } else if (wizardPhase.step === 'jd') {
                      setWizardPhase({ phase: 'intake', step: 'role' });
                    } else if (wizardPhase.step === 'confirm') {
                      setScrapeState('idle');
                      setScrapeError('');
                      setWizardPhase({ phase: 'intake', step: 'url' });
                    } else if (wizardPhase.step === 'adapt-details') {
                      setWizardPhase({ phase: 'intake', step: 'select-source' });
                    } else if (wizardPhase.step === 'select-source') {
                      setAdaptSource(null);
                      setAdaptInstruction('');
                      setWizardPhase({ phase: 'intake', step: 'url' });
                    }
                  }}
                  model={model}
                  onModelChange={handleModelChange}
                  onStartTailoring={handleStartTailoring}
                  onEnterManually={() => setWizardPhase({ phase: 'intake', step: 'company' })}
                  onAdaptExisting={() => setWizardPhase({ phase: 'intake', step: 'select-source' })}
                  scrapeState={scrapeState}
                  scrapeError={scrapeError}
                  scrapeUrl={scrapeUrlValue}
                  onScrapeUrlChange={(val) => {
                    setScrapeUrlValue(val);
                    if (scrapeState !== 'idle') {
                      setScrapeState('idle');
                      setScrapeError('');
                    }
                  }}
                  onScrapeSubmit={handleScrapeUrl}
                  registry={registry}
                  adaptSource={adaptSource}
                  onAdaptSourceChange={setAdaptSource}
                  adaptInstruction={adaptInstruction}
                  onAdaptInstructionChange={setAdaptInstruction}
                  onStartAdapt={handleStartAdapt}
                />
              </FadeIn>
            )}

            {/* Phase 2: Processing */}
            {wizardPhase.phase === 'processing' && (
              <FadeIn>
                <ProcessingView onCancel={() => {
                  abortControllerRef.current?.abort();
                  const backStep = adaptSource !== null ? 'adapt-details' : scrapeUrlValue ? 'confirm' : 'jd';
                  setWizardPhase({ phase: 'intake', step: backStep });
                }} />
              </FadeIn>
            )}

            {/* Phase 3: Review */}
            {wizardPhase.phase === 'review' && generated && (
              <FadeIn>
                <div style={styles.generatedSection}>
                  <div style={styles.generatedHeader}>
                    <div>
                      <h3 style={styles.generatedTitle}>
                        Tailored for {generated.companyName}
                      </h3>
                      <p style={styles.generatedSlug}>
                        Your page: inbaraj.info/r/{generated.slug}
                      </p>
                    </div>
                    <div style={styles.generatedActions}>
                      <button
                        onClick={() => setEditMode(!editMode)}
                        style={editMode ? styles.editBtnActive : styles.editBtn}
                      >
                        {editMode ? 'Done Editing' : 'Edit'}
                      </button>
                      <button
                        onClick={handlePublish}
                        style={(() => {
                          if (!generated.validation || generated.validation.valid) return styles.publishBtn;
                          const unresolvedCount = generated.validation.violations.filter((_, i) => !violationDecisions[i]).length;
                          return unresolvedCount === 0 ? styles.publishBtn : styles.publishBtnWarn;
                        })()}
                        title={(() => {
                          if (!generated.validation || generated.validation.valid) return undefined;
                          const unresolvedCount = generated.validation.violations.filter((_, i) => !violationDecisions[i]).length;
                          return unresolvedCount > 0 ? `${unresolvedCount} items need your review before publishing` : undefined;
                        })()}
                      >
                        {(() => {
                          if (!generated.validation || generated.validation.valid) return 'Publish';
                          const unresolvedCount = generated.validation.violations.filter((_, i) => !violationDecisions[i]).length;
                          return unresolvedCount > 0 ? `Publish (${unresolvedCount} to review)` : 'Publish';
                        })()}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Going back will discard the generated resume. You\'ll need to generate again, which uses an API call. Continue?')) {
                            setEditMode(false);
                            const backStep = adaptSource !== null ? 'adapt-details' : scrapeUrlValue ? 'confirm' : 'jd';
                            setWizardPhase({ phase: 'intake', step: backStep });
                          }
                        }}
                        style={styles.discardBtn}
                      >
                        Revise
                      </button>
                      <button
                        onClick={() => { setEditMode(false); resetWizard(); }}
                        style={styles.discardBtn}
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                  {adaptSource === null && intakeData.jobDescription.trim() && (
                    <AtsScore
                      jobDescription={intakeData.jobDescription}
                      overrides={generated.overrides}
                      password={storedPassword}
                    />
                  )}
                  {editMode ? (
                    <EditablePreview
                      overrides={generated.overrides}
                      base={baseData}
                      password={storedPassword}
                      onOverridesChange={handlePrePublishOverridesChange}
                    />
                  ) : (
                    <GeneratedPreview
                      overrides={generated.overrides}
                      validation={generated.validation}
                      password={storedPassword}
                      onViolationDecision={handleViolationDecision}
                      violationDecisions={violationDecisions}
                    />
                  )}
                </div>
              </FadeIn>
            )}

            {/* Phase 4: Publishing */}
            {wizardPhase.phase === 'publishing' && (
              <FadeIn>
                <div style={styles.deployingOverlay}>
                  <div style={styles.deployingSpinner} />
                  <p style={styles.deployingText}>Publishing your page...</p>
                  <p style={styles.deployingSub}>This usually takes about a minute.</p>
                </div>
              </FadeIn>
            )}

            {/* Phase 5: Published */}
            {wizardPhase.phase === 'published' && (
              <FadeIn>
                <PublishedView
                  url={wizardPhase.url}
                  isLive={liveCheckStatus === 'live'}
                  onViewPage={() => window.open(wizardPhase.url, '_blank')}
                  onCreateAnother={resetWizard}
                  onViewProfile={() => {
                    setActiveTab(wizardPhase.slug);
                    resetWizard();
                  }}
                />
              </FadeIn>
            )}
          </div>
        )}

        {/* Existing profile tab */}
        {activeTab !== 'base' && activeTab !== 'create' && (
          <div>
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  {registry[activeTab]?.company}
                </h2>
                <p style={styles.profileMeta}>
                  inbaraj.info/r/{activeTab} &middot; Created {registry[activeTab]?.created} &middot;{' '}
                  <a
                    href={`/r/${activeTab}`}
                    target="_blank"
                    rel="noopener"
                    style={styles.linkBtn}
                  >
                    View page ↗
                  </a>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {profileEditMode ? (
                  <>
                    <button
                      onClick={() => handleSaveProfileEdits(activeTab)}
                      disabled={!profileEditDirty || profileEditSaving}
                      style={profileEditDirty && !profileEditSaving ? styles.publishBtn : styles.saveBtnDisabled}
                    >
                      {profileEditSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={handleCancelProfileEdit}
                      style={styles.discardBtn}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartProfileEdit(activeTab)}
                      style={styles.editBtn}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(activeTab)}
                      style={styles.deleteBtn}
                    >
                      Remove Profile
                    </button>
                  </>
                )}
              </div>
            </div>
            {liveCheckSlug === activeTab && liveCheckStatus === 'checking' ? (
              <div style={styles.deployingOverlay}>
                <div style={styles.deployingSpinner} />
                <p style={styles.deployingText}>Publishing your page...</p>
                <p style={styles.deployingSub}>Your page is being published. It&apos;ll appear here in about a minute.</p>
              </div>
            ) : profileEditMode && profileEditOverrides ? (
              <div style={styles.generatedSection}>
                <EditablePreview
                  overrides={profileEditOverrides}
                  base={baseData}
                  password={storedPassword}
                  onOverridesChange={handleProfileEditOverridesChange}
                  onDirtyChange={setProfileEditDirty}
                />
              </div>
            ) : (
              <ProfilePreview slug={activeTab} password={storedPassword} />
            )}
          </div>
        )}
      </div>
      </main>
    </div>
  );
}

// --- Wizard-specific styles (for inline components) ---

const wizardStyles: Record<string, React.CSSProperties> = {
  centeredCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111113',
    border: '1px solid #2a2a30',
    borderRadius: 10,
    padding: '3rem 2rem',
    minHeight: 320,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #2a2a30',
    borderTopColor: '#7c6cfa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.5rem',
  },
  cancelBtn: {
    marginTop: '1.5rem',
    padding: '0.4rem 1rem',
    background: 'transparent',
    border: '1px solid #38383f',
    color: '#70708a',
    borderRadius: 6,
    fontSize: '0.75rem',
    cursor: 'pointer',
    fontFamily: "'DM Mono', monospace",
  },
  primaryBtn: {
    padding: '0.55rem 1.2rem',
    background: '#2dd4a8',
    color: '#0a0a0b',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.82rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  secondaryBtn: {
    padding: '0.55rem 1rem',
    background: 'transparent',
    border: '1px solid #38383f',
    color: '#a8a8b8',
    borderRadius: 6,
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
};

// --- Main page styles ---

const styles: Record<string, React.CSSProperties> = {
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0b',
    fontFamily: "'DM Sans', sans-serif",
  },
  loginBox: {
    background: '#111113',
    border: '1px solid #2a2a30',
    borderRadius: 12,
    padding: '3rem',
    width: '100%',
    maxWidth: 440,
  },
  loginTitle: {
    fontFamily: "'Spectral', serif",
    fontSize: '1.6rem',
    fontWeight: 300,
    color: '#e8e8ec',
    marginBottom: '0.4rem',
  },
  loginSubtitle: {
    fontSize: '0.85rem',
    color: '#70708a',
    marginBottom: '1.5rem',
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  input: {
    padding: '0.65rem 1rem',
    background: '#18181c',
    border: '1px solid #2a2a30',
    borderRadius: 6,
    color: '#e8e8ec',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: "'DM Sans', sans-serif",
  },
  primaryBtn: {
    padding: '0.65rem 1.2rem',
    background: '#7c6cfa',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0a0b',
    color: '#e8e8ec',
    fontFamily: "'DM Sans', sans-serif",
  },
  main: {
    flex: 1,
    minWidth: 0,
    padding: '1rem 1.75rem',
  },
  toast: {
    padding: '0.5rem 0.9rem',
    borderRadius: 8,
    border: '1px solid',
    marginBottom: '0.75rem',
    fontSize: '0.85rem',
    fontFamily: "'DM Mono', monospace",
  },
  content: {
    marginTop: 0,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontFamily: "'Spectral', serif",
    fontSize: '1.4rem',
    fontWeight: 300,
    color: '#e8e8ec',
  },
  profileMeta: {
    fontSize: '0.78rem',
    color: '#70708a',
    fontFamily: "'DM Mono', monospace",
    marginTop: '0.3rem',
  },
  linkBtn: {
    fontSize: '0.75rem',
    color: '#7c6cfa',
    textDecoration: 'none',
    fontFamily: "'DM Mono', monospace",
  },
  deleteBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid #ef4444',
    color: '#ef4444',
    borderRadius: 6,
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: "'DM Mono', monospace",
  },
  generatedSection: {
    background: '#111113',
    border: '1px solid #2a2a30',
    borderRadius: 10,
    padding: '1.5rem',
  },
  generatedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  generatedTitle: {
    fontFamily: "'Spectral', serif",
    fontSize: '1.1rem',
    fontWeight: 300,
    color: '#2dd4a8',
  },
  generatedSlug: {
    fontSize: '0.75rem',
    color: '#70708a',
    fontFamily: "'DM Mono', monospace",
    marginTop: '0.25rem',
  },
  generatedActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  publishBtn: {
    padding: '0.5rem 1.2rem',
    background: '#2dd4a8',
    color: '#0a0a0b',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  publishBtnWarn: {
    padding: '0.5rem 1.2rem',
    background: '#fbbf24',
    color: '#0a0a0b',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  editBtn: {
    padding: '0.5rem 1rem',
    background: 'rgba(124,108,250,0.1)',
    border: '1px solid rgba(124,108,250,0.3)',
    color: '#7c6cfa',
    borderRadius: 6,
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  editBtnActive: {
    padding: '0.5rem 1rem',
    background: '#7c6cfa',
    border: '1px solid #7c6cfa',
    color: '#fff',
    borderRadius: 6,
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  saveBtnDisabled: {
    padding: '0.5rem 1.2rem',
    background: '#2a2a30',
    color: '#70708a',
    border: 'none',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'not-allowed',
    fontFamily: "'DM Sans', sans-serif",
  },
  discardBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid #38383f',
    color: '#a8a8b8',
    borderRadius: 6,
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  message: {
    fontSize: '0.82rem',
    marginTop: '0.75rem',
  },
  deployingOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#111113',
    border: '1px solid #2a2a30',
    borderRadius: 10,
    padding: '4rem 2rem',
    minHeight: 400,
  },
  deployingSpinner: {
    width: 32,
    height: 32,
    border: '3px solid #2a2a30',
    borderTopColor: '#7c6cfa',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1.5rem',
  },
  deployingText: {
    fontSize: '1rem',
    color: '#e8e8ec',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: '0.4rem',
  },
  deployingSub: {
    fontSize: '0.78rem',
    color: '#70708a',
    fontFamily: "'DM Mono', monospace",
    textAlign: 'center',
  },
};
