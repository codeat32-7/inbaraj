'use client';

import { useState, useEffect } from 'react';
import DiffView from './DiffView';
import { sanitizeInlineHtml } from '@/lib/sanitize';

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

type ViolationDecision = {
  action: 'keep' | 'remove';
  reason?: string;
};

interface GeneratedPreviewProps {
  overrides: Record<string, unknown>;
  validation?: ValidationResult;
  password: string;
  onViolationDecision?: (index: number, decision: ViolationDecision) => void;
  violationDecisions?: Record<number, ViolationDecision>;
}

type ViewMode = 'formatted' | 'diff' | 'json';

export default function GeneratedPreview({
  overrides,
  validation,
  password,
  onViolationDecision,
  violationDecisions = {},
}: GeneratedPreviewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('formatted');
  const [base, setBase] = useState<Record<string, unknown> | null>(null);
  const [showViolations, setShowViolations] = useState(true);
  const [reasonInputIndex, setReasonInputIndex] = useState<number | null>(null);
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/base', {
          headers: { 'x-admin-password': password },
        });
        if (res.ok) {
          setBase(await res.json());
        }
      } catch { /* base load failed, diff view won't be available */ }
    })();
  }, [password]);

  const hero = overrides.hero as { headline?: string; description?: string } | undefined;
  const experience = overrides.experience as Array<{
    title?: string;
    company?: string;
    bullets?: string[];
    highlights?: Array<{ label?: string; text?: string }>;
  }> | undefined;
  const skills = overrides.skills as Array<{ title?: string; items?: string[] }> | undefined;
  const summary = overrides.summary as string | undefined;
  const customSections = overrides.customSections as Array<{
    title?: string;
    items?: string[];
  }> | undefined;

  const unresolvedCount = validation
    ? validation.violations.filter((_, i) => !violationDecisions[i]).length
    : 0;

  const friendlyIssueType = (issue: string): string => {
    const map: Record<string, string> = {
      'UNSUPPORTED_CLAIM': 'May not match your experience',
      'FABRICATED_METRIC': 'Metric not in your resume',
      'FABRICATED_SKILL': 'Skill not in your resume',
      'FABRICATED_EXPERIENCE': 'Experience not in your resume',
      'INVENTED_DETAIL': 'Detail not in your resume',
    };
    return map[issue] || issue.replace(/_/g, ' ').toLowerCase();
  };

  const handleKeep = (index: number) => {
    if (reasonInputIndex === index) {
      // Submit the keep with reason
      onViolationDecision?.(index, { action: 'keep', reason: reasonText || undefined });
      setReasonInputIndex(null);
      setReasonText('');
    } else {
      // Show reason input
      setReasonInputIndex(index);
      setReasonText('');
    }
  };

  const handleRemove = (index: number) => {
    onViolationDecision?.(index, { action: 'remove' });
    if (reasonInputIndex === index) {
      setReasonInputIndex(null);
      setReasonText('');
    }
  };

  const handleCancelReason = () => {
    setReasonInputIndex(null);
    setReasonText('');
  };

  return (
    <div>
      {/* Validation banner */}
      {validation && (
        <div
          style={{
            ...styles.validationBanner,
            background: validation.valid
              ? 'color-mix(in srgb, var(--teal) 8%, transparent)'
              : unresolvedCount === 0
                ? 'color-mix(in srgb, var(--teal) 8%, transparent)'
                : 'color-mix(in srgb, var(--amber) 8%, transparent)',
            borderColor: validation.valid
              ? 'color-mix(in srgb, var(--teal) 30%, transparent)'
              : unresolvedCount === 0
                ? 'color-mix(in srgb, var(--teal) 30%, transparent)'
                : 'color-mix(in srgb, var(--amber) 30%, transparent)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: validation.valid || unresolvedCount === 0 ? 'var(--teal)' : 'var(--amber)',
                }}
              />
              <span style={{ color: validation.valid || unresolvedCount === 0 ? 'var(--teal)' : 'var(--amber)', fontSize: '0.8rem' }}>
                {validation.valid
                  ? 'Everything looks accurate!'
                  : unresolvedCount === 0
                    ? `All items reviewed — ready to publish!`
                    : `I found ${unresolvedCount} thing${unresolvedCount !== 1 ? 's' : ''} that might need a closer look`}
              </span>
            </div>
            {!validation.valid && validation.violations.length > 0 && (
              <button
                onClick={() => setShowViolations(!showViolations)}
                style={styles.toggleViolationsBtn}
              >
                {showViolations ? 'Hide details' : 'Show details'}
              </button>
            )}
          </div>
          {showViolations && validation.violations.length > 0 && (
            <div style={styles.violationsList}>
              {validation.violations.map((v, i) => {
                const decision = violationDecisions[i];
                const isResolved = !!decision;
                return (
                  <div
                    key={i}
                    style={{
                      ...styles.violationItem,
                      ...(isResolved ? { opacity: 0.5 } : {}),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={styles.violationHeader}>
                          <span style={styles.violationSection}>{v.section}</span>
                          <span style={styles.violationIssue}>{friendlyIssueType(v.issue)}</span>
                          {isResolved && (
                            <span style={{
                              fontSize: '0.62rem',
                              color: decision.action === 'keep' ? 'var(--teal)' : 'var(--danger)',
                              textTransform: 'uppercase' as const,
                              letterSpacing: '0.08em',
                              fontFamily: 'var(--font-mono)',
                              background: decision.action === 'keep' ? 'color-mix(in srgb, var(--teal) 15%, transparent)' : 'color-mix(in srgb, var(--danger) 15%, transparent)',
                              padding: '1px 6px',
                              borderRadius: 3,
                            }}>
                              {decision.action === 'keep' ? 'kept' : 'removed'}
                            </span>
                          )}
                        </div>
                        <div style={styles.violationGenerated}>&ldquo;{v.generated}&rdquo;</div>
                        <div style={styles.violationSuggestion}>{v.suggestion}</div>
                        {isResolved && decision.reason && (
                          <div style={styles.violationReason}>Reason: {decision.reason}</div>
                        )}
                      </div>
                      {!isResolved && (
                        <div style={styles.violationActions}>
                          <button onClick={() => handleKeep(i)} style={styles.keepBtn}>
                            It&apos;s correct
                          </button>
                          <button onClick={() => handleRemove(i)} style={styles.removeBtn}>
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                    {/* Reason input for Keep */}
                    {reasonInputIndex === i && (
                      <div style={styles.reasonInputWrap}>
                        <input
                          type="text"
                          value={reasonText}
                          onChange={(e) => setReasonText(e.target.value)}
                          placeholder="Why is this correct? (optional — helps me learn)"
                          style={styles.reasonInput}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleKeep(i);
                            if (e.key === 'Escape') handleCancelReason();
                          }}
                        />
                        <button onClick={() => handleKeep(i)} style={styles.reasonSubmitBtn}>
                          Confirm
                        </button>
                        <button onClick={handleCancelReason} style={styles.reasonCancelBtn}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View mode toggles */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem', gap: '0.25rem' }}>
        <button
          onClick={() => setViewMode('formatted')}
          style={viewMode === 'formatted' ? styles.toggleBtnActive : styles.toggleBtn}
        >
          Formatted
        </button>
        <button
          onClick={() => setViewMode('diff')}
          disabled={!base}
          style={viewMode === 'diff' ? styles.toggleBtnActive : styles.toggleBtn}
        >
          Compare Changes
        </button>
        <button
          onClick={() => setViewMode('json')}
          style={viewMode === 'json' ? styles.toggleBtnActive : styles.toggleBtn}
        >
          Raw Data
        </button>
      </div>

      {/* Diff view */}
      {viewMode === 'diff' && base && (
        <DiffView base={base} overrides={overrides} />
      )}

      {/* Raw JSON */}
      {viewMode === 'json' && (
        <pre style={styles.json}>{JSON.stringify(overrides, null, 2)}</pre>
      )}

      {/* Formatted view */}
      {viewMode === 'formatted' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {hero && (
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Hero</div>
              {hero.headline && (
                <div
                  style={styles.headline}
                  dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(hero.headline) }}
                />
              )}
              {hero.description && (
                <p style={styles.text}>{hero.description}</p>
              )}
            </div>
          )}

          {summary && (
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Summary</div>
              <p style={styles.text}>{summary}</p>
            </div>
          )}

          {experience && Array.isArray(experience) && (
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Experience</div>
              {experience.map((exp, i) => (
                <div key={i} style={i > 0 ? { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' } : {}}>
                  <div style={styles.expTitle}>
                    {exp.title} {exp.company && <span style={styles.expCompany}>· {exp.company}</span>}
                  </div>
                  {exp.bullets && (
                    <ul style={styles.bulletList}>
                      {exp.bullets.map((b, j) => (
                        <li key={j} style={styles.bullet}>{b}</li>
                      ))}
                    </ul>
                  )}
                  {exp.highlights && exp.highlights.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      {exp.highlights.map((h, k) => (
                        <div key={k} style={styles.highlight}>
                          <div style={styles.highlightLabel}>{h.label}</div>
                          <p style={styles.highlightText}>{h.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {skills && Array.isArray(skills) && (
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Skills</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
                {skills.map((group, i) => (
                  <div key={i}>
                    <div style={styles.skillGroupTitle}>{group.title}</div>
                    {group.items && group.items.map((item, j) => (
                      <div key={j} style={styles.skillItem}>· {item}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {customSections && customSections.length > 0 && (
            <div style={styles.card}>
              <div style={styles.sectionLabel}>Custom Sections</div>
              {customSections.map((section, i) => (
                <div key={i} style={i > 0 ? { marginTop: '0.75rem' } : {}}>
                  <div style={styles.skillGroupTitle}>{section.title}</div>
                  {section.items && section.items.map((item, j) => (
                    <div key={j} style={styles.skillItem}>· {item}</div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {overrides.projects === false && (
            <div style={{ ...styles.card, borderColor: 'var(--border2)' }}>
              <div style={styles.sectionLabel}>Projects</div>
              <p style={{ ...styles.text, fontStyle: 'italic' }}>Hidden for this profile</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  validationBanner: {
    padding: '0.75rem 1rem',
    borderRadius: 8,
    border: '1px solid',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-mono)',
  },
  toggleViolationsBtn: {
    fontSize: '0.68rem',
    color: 'var(--amber)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    textDecoration: 'underline',
  },
  violationsList: {
    marginTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  violationItem: {
    background: 'color-mix(in srgb, var(--text) 12%, transparent)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
  },
  violationHeader: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.25rem',
  },
  violationSection: {
    fontSize: '0.64rem',
    color: 'var(--accent)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  violationIssue: {
    fontSize: '0.68rem',
    color: 'var(--amber)',
    fontStyle: 'italic',
  },
  violationGenerated: {
    fontSize: '0.78rem',
    color: 'var(--danger)',
    fontStyle: 'italic',
    marginBottom: '0.2rem',
  },
  violationSuggestion: {
    fontSize: '0.74rem',
    color: 'var(--text2)',
  },
  violationReason: {
    fontSize: '0.7rem',
    color: 'var(--text3)',
    fontStyle: 'italic',
    marginTop: '0.25rem',
  },
  violationActions: {
    display: 'flex',
    gap: '0.35rem',
    marginLeft: '0.75rem',
    flexShrink: 0,
  },
  keepBtn: {
    fontSize: '0.68rem',
    color: 'var(--teal)',
    background: 'color-mix(in srgb, var(--teal) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--teal) 30%, transparent)',
    borderRadius: 999,
    padding: '0.25rem 0.6rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  removeBtn: {
    fontSize: '0.68rem',
    color: 'var(--danger)',
    background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
    borderRadius: 999,
    padding: '0.25rem 0.6rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  reasonInputWrap: {
    display: 'flex',
    gap: '0.35rem',
    marginTop: '0.5rem',
    alignItems: 'center',
  },
  reasonInput: {
    flex: 1,
    fontSize: '0.74rem',
    color: 'var(--text)',
    background: 'var(--bg2)',
    border: '1px solid var(--border2)',
    borderRadius: 4,
    padding: '0.3rem 0.6rem',
    fontFamily: 'var(--font-mono)',
    outline: 'none',
  },
  reasonSubmitBtn: {
    fontSize: '0.66rem',
    color: 'var(--teal)',
    background: 'transparent',
    border: '1px solid color-mix(in srgb, var(--teal) 30%, transparent)',
    borderRadius: 999,
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  reasonCancelBtn: {
    fontSize: '0.66rem',
    color: 'var(--text3)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 999,
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  toggleBtn: {
    fontSize: '0.7rem',
    color: 'var(--text3)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 999,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  toggleBtnActive: {
    fontSize: '0.7rem',
    color: 'var(--text)',
    background: 'var(--border)',
    border: '1px solid var(--border2)',
    borderRadius: 999,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  json: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '1rem',
    fontSize: '0.75rem',
    color: 'var(--text2)',
    fontFamily: 'var(--font-mono)',
    overflow: 'auto',
    maxHeight: 400,
    lineHeight: 1.5,
  },
  card: {
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    padding: '1rem',
    boxShadow: 'var(--shadow)',
  },
  sectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    color: 'var(--teal)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.6rem',
  },
  headline: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: 300,
    color: 'var(--text)',
    marginBottom: '0.4rem',
  },
  text: {
    fontSize: '0.84rem',
    color: 'var(--text2)',
    lineHeight: 1.65,
  },
  expTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 300,
    color: 'var(--text)',
    marginBottom: '0.4rem',
  },
  expCompany: {
    fontSize: '0.85rem',
    color: 'var(--accent)',
  },
  bulletList: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.3rem',
  },
  bullet: {
    fontSize: '0.82rem',
    color: 'var(--text2)',
    lineHeight: 1.6,
    paddingLeft: '1rem',
    position: 'relative' as const,
  },
  highlight: {
    flex: '1 1 calc(50% - 0.25rem)',
    background: 'color-mix(in srgb, var(--accent) 6%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
  },
  highlightLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.64rem',
    color: 'var(--accent)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.25rem',
  },
  highlightText: {
    fontSize: '0.78rem',
    color: 'var(--text2)',
    lineHeight: 1.5,
  },
  skillGroupTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    color: 'var(--teal)',
    letterSpacing: '0.08em',
    marginBottom: '0.3rem',
  },
  skillItem: {
    fontSize: '0.8rem',
    color: 'var(--text2)',
    lineHeight: 1.5,
  },
};
