'use client';

import { CLAUDE_MODELS } from '@/lib/models';

interface RegistryEntry {
  company: string;
  created: string;
  active: boolean;
}

interface IntakeData {
  companyName: string;
  roleLabel: string;
  jobDescription: string;
}

interface JDFormProps {
  step: 'url' | 'company' | 'role' | 'jd' | 'confirm' | 'select-source' | 'adapt-details';
  data: IntakeData;
  onDataChange: (field: keyof IntakeData, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onStartTailoring: () => void;
  onEnterManually: () => void;
  onAdaptExisting: () => void;
  scrapeState: 'idle' | 'scraping' | 'done' | 'error';
  scrapeError?: string;
  scrapeUrl: string;
  onScrapeUrlChange: (url: string) => void;
  onScrapeSubmit: () => void;
  // Adapt-from-existing props
  registry: Record<string, RegistryEntry>;
  adaptSource: string | null;
  onAdaptSourceChange: (slug: string | null) => void;
  adaptInstruction: string;
  onAdaptInstructionChange: (val: string) => void;
  onStartAdapt: () => void;
  model: string;
  onModelChange: (id: string) => void;
}

export default function JDForm({
  step, data, onDataChange, onNext, onBack, onStartTailoring,
  onEnterManually, onAdaptExisting, scrapeState, scrapeError, scrapeUrl, onScrapeUrlChange, onScrapeSubmit,
  registry, adaptSource, onAdaptSourceChange, adaptInstruction, onAdaptInstructionChange, onStartAdapt,
  model, onModelChange,
}: JDFormProps) {
  const modelPicker = (
    <select
      value={model}
      onChange={(e) => onModelChange(e.target.value)}
      aria-label="AI model"
      title="AI model"
      style={{
        padding: '0.7rem 0.9rem',
        background: 'transparent',
        color: 'inherit',
        border: '1px solid color-mix(in srgb, var(--text) 15%, transparent)',
        borderRadius: 6,
        fontSize: '0.85rem',
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
      }}
    >
      {CLAUDE_MODELS.map((m) => (
        <option key={m.id} value={m.id} style={{ color: '#000' }}>
          {m.label} — {m.hint}
        </option>
      ))}
    </select>
  );
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'url' && scrapeUrl.trim() && scrapeState === 'idle') onScrapeSubmit();
      if (step === 'company' && data.companyName.trim()) onNext();
      if (step === 'role') onNext();
    }
  };

  const isScraping = scrapeState === 'scraping';

  return (
    <div style={styles.form}>
      {/* Step: URL input (first step) */}
      {step === 'url' && (
        <div style={styles.stepContainer}>
          <p style={styles.prompt}>Have a job posting link?</p>
          <div style={styles.field}>
            <input
              type="url"
              value={scrapeUrl}
              onChange={(e) => onScrapeUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. https://linkedin.com/jobs/view/..."
              style={{
                ...styles.input,
                opacity: isScraping ? 0.5 : 1,
              }}
              autoFocus
              disabled={isScraping}
            />

            {isScraping && (
              <div style={styles.scrapeStatus}>
                <span style={styles.scrapeSpinner} />
                Reading the job posting...
              </div>
            )}

            {scrapeState === 'error' && scrapeError && (
              <p style={styles.scrapeErrorText}>{scrapeError}</p>
            )}

            {scrapeState === 'idle' && (
              <p style={styles.hint}>
                Paste a LinkedIn, Greenhouse, Lever, or any careers page link.
                I&apos;ll extract the company, role, and job description automatically.
              </p>
            )}
          </div>

          <div style={styles.btnRow}>
            <button
              onClick={onScrapeSubmit}
              disabled={!scrapeUrl.trim() || isScraping}
              style={{
                ...styles.nextBtn,
                opacity: (!scrapeUrl.trim() || isScraping) ? 0.4 : 1,
              }}
            >
              {isScraping ? 'Fetching...' : 'Fetch Details'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={onEnterManually} style={styles.manualLink} disabled={isScraping}>
              or enter details manually
            </button>
            <span style={{ color: 'var(--border)', fontSize: '0.72rem' }}>|</span>
            <button onClick={onAdaptExisting} style={styles.manualLink} disabled={isScraping}>
              adapt an existing resume
            </button>
          </div>
        </div>
      )}

      {/* Step: Company name (manual path) */}
      {step === 'company' && (
        <div style={styles.stepContainer}>
          <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
          <p style={styles.prompt}>What company is this resume for?</p>
          <div style={styles.field}>
            <input
              type="text"
              value={data.companyName}
              onChange={(e) => onDataChange('companyName', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Google, Stripe, Freshworks"
              style={styles.input}
              autoFocus
            />
            <p style={styles.hint}>Your resume will be at inbaraj.info/r/company-name</p>
          </div>
          <button
            onClick={onNext}
            disabled={!data.companyName.trim()}
            style={{
              ...styles.nextBtn,
              opacity: !data.companyName.trim() ? 0.4 : 1,
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Step: Role label (manual path) */}
      {step === 'role' && (
        <div style={styles.stepContainer}>
          <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
          <p style={styles.prompt}>Any specific role? <span style={styles.optionalTag}>(optional)</span></p>
          <div style={styles.field}>
            <input
              type="text"
              value={data.roleLabel}
              onChange={(e) => onDataChange('roleLabel', e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Implementation Lead, Business Analyst"
              style={styles.input}
              autoFocus
            />
            <p style={styles.hint}>If applying for multiple roles at the same company. URL becomes /r/company-role-label.</p>
          </div>
          <div style={styles.btnRow}>
            <button onClick={onNext} style={styles.nextBtn}>
              {data.roleLabel.trim() ? 'Next' : 'Skip'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Job description (manual path) */}
      {step === 'jd' && (
        <div style={styles.stepContainer}>
          <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
          <p style={styles.prompt}>
            Paste the job description for{' '}
            <span style={styles.companyHighlight}>{data.companyName}</span>
            {data.roleLabel ? ` (${data.roleLabel})` : ''}
          </p>
          <div style={styles.field}>
            <textarea
              value={data.jobDescription}
              onChange={(e) => onDataChange('jobDescription', e.target.value)}
              placeholder="Paste the full job description here..."
              style={styles.textarea}
              rows={14}
              autoFocus
            />
            <p style={styles.hint}>I&apos;ll analyze this and tailor your resume to match.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={onStartTailoring}
            disabled={!data.jobDescription.trim()}
            style={{
              ...styles.startBtn,
              opacity: !data.jobDescription.trim() ? 0.4 : 1,
            }}
          >
            Start Tailoring
          </button>
          {modelPicker}

          </div>
        </div>
      )}

      {/* Step: Select source resume (adapt path) */}
      {step === 'select-source' && (
        <div style={styles.stepContainer}>
          <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
          <p style={styles.prompt}>Which resume do you want to start from?</p>
          <div style={styles.field}>
            <div style={styles.sourceList}>
              <button
                onClick={() => onAdaptSourceChange(null)}
                style={{
                  ...styles.sourceItem,
                  ...(adaptSource === null ? styles.sourceItemActive : {}),
                }}
              >
                <span style={styles.sourceLabel}>Base Resume</span>
                <span style={styles.sourceHint}>Your original resume at inbaraj.info</span>
              </button>
              {Object.entries(registry)
                .filter(([, entry]) => entry.active)
                .sort(([, a], [, b]) => b.created.localeCompare(a.created))
                .map(([slug, entry]) => (
                  <button
                    key={slug}
                    onClick={() => onAdaptSourceChange(slug)}
                    style={{
                      ...styles.sourceItem,
                      ...(adaptSource === slug ? styles.sourceItemActive : {}),
                    }}
                  >
                    <span style={styles.sourceLabel}>{entry.company}</span>
                    <span style={styles.sourceHint}>/r/{slug} · {entry.created}</span>
                  </button>
                ))}
            </div>
          </div>
          <button
            onClick={onNext}
            style={styles.nextBtn}
          >
            Next
          </button>
        </div>
      )}

      {/* Step: Adapt details — company name + instruction (adapt path) */}
      {step === 'adapt-details' && (() => {
        const isFromBase = adaptSource === null;
        const sourceName = isFromBase
          ? 'your base resume'
          : (registry[adaptSource]?.company || adaptSource);
        const hasCompany = data.companyName.trim().length > 0;
        const hasRole = data.roleLabel.trim().length > 0;
        // Can start if: has instruction AND (has company OR has role for default variant)
        const canStart = adaptInstruction.trim().length > 0 && (hasCompany || hasRole);

        return (
          <div style={styles.stepContainer}>
            <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
            <p style={styles.prompt}>
              {isFromBase
                ? 'Tell me about this version'
                : <>Adapting from <span style={styles.companyHighlight}>{sourceName}</span></>
              }
            </p>

            <div style={styles.confirmFields}>
              <div style={styles.field}>
                <label style={styles.label}>
                  Company {isFromBase && <span style={styles.optionalTag}>(optional)</span>}
                </label>
                <input
                  type="text"
                  value={data.companyName}
                  onChange={(e) => onDataChange('companyName', e.target.value)}
                  placeholder="e.g. Google, Stripe, Freshworks"
                  style={styles.input}
                  autoFocus
                />
                {isFromBase && !hasCompany && (
                  <p style={styles.hint}>
                    Leave blank to create a general-purpose variant — I&apos;ll use the role as the label
                  </p>
                )}
                {hasCompany && (
                  <p style={styles.hint}>Your page will be at inbaraj.info/r/company-name</p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  Role {hasCompany && <span style={styles.optionalTag}>(optional)</span>}
                  {isFromBase && !hasCompany && <span style={styles.requiredTag}>(required)</span>}
                </label>
                <input
                  type="text"
                  value={data.roleLabel}
                  onChange={(e) => onDataChange('roleLabel', e.target.value)}
                  placeholder="e.g. Implementation Lead, Business Analyst"
                  style={styles.input}
                />
                {isFromBase && !hasCompany && hasRole && (
                  <p style={styles.hint}>
                    Your page will be at inbaraj.info/r/d-{data.roleLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}
                  </p>
                )}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>What should I change?</label>
                <textarea
                  value={adaptInstruction}
                  onChange={(e) => onAdaptInstructionChange(e.target.value)}
                  placeholder={isFromBase
                    ? 'e.g. Emphasize data migration experience, add a domain expertise section for fintech, focus the hero on implementation leadership...'
                    : 'e.g. Focus more on customer success, swap the skills emphasis, hide the projects section...'}
                  style={styles.textarea}
                  rows={6}
                />
                <p style={styles.hint}>
                  Describe how this version should differ
                  {isFromBase ? '' : ` from the ${sourceName} resume`}.
                  I&apos;ll adapt it based on your instructions.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={onStartAdapt}
              disabled={!canStart}
              style={{
                ...styles.startBtn,
                opacity: !canStart ? 0.4 : 1,
              }}
            >
              Start Adapting
            </button>
          {modelPicker}

          </div>
          </div>
        );
      })()}

      {/* Step: Confirm extracted data (URL path) */}
      {step === 'confirm' && (
        <div style={styles.stepContainer}>
          <button onClick={onBack} style={styles.backBtn}>&larr; Back</button>
          <p style={styles.prompt}>
            Here&apos;s what I found — review and edit if needed
          </p>

          <div style={styles.confirmFields}>
            <div style={styles.field}>
              <label style={styles.label}>Company</label>
              <input
                type="text"
                value={data.companyName}
                onChange={(e) => onDataChange('companyName', e.target.value)}
                placeholder="Company name"
                style={styles.input}
                autoFocus
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Role <span style={styles.optionalTag}>(optional)</span>
              </label>
              <input
                type="text"
                value={data.roleLabel}
                onChange={(e) => onDataChange('roleLabel', e.target.value)}
                placeholder="e.g. Implementation Lead"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Job Description</label>
              <textarea
                value={data.jobDescription}
                onChange={(e) => onDataChange('jobDescription', e.target.value)}
                placeholder="Job description"
                style={styles.textarea}
                rows={14}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={onStartTailoring}
            disabled={!data.companyName.trim() || !data.jobDescription.trim()}
            style={{
              ...styles.startBtn,
              opacity: (!data.companyName.trim() || !data.jobDescription.trim()) ? 0.4 : 1,
            }}
          >
            Start Tailoring
          </button>
          {modelPicker}

          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    background: 'var(--bg2)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '2rem 1.5rem',
    boxShadow: 'var(--shadow)',
  },
  stepContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  prompt: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.15rem',
    fontWeight: 300,
    color: 'var(--text)',
    margin: 0,
  },
  optionalTag: {
    fontSize: '0.8rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-body)',
  },
  requiredTag: {
    fontSize: '0.8rem',
    color: 'var(--amber)',
    fontFamily: 'var(--font-body)',
  },
  companyHighlight: {
    color: 'var(--teal)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.78rem',
    color: 'var(--text2)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.03em',
  },
  input: {
    padding: '0.7rem 1rem',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.95rem',
    outline: 'none',
    fontFamily: 'var(--font-body)',
  },
  textarea: {
    padding: '0.75rem 1rem',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: '0.85rem',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.6,
    resize: 'vertical' as const,
  },
  hint: {
    fontSize: '0.72rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
  },
  confirmFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  nextBtn: {
    padding: '0.6rem 1.5rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: 999,
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    alignSelf: 'flex-start',
    transition: 'opacity 0.2s',
  },
  startBtn: {
    padding: '0.7rem 1.5rem',
    background: 'var(--teal)',
    color: 'var(--bg)',
    border: 'none',
    borderRadius: 999,
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    alignSelf: 'flex-start',
    transition: 'opacity 0.2s',
  },
  backBtn: {
    padding: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text3)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    alignSelf: 'flex-start',
    marginBottom: '-0.25rem',
  },
  manualLink: {
    padding: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text3)',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    alignSelf: 'flex-start',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    marginTop: '0.25rem',
  },
  btnRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  scrapeStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.78rem',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
  },
  scrapeSpinner: {
    display: 'inline-block',
    width: 12,
    height: 12,
    border: '2px solid var(--border)',
    borderTopColor: 'var(--accent)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  scrapeErrorText: {
    fontSize: '0.72rem',
    color: 'var(--danger)',
    fontFamily: 'var(--font-mono)',
  },
  sourceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  sourceItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.15rem',
    padding: '0.7rem 1rem',
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s, background 0.15s',
  },
  sourceItemActive: {
    borderColor: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
  },
  sourceLabel: {
    fontSize: '0.9rem',
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
  },
  sourceHint: {
    fontSize: '0.68rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
  },
};
