'use client';

interface DiffViewProps {
  base: Record<string, unknown>;
  overrides: Record<string, unknown>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={styles.sectionLabel}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={styles.fieldLabel}>{children}</div>;
}

function DiffBlock({ label, oldText, newText }: { label?: string; oldText: string; newText: string }) {
  if (oldText === newText) {
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        {label && <FieldLabel>{label}</FieldLabel>}
        <div style={styles.unchangedBlock}>
          <p style={styles.blockText}>{newText}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div style={styles.diffPair}>
        <div style={styles.oldBlock}>
          <div style={styles.blockLabel}>Original</div>
          <p style={styles.blockText}>{oldText}</p>
        </div>
        <div style={styles.newBlock}>
          <div style={styles.blockLabelNew}>Tailored</div>
          <p style={styles.blockText}>{newText}</p>
        </div>
      </div>
    </div>
  );
}

function DiffCard({ children, borderColor }: { children: React.ReactNode; borderColor?: string }) {
  return (
    <div style={{ ...styles.card, ...(borderColor ? { borderColor } : {}) }}>
      {children}
    </div>
  );
}

export default function DiffView({ base, overrides }: DiffViewProps) {
  const baseHero = base.hero as { headline?: string; description?: string } | undefined;
  const overHero = overrides.hero as { headline?: string; description?: string } | undefined;
  const baseSummary = base.summary as string | undefined;
  const overSummary = overrides.summary as string | undefined;
  const baseExperience = base.experience as Array<{
    title?: string; company?: string; bullets?: string[]; highlights?: Array<{ label?: string; text?: string }>;
  }> | undefined;
  const overExperience = overrides.experience as Array<{
    title?: string; company?: string; bullets?: string[]; highlights?: Array<{ label?: string; text?: string }>;
  }> | undefined;
  const baseSkills = base.skills as Array<{ title?: string; items?: string[] }> | undefined;
  const overSkills = overrides.skills as Array<{ title?: string; items?: string[] }> | undefined;
  const overCustomSections = overrides.customSections as Array<{
    title?: string; items?: string[];
  }> | undefined;

  const hasChanges = Object.keys(overrides).length > 0;

  if (!hasChanges) {
    return (
      <div style={styles.card}>
        <p style={styles.noChanges}>No changes from your original resume.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hero diff */}
      {overHero && (
        <DiffCard>
          <SectionLabel>Hero</SectionLabel>
          {overHero.headline && baseHero?.headline && (
            <DiffBlock
              label="Headline"
              oldText={stripHtml(baseHero.headline)}
              newText={stripHtml(overHero.headline)}
            />
          )}
          {overHero.description && baseHero?.description && (
            <DiffBlock
              label="Description"
              oldText={baseHero.description}
              newText={overHero.description}
            />
          )}
        </DiffCard>
      )}

      {/* Summary diff */}
      {overSummary && baseSummary && (
        <DiffCard>
          <SectionLabel>Summary</SectionLabel>
          <DiffBlock oldText={baseSummary} newText={overSummary} />
        </DiffCard>
      )}

      {/* Experience diff */}
      {overExperience && Array.isArray(overExperience) && baseExperience && Array.isArray(baseExperience) && (
        <DiffCard>
          <SectionLabel>Experience</SectionLabel>
          {overExperience.map((exp, i) => {
            const baseExp = baseExperience[i];
            return (
              <div key={i} style={i > 0 ? { marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' } : {}}>
                <div style={styles.expTitle}>
                  {exp.title} {exp.company && <span style={styles.expCompany}>· {exp.company}</span>}
                </div>
                {/* Bullets */}
                {exp.bullets && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {exp.bullets.map((bullet, j) => {
                      const baseBullet = baseExp?.bullets?.[j] || '';
                      if (!baseBullet) {
                        return (
                          <div key={j} style={styles.newBlock}>
                            <div style={styles.blockLabelNew}>Added</div>
                            <p style={styles.blockText}>{bullet}</p>
                          </div>
                        );
                      }
                      if (baseBullet === bullet) {
                        return (
                          <div key={j} style={styles.unchangedBlock}>
                            <p style={styles.blockText}>{bullet}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={j} style={styles.diffPair}>
                          <div style={styles.oldBlock}>
                            <div style={styles.blockLabel}>Original</div>
                            <p style={styles.blockText}>{baseBullet}</p>
                          </div>
                          <div style={styles.newBlock}>
                            <div style={styles.blockLabelNew}>Tailored</div>
                            <p style={styles.blockText}>{bullet}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Highlights */}
                {exp.highlights && exp.highlights.length > 0 && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <FieldLabel>Highlights</FieldLabel>
                    {exp.highlights.map((h, k) => {
                      const baseHighlight = baseExp?.highlights?.[k];
                      if (!baseHighlight?.text) {
                        return (
                          <div key={k} style={styles.newBlock}>
                            <div style={styles.blockLabelNew}>{h.label || 'Added'}</div>
                            <p style={styles.blockText}>{h.text}</p>
                          </div>
                        );
                      }
                      if (baseHighlight.text === h.text) {
                        return (
                          <div key={k} style={styles.unchangedBlock}>
                            <div style={styles.highlightLabel}>{h.label}</div>
                            <p style={styles.blockText}>{h.text}</p>
                          </div>
                        );
                      }
                      return (
                        <div key={k}>
                          <div style={styles.highlightLabel}>{h.label || baseHighlight.label}</div>
                          <div style={styles.diffPair}>
                            <div style={styles.oldBlock}>
                              <div style={styles.blockLabel}>Original</div>
                              <p style={styles.blockText}>{baseHighlight.text}</p>
                            </div>
                            <div style={styles.newBlock}>
                              <div style={styles.blockLabelNew}>Tailored</div>
                              <p style={styles.blockText}>{h.text}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </DiffCard>
      )}

      {/* Skills diff */}
      {overSkills && Array.isArray(overSkills) && (
        <DiffCard>
          <SectionLabel>Skills</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {overSkills.map((group, i) => {
              const baseGroup = baseSkills?.[i];
              const baseItems = baseGroup?.items || [];
              const newItems = group.items || [];
              const baseSet = new Set(baseItems);
              const titleChanged = baseGroup?.title && baseGroup.title !== group.title;

              return (
                <div key={i} style={styles.skillGroupCard}>
                  {titleChanged ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ ...styles.skillGroupTitle, color: 'var(--danger)', textDecoration: 'line-through' }}>{baseGroup?.title}</span>
                      <span style={styles.arrow}>→</span>
                      <span style={{ ...styles.skillGroupTitle, color: 'var(--teal)' }}>{group.title}</span>
                    </div>
                  ) : (
                    <div style={styles.skillGroupTitle}>{group.title}</div>
                  )}
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.miniLabel}>Original</div>
                      {baseItems.map((item, j) => (
                        <div key={j} style={{
                          ...styles.skillItem,
                          ...(newItems.includes(item) ? {} : { color: 'var(--danger)', textDecoration: 'line-through' }),
                        }}>
                          · {item}
                        </div>
                      ))}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.miniLabelNew}>Tailored</div>
                      {newItems.map((item, j) => (
                        <div key={j} style={{
                          ...styles.skillItem,
                          ...(!baseSet.has(item) ? { color: 'var(--teal)' } : {}),
                        }}>
                          · {item}
                          {!baseSet.has(item) && <span style={styles.newBadge}>added</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DiffCard>
      )}

      {/* Custom Sections (always new) */}
      {overCustomSections && overCustomSections.length > 0 && (
        <DiffCard borderColor="color-mix(in srgb, var(--teal) 30%, transparent)">
          <SectionLabel>New Sections</SectionLabel>
          {overCustomSections.map((section, i) => (
            <div key={i} style={i > 0 ? { marginTop: '0.75rem' } : {}}>
              <div style={styles.skillGroupTitle}>{section.title}</div>
              {section.items?.map((item, j) => (
                <div key={j} style={{ ...styles.skillItem, color: 'var(--teal)' }}>· {item}</div>
              ))}
            </div>
          ))}
        </DiffCard>
      )}

      {/* Hidden sections */}
      {overrides.projects === false && (
        <DiffCard borderColor="color-mix(in srgb, var(--danger) 30%, transparent)">
          <SectionLabel>Projects</SectionLabel>
          <p style={{ ...styles.noChanges, color: 'var(--danger)' }}>This section is hidden for this version</p>
        </DiffCard>
      )}
      {overrides.experience === false && (
        <DiffCard borderColor="color-mix(in srgb, var(--danger) 30%, transparent)">
          <SectionLabel>Experience</SectionLabel>
          <p style={{ ...styles.noChanges, color: 'var(--danger)' }}>This section is hidden for this version</p>
        </DiffCard>
      )}
      {overrides.skills === false && (
        <DiffCard borderColor="color-mix(in srgb, var(--danger) 30%, transparent)">
          <SectionLabel>Skills</SectionLabel>
          <p style={{ ...styles.noChanges, color: 'var(--danger)' }}>This section is hidden for this version</p>
        </DiffCard>
      )}
    </div>
  );
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

const styles: Record<string, React.CSSProperties> = {
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
  fieldLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.64rem',
    color: 'var(--text3)',
    letterSpacing: '0.08em',
    marginBottom: '0.25rem',
  },
  diffPair: {
    display: 'flex',
    gap: '0.5rem',
  },
  oldBlock: {
    flex: 1,
    background: 'color-mix(in srgb, var(--danger) 6%, transparent)',
    border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)',
    borderRadius: 6,
    padding: '0.5rem 0.65rem',
  },
  newBlock: {
    flex: 1,
    background: 'color-mix(in srgb, var(--teal) 6%, transparent)',
    border: '1px solid color-mix(in srgb, var(--teal) 15%, transparent)',
    borderRadius: 6,
    padding: '0.5rem 0.65rem',
  },
  unchangedBlock: {
    background: 'color-mix(in srgb, var(--text) 2%, transparent)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.5rem 0.65rem',
  },
  blockLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.58rem',
    color: 'var(--danger)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.2rem',
    opacity: 0.7,
  },
  blockLabelNew: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.58rem',
    color: 'var(--teal)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.2rem',
    opacity: 0.7,
  },
  blockText: {
    fontSize: '0.8rem',
    color: 'var(--text2)',
    lineHeight: 1.6,
    margin: 0,
  },
  noChanges: {
    fontSize: '0.84rem',
    color: 'var(--text3)',
    fontStyle: 'italic',
  },
  expTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 300,
    color: 'var(--text)',
    marginBottom: '0.5rem',
  },
  expCompany: {
    fontSize: '0.85rem',
    color: 'var(--accent)',
  },
  highlightLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.64rem',
    color: 'var(--accent)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.25rem',
  },
  skillGroupCard: {
    background: 'color-mix(in srgb, var(--text) 2%, transparent)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
  },
  skillGroupTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    color: 'var(--teal)',
    letterSpacing: '0.08em',
    marginBottom: '0.3rem',
  },
  arrow: {
    color: 'var(--text3)',
    fontSize: '0.75rem',
  },
  miniLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.56rem',
    color: 'var(--danger)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.2rem',
    opacity: 0.6,
  },
  miniLabelNew: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.56rem',
    color: 'var(--teal)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    marginBottom: '0.2rem',
    opacity: 0.6,
  },
  skillItem: {
    fontSize: '0.8rem',
    color: 'var(--text2)',
    lineHeight: 1.5,
  },
  newBadge: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.58rem',
    color: 'var(--teal)',
    marginLeft: '0.4rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
};
