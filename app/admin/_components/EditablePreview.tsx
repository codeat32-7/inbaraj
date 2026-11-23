'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { sanitizeInlineHtml } from '@/lib/sanitize';

// --- Types ---

interface EditablePreviewProps {
  overrides: Record<string, unknown>;
  base: Record<string, unknown> | null;
  password: string;
  onOverridesChange: (overrides: Record<string, unknown>) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

interface EditingState {
  path: string;
  value: string;
  originalValue: string;
}

interface AiAssistState {
  path: string;
  currentValue: string;
  fieldLabel: string;
  instruction: string;
  loading: boolean;
  suggestion: string | null;
  error: string | null;
}

// --- Utility: deep set on override objects ---

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  if (keys.length === 0) return obj;

  const result = { ...obj };
  let current: Record<string, unknown> = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const child = current[key];
    if (Array.isArray(child)) {
      current[key] = [...child];
    } else if (child && typeof child === 'object') {
      current[key] = { ...child as Record<string, unknown> };
    } else {
      // Create intermediate object or array based on next key
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
  return result;
}

// --- Sub-components ---

function EditableField({
  path,
  value,
  displayStyle,
  isHtml,
  editing,
  onStartEdit,
  onStartAiAssist,
  fieldLabel,
}: {
  path: string;
  value: string;
  displayStyle: React.CSSProperties;
  isHtml?: boolean;
  editing: EditingState | null;
  onStartEdit: (path: string, value: string) => void;
  onStartAiAssist: (path: string, value: string, label: string) => void;
  fieldLabel: string;
}) {
  const isEditing = editing?.path === path;
  const ref = useRef<HTMLDivElement>(null);

  if (isEditing) return null; // Parent renders the editor inline

  return (
    <div
      ref={ref}
      onClick={() => onStartEdit(path, value)}
      style={{
        ...displayStyle,
        cursor: 'pointer',
        borderRadius: 4,
        transition: 'background 0.15s, outline 0.15s',
        outline: '1px solid transparent',
        padding: displayStyle.padding || '2px 4px',
        margin: displayStyle.margin ? undefined : '-2px -4px',
        position: 'relative' as const,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.outline = '1px solid color-mix(in srgb, var(--accent) 35%, transparent)';
        e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 5%, transparent)';
        const icon = e.currentTarget.querySelector('[data-ai-icon]') as HTMLElement;
        if (icon) icon.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.outline = '1px solid transparent';
        e.currentTarget.style.background = 'transparent';
        const icon = e.currentTarget.querySelector('[data-ai-icon]') as HTMLElement;
        if (icon) icon.style.opacity = '0';
      }}
      title="Click to edit"
    >
      {isHtml ? (
        <span dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(value) }} />
      ) : (
        value
      )}
      <span
        data-ai-icon
        onClick={(e) => {
          e.stopPropagation();
          onStartAiAssist(path, value, fieldLabel);
        }}
        style={fieldStyles.aiIcon}
        title="AI assist"
      >
        ✦
      </span>
    </div>
  );
}

function InlineEditor({
  editing,
  onSave,
  onCancel,
  onAiAssist,
}: {
  editing: EditingState;
  onSave: (path: string, value: string) => void;
  onCancel: () => void;
  onAiAssist: () => void;
}) {
  const [value, setValue] = useState(editing.value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      // Auto-resize
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, []);

  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const hasChanged = value !== editing.originalValue;

  return (
    <div style={fieldStyles.editorWrap}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => { setValue(e.target.value); handleInput(); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (hasChanged) onSave(editing.path, value);
          }
        }}
        style={fieldStyles.textarea}
        rows={1}
      />
      <div style={fieldStyles.editorActions}>
        <button
          onClick={() => hasChanged && onSave(editing.path, value)}
          disabled={!hasChanged}
          style={hasChanged ? fieldStyles.saveBtn : fieldStyles.saveBtnDisabled}
        >
          Save
        </button>
        <button onClick={onCancel} style={fieldStyles.cancelBtn}>
          Cancel
        </button>
        <button onClick={onAiAssist} style={fieldStyles.aiBtn}>
          ✦ AI Assist
        </button>
        <span style={fieldStyles.hint}>⌘+Enter to save · Esc to cancel</span>
      </div>
    </div>
  );
}

function AiAssistPanel({
  state,
  onInstructionChange,
  onSubmit,
  onAccept,
  onReject,
  onCancel,
}: {
  state: AiAssistState;
  onInstructionChange: (val: string) => void;
  onSubmit: () => void;
  onAccept: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current && !state.suggestion) {
      inputRef.current.focus();
    }
  }, [state.suggestion]);

  return (
    <div style={fieldStyles.aiPanel}>
      <div style={fieldStyles.aiPanelHeader}>
        <span style={fieldStyles.aiPanelTitle}>✦ AI Assist</span>
        <span style={fieldStyles.aiPanelLabel}>{state.fieldLabel}</span>
      </div>

      <div style={fieldStyles.aiPanelBody}>
        <div style={fieldStyles.aiCurrentLabel}>Current text:</div>
        <div style={fieldStyles.aiCurrentText}>{state.currentValue}</div>

        {!state.suggestion && (
          <>
            <textarea
              ref={inputRef}
              value={state.instruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              placeholder="Describe what you'd like changed... (e.g., 'make this more quantitative' or 'emphasize leadership')"
              style={fieldStyles.aiInput}
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && state.instruction.trim()) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            <div style={fieldStyles.aiActions}>
              <button
                onClick={onSubmit}
                disabled={!state.instruction.trim() || state.loading}
                style={state.instruction.trim() && !state.loading ? fieldStyles.aiSubmitBtn : fieldStyles.aiSubmitBtnDisabled}
              >
                {state.loading ? 'Thinking...' : 'Get suggestion'}
              </button>
              <button onClick={onCancel} style={fieldStyles.cancelBtn}>Cancel</button>
            </div>
          </>
        )}

        {state.error && (
          <div style={fieldStyles.aiError}>{state.error}</div>
        )}

        {state.suggestion && (
          <>
            <div style={fieldStyles.aiSuggestionLabel}>Suggested edit:</div>
            <div style={fieldStyles.aiSuggestionText}>{state.suggestion}</div>
            <div style={fieldStyles.aiActions}>
              <button onClick={onAccept} style={fieldStyles.saveBtn}>Accept</button>
              <button onClick={onReject} style={fieldStyles.aiRetryBtn}>Try again</button>
              <button onClick={onCancel} style={fieldStyles.cancelBtn}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Main component ---

export default function EditablePreview({
  overrides,
  base,
  password,
  onOverridesChange,
  onDirtyChange,
}: EditablePreviewProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [aiAssist, setAiAssist] = useState<AiAssistState | null>(null);
  const [editCount, setEditCount] = useState(0);

  // Extract sections from overrides (same as GeneratedPreview)
  const hero = overrides.hero as { headline?: string; description?: string } | undefined;
  const experience = overrides.experience as Array<{
    title?: string;
    company?: string;
    period?: string;
    bullets?: string[];
    highlights?: Array<{ label?: string; text?: string }>;
  }> | undefined;
  const skills = overrides.skills as Array<{ title?: string; items?: string[] }> | undefined;
  const summary = overrides.summary as string | undefined;
  const customSections = overrides.customSections as Array<{
    id?: string;
    title?: string;
    items?: string[];
  }> | undefined;

  // Get base sections for fallback display
  const baseHero = base?.hero as { headline?: string; description?: string } | undefined;
  const baseExperience = base?.experience as Array<{
    title?: string;
    company?: string;
    period?: string;
    bullets?: string[];
    highlights?: Array<{ label?: string; text?: string }>;
  }> | undefined;
  const baseSummary = base?.summary as string | undefined;

  const handleStartEdit = useCallback((path: string, value: string) => {
    if (aiAssist) return; // Don't open editor while AI assist is open
    setEditing({ path, value, originalValue: value });
  }, [aiAssist]);

  const handleSave = useCallback((path: string, value: string) => {
    const newOverrides = deepSet(overrides, path, value);
    onOverridesChange(newOverrides);
    setEditing(null);
    setEditCount(c => c + 1);
    onDirtyChange?.(true);
  }, [overrides, onOverridesChange, onDirtyChange]);

  const handleCancelEdit = useCallback(() => {
    setEditing(null);
  }, []);

  const handleStartAiAssist = useCallback((path: string, value: string, label: string) => {
    setEditing(null);
    setAiAssist({
      path,
      currentValue: value,
      fieldLabel: label,
      instruction: '',
      loading: false,
      suggestion: null,
      error: null,
    });
  }, []);

  const handleAiSubmit = useCallback(async () => {
    if (!aiAssist || !aiAssist.instruction.trim()) return;
    setAiAssist(prev => prev ? { ...prev, loading: true, error: null, suggestion: null } : null);

    try {
      const res = await fetch('/api/ai-edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          currentText: aiAssist.currentValue,
          instruction: aiAssist.instruction,
          fieldLabel: aiAssist.fieldLabel,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'AI edit failed');
      }

      const data = await res.json();
      setAiAssist(prev => prev ? { ...prev, loading: false, suggestion: data.editedText } : null);
    } catch (error) {
      setAiAssist(prev => prev ? {
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Something went wrong. Try again?',
      } : null);
    }
  }, [aiAssist, password]);

  const handleAiAccept = useCallback(() => {
    if (!aiAssist?.suggestion) return;
    const newOverrides = deepSet(overrides, aiAssist.path, aiAssist.suggestion);
    onOverridesChange(newOverrides);
    setAiAssist(null);
    setEditCount(c => c + 1);
    onDirtyChange?.(true);
  }, [aiAssist, overrides, onOverridesChange, onDirtyChange]);

  const handleAiReject = useCallback(() => {
    setAiAssist(prev => prev ? { ...prev, suggestion: null, error: null } : null);
  }, []);

  const handleAiCancel = useCallback(() => {
    setAiAssist(null);
  }, []);

  // Determine what experience to show: overrides take precedence, else base
  const displayExperience = experience || baseExperience;
  const displaySummary = summary !== undefined ? summary : baseSummary;

  const renderField = (
    path: string,
    value: string | undefined,
    style: React.CSSProperties,
    label: string,
    isHtml?: boolean,
  ) => {
    if (!value) return null;
    const isCurrentlyEditing = editing?.path === path;

    return (
      <>
        {!isCurrentlyEditing && (
          <EditableField
            path={path}
            value={value}
            displayStyle={style}
            isHtml={isHtml}
            editing={editing}
            onStartEdit={handleStartEdit}
            onStartAiAssist={handleStartAiAssist}
            fieldLabel={label}
          />
        )}
        {isCurrentlyEditing && editing && (
          <InlineEditor
            editing={editing}
            onSave={handleSave}
            onCancel={handleCancelEdit}
            onAiAssist={() => handleStartAiAssist(editing.path, editing.value, label)}
          />
        )}
      </>
    );
  };

  return (
    <div>
      {/* Edit count indicator */}
      {editCount > 0 && (
        <div style={previewStyles.editBanner}>
          <span style={previewStyles.editBannerDot} />
          <span style={previewStyles.editBannerText}>
            {editCount} edit{editCount !== 1 ? 's' : ''} made
          </span>
        </div>
      )}

      {/* AI Assist panel (overlay) */}
      {aiAssist && (
        <AiAssistPanel
          state={aiAssist}
          onInstructionChange={(val) => setAiAssist(prev => prev ? { ...prev, instruction: val } : null)}
          onSubmit={handleAiSubmit}
          onAccept={handleAiAccept}
          onReject={handleAiReject}
          onCancel={handleAiCancel}
        />
      )}

      <div style={previewStyles.editHint}>
        Click any text to edit · ✦ for AI assist
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Hero */}
        {(hero || baseHero) && (
          <div style={previewStyles.card}>
            <div style={previewStyles.sectionLabel}>Hero</div>
            {renderField(
              'hero.headline',
              hero?.headline || baseHero?.headline,
              previewStyles.headline,
              'Hero headline',
              true,
            )}
            {renderField(
              'hero.description',
              hero?.description || baseHero?.description,
              previewStyles.text,
              'Hero description',
            )}
          </div>
        )}

        {/* Summary */}
        {displaySummary && (
          <div style={previewStyles.card}>
            <div style={previewStyles.sectionLabel}>Summary</div>
            {renderField(
              'summary',
              displaySummary,
              previewStyles.text,
              'Professional summary',
            )}
          </div>
        )}

        {/* Experience */}
        {displayExperience && Array.isArray(displayExperience) && (
          <div style={previewStyles.card}>
            <div style={previewStyles.sectionLabel}>Experience</div>
            {displayExperience.map((exp, i) => (
              <div key={i} style={i > 0 ? { marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' } : {}}>
                <div style={previewStyles.expTitle}>
                  {renderField(
                    `experience.${i}.title`,
                    exp.title,
                    { ...previewStyles.expTitleInline, display: 'inline' },
                    `Job title at ${exp.company || 'company'}`,
                  )}
                  {exp.company && <span style={previewStyles.expCompany}> · {exp.company}</span>}
                </div>
                {exp.bullets && (
                  <ul style={previewStyles.bulletList}>
                    {exp.bullets.map((b, j) => (
                      <li key={j} style={previewStyles.bullet}>
                        {renderField(
                          `experience.${i}.bullets.${j}`,
                          b,
                          previewStyles.bulletText,
                          `Experience bullet for ${exp.company || 'company'}`,
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {exp.highlights.map((h, k) => (
                      <div key={k} style={previewStyles.highlight}>
                        {renderField(
                          `experience.${i}.highlights.${k}.label`,
                          h.label,
                          previewStyles.highlightLabel,
                          `Highlight label at ${exp.company || 'company'}`,
                        )}
                        {renderField(
                          `experience.${i}.highlights.${k}.text`,
                          h.text,
                          previewStyles.highlightText,
                          `Highlight text at ${exp.company || 'company'}`,
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {skills && Array.isArray(skills) && (
          <div style={previewStyles.card}>
            <div style={previewStyles.sectionLabel}>Skills</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {skills.map((group, i) => (
                <div key={i}>
                  {renderField(
                    `skills.${i}.title`,
                    group.title,
                    previewStyles.skillGroupTitle,
                    'Skill group title',
                  )}
                  {group.items && group.items.map((item, j) => (
                    <div key={j}>
                      {renderField(
                        `skills.${i}.items.${j}`,
                        item,
                        previewStyles.skillItem,
                        `Skill in ${group.title || 'group'}`,
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Sections */}
        {customSections && customSections.length > 0 && (
          <div style={previewStyles.card}>
            <div style={previewStyles.sectionLabel}>Custom Sections</div>
            {customSections.map((section, i) => (
              <div key={i} style={i > 0 ? { marginTop: '0.75rem' } : {}}>
                {renderField(
                  `customSections.${i}.title`,
                  section.title,
                  previewStyles.skillGroupTitle,
                  'Custom section title',
                )}
                {section.items && section.items.map((item, j) => (
                  <div key={j}>
                    {renderField(
                      `customSections.${i}.items.${j}`,
                      item,
                      previewStyles.skillItem,
                      `Item in ${section.title || 'custom section'}`,
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Hidden sections indicator */}
        {overrides.projects === false && (
          <div style={{ ...previewStyles.card, borderColor: 'var(--border2)' }}>
            <div style={previewStyles.sectionLabel}>Projects</div>
            <p style={{ ...previewStyles.text, fontStyle: 'italic' }}>Hidden for this profile</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Styles ---

const fieldStyles: Record<string, React.CSSProperties> = {
  aiIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
    fontSize: '0.6rem',
    color: 'var(--accent)',
    opacity: 0,
    cursor: 'pointer',
    background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
    borderRadius: 3,
    padding: '1px 4px',
    transition: 'opacity 0.15s',
    pointerEvents: 'auto',
  },
  editorWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  textarea: {
    width: '100%',
    fontSize: '0.84rem',
    color: 'var(--text)',
    background: 'var(--bg2)',
    border: '1px solid var(--accent)',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.6,
    resize: 'vertical',
    outline: 'none',
    minHeight: 40,
    boxSizing: 'border-box',
  },
  editorActions: {
    display: 'flex',
    gap: '0.35rem',
    alignItems: 'center',
  },
  saveBtn: {
    fontSize: '0.7rem',
    color: 'var(--bg)',
    background: 'var(--teal)',
    border: 'none',
    borderRadius: 6,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
  },
  saveBtnDisabled: {
    fontSize: '0.7rem',
    color: 'var(--text3)',
    background: 'var(--border)',
    border: 'none',
    borderRadius: 6,
    padding: '0.3rem 0.7rem',
    cursor: 'not-allowed',
    fontFamily: 'var(--font-mono)',
  },
  cancelBtn: {
    fontSize: '0.7rem',
    color: 'var(--text2)',
    background: 'transparent',
    border: '1px solid var(--border2)',
    borderRadius: 6,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  aiBtn: {
    fontSize: '0.7rem',
    color: 'var(--accent)',
    background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
    borderRadius: 6,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  hint: {
    fontSize: '0.62rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    marginLeft: 'auto',
  },
  // AI Assist Panel
  aiPanel: {
    background: 'var(--bg2)',
    border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
    borderRadius: 10,
    marginBottom: '1rem',
    overflow: 'hidden',
  },
  aiPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    borderBottom: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
  },
  aiPanelTitle: {
    fontSize: '0.78rem',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
  },
  aiPanelLabel: {
    fontSize: '0.68rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
  },
  aiPanelBody: {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  aiCurrentLabel: {
    fontSize: '0.66rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  aiCurrentText: {
    fontSize: '0.8rem',
    color: 'var(--text2)',
    lineHeight: 1.5,
    padding: '0.5rem 0.75rem',
    background: 'color-mix(in srgb, var(--text) 12%, transparent)',
    borderRadius: 6,
    border: '1px solid var(--border)',
  },
  aiInput: {
    width: '100%',
    fontSize: '0.84rem',
    color: 'var(--text)',
    background: 'var(--bg3)',
    border: '1px solid var(--border2)',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    fontFamily: 'var(--font-body)',
    lineHeight: 1.5,
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  aiActions: {
    display: 'flex',
    gap: '0.35rem',
    alignItems: 'center',
  },
  aiSubmitBtn: {
    fontSize: '0.7rem',
    color: 'var(--bg)',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 6,
    padding: '0.3rem 0.85rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontWeight: 500,
  },
  aiSubmitBtnDisabled: {
    fontSize: '0.7rem',
    color: 'var(--text3)',
    background: 'var(--border)',
    border: 'none',
    borderRadius: 6,
    padding: '0.3rem 0.85rem',
    cursor: 'not-allowed',
    fontFamily: 'var(--font-mono)',
  },
  aiRetryBtn: {
    fontSize: '0.7rem',
    color: 'var(--amber)',
    background: 'color-mix(in srgb, var(--amber) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--amber) 30%, transparent)',
    borderRadius: 6,
    padding: '0.3rem 0.7rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
  },
  aiSuggestionLabel: {
    fontSize: '0.66rem',
    color: 'var(--teal)',
    fontFamily: 'var(--font-mono)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  aiSuggestionText: {
    fontSize: '0.8rem',
    color: 'var(--text)',
    lineHeight: 1.5,
    padding: '0.5rem 0.75rem',
    background: 'color-mix(in srgb, var(--teal) 6%, transparent)',
    borderRadius: 6,
    border: '1px solid color-mix(in srgb, var(--teal) 20%, transparent)',
  },
  aiError: {
    fontSize: '0.78rem',
    color: 'var(--danger)',
    padding: '0.4rem 0.6rem',
    background: 'color-mix(in srgb, var(--danger) 8%, transparent)',
    borderRadius: 4,
  },
};

const previewStyles: Record<string, React.CSSProperties> = {
  editBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginBottom: '0.75rem',
    padding: '0.4rem 0.75rem',
    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
    borderRadius: 6,
  },
  editBannerDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--accent)',
  },
  editBannerText: {
    fontSize: '0.72rem',
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
  },
  editHint: {
    fontSize: '0.68rem',
    color: 'var(--text3)',
    fontFamily: 'var(--font-mono)',
    marginBottom: '0.75rem',
    textAlign: 'center' as const,
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
    marginBottom: '0.4rem',
  },
  expTitleInline: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem',
    fontWeight: 300,
    color: 'var(--text)',
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
    paddingLeft: '1rem',
    position: 'relative' as const,
  },
  bulletText: {
    fontSize: '0.82rem',
    color: 'var(--text2)',
    lineHeight: 1.6,
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
