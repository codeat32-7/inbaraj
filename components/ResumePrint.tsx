import { ResumeData } from '@/lib/types';
import { sanitizeInlineHtml } from '@/lib/sanitize';

interface ResumePrintProps {
  data: ResumeData;
}

export default function ResumePrint({ data }: ResumePrintProps) {
  const { personal, stats, summary, experience, projects, skills, education, customSections } = data;

  const colorMap: Record<string, string> = {
    purple: '#4535d4',
    teal: '#0a7a5c',
    amber: '#a06200',
    cs: '#c0426e',
  };

  const bgMap: Record<string, string> = {
    purple: '#f0edff',
    teal: '#e8f8f4',
    amber: '#fef8ec',
    cs: '#fdf0f5',
  };

  const projectColorMap: Record<string, { border: string; bg: string; tagBg: string; tagText: string }> = {
    v1: { border: '#4535d4', bg: '#f7f6ff', tagBg: '#e8e4ff', tagText: '#4535d4' },
    v2: { border: '#0a7a5c', bg: '#f0fbf8', tagBg: '#d8f4ed', tagText: '#0a7a5c' },
    v3: { border: '#a06200', bg: '#fefbf0', tagBg: '#faecd8', tagText: '#a06200' },
    v4: { border: '#c0426e', bg: '#fdf4f8', tagBg: '#fce8f0', tagText: '#c0426e' },
  };

  return (
    <div id="resume-content" style={{ display: 'none' }}>
      <div
        style={{
          width: '794px',
          padding: '36px 48px 32px',
          fontFamily: "'DM Sans', Arial, sans-serif",
          color: '#1c1a18',
          fontSize: '10pt',
          lineHeight: 1.55,
          background: '#fff',
        }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '2px solid #4535d4' }}>
          <div
            style={{
              fontFamily: "'Spectral', Georgia, serif",
              fontSize: '26pt',
              fontWeight: 300,
              color: '#4535d4',
              lineHeight: 1,
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            {personal.name}
          </div>
          <div
            style={{
              fontSize: '11pt',
              color: '#4a4844',
              fontWeight: 300,
              marginBottom: '9px',
              letterSpacing: '0.01em',
            }}
          >
            {personal.title}
          </div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '8.5pt',
              color: '#4a4844',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0,
            }}
          >
            <span style={{ marginRight: '18px' }}>{personal.location}</span>
            <span style={{ marginRight: '18px' }}>{personal.email}</span>
            <span style={{ marginRight: '18px' }}>{personal.phone}</span>
            <span style={{ marginRight: '18px' }}>{personal.linkedin}</span>
            <span>{personal.website}</span>
          </div>
        </div>

        {/* METRICS BAR */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          {stats.map((stat, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: bgMap[stat.color] || '#f0edff',
                borderRadius: '5px',
                padding: '10px 12px',
                borderTop: `3px solid ${colorMap[stat.color] || '#4535d4'}`,
              }}
            >
              <div
                style={{
                  fontFamily: "'Spectral', Georgia, serif",
                  fontSize: '18pt',
                  fontWeight: 600,
                  color: colorMap[stat.color] || '#4535d4',
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: '8.5pt', color: '#4a4844', marginTop: '4px', lineHeight: 1.35 }}>
                {stat.label}
              </div>
              <div
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '7.5pt',
                  color: '#8a8884',
                  marginTop: '2px',
                }}
              >
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* SUMMARY */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '7.5pt',
              color: '#4535d4',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              marginBottom: '7px',
              fontWeight: 500,
            }}
          >
            Professional Summary
          </div>
          <div
            style={{
              borderLeft: '3px solid #4535d4',
              paddingLeft: '12px',
              fontSize: '10pt',
              color: '#4a4844',
              lineHeight: 1.65,
            }}
          >
            {summary}
          </div>
        </div>

        {/* EXPERIENCE */}
        {experience && (
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '7.5pt',
                color: '#4535d4',
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                marginBottom: '12px',
                fontWeight: 500,
                paddingBottom: '5px',
                borderBottom: '1.5px solid #dedad4',
              }}
            >
              Work Experience
            </div>

            {experience.map((item, i) => (
              <div
                key={i}
                style={
                  i > 0
                    ? { paddingTop: '12px', borderTop: '1px solid #eeece8' }
                    : { marginBottom: '14px' }
                }
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '5px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "'Spectral', Georgia, serif",
                        fontSize: '12.5pt',
                        fontWeight: 400,
                        color: '#1c1a18',
                      }}
                    >
                      {item.title}
                    </span>
                    <span style={{ fontSize: '9.5pt', color: '#4535d4', marginLeft: '8px' }}>
                      · {item.company}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: '7pt',
                        color: '#8a8884',
                        marginLeft: '7px',
                        padding: '1px 6px',
                        border: '1px solid #dedad4',
                        borderRadius: '2px',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '8pt',
                      color: '#0a7a5c',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.period}
                  </div>
                </div>

                {item.bullets.map((bullet, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: '10pt',
                      color: '#4a4844',
                      lineHeight: 1.65,
                      paddingLeft: '12px',
                      position: 'relative',
                      marginBottom: j < item.bullets.length - 1 ? '3px' : 0,
                    }}
                  >
                    <span style={{ position: 'absolute', left: 0, color: '#8a8884' }}>&mdash;</span>
                    {bullet}
                  </div>
                ))}

                {item.highlights.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginTop: '10px',
                    }}
                  >
                    {item.highlights.map((hl, j) => {
                      const hlColor =
                        hl.color === 'green' || hl.color === 'teal'
                          ? { bg: '#e8f8f4', border: '#0a7a5c', text: '#0a7a5c' }
                          : hl.color === 'amber'
                          ? { bg: '#fef8ec', border: '#a06200', text: '#a06200' }
                          : { bg: '#f0edff', border: '#4535d4', text: '#4535d4' };
                      return (
                        <div
                          key={j}
                          style={{
                            background: hlColor.bg,
                            borderRadius: '4px',
                            padding: '8px 10px',
                            borderLeft: `3px solid ${hlColor.border}`,
                            breakInside: 'avoid',
                            pageBreakInside: 'avoid',
                          }}
                        >
                          <div
                            style={{
                              fontFamily: "'DM Mono', monospace",
                              fontSize: '7pt',
                              color: hlColor.text,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              marginBottom: '4px',
                            }}
                          >
                            {hl.label}
                          </div>
                          <div style={{ fontSize: '9pt', color: '#4a4844', lineHeight: 1.55 }}>
                            {hl.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PROJECTS */}
        {projects && (
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '7.5pt',
                color: '#4535d4',
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                marginBottom: '10px',
                fontWeight: 500,
                paddingBottom: '5px',
                borderBottom: '1.5px solid #dedad4',
              }}
            >
              Projects
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {projects.map((project, i) => {
                const pc = projectColorMap[project.variant] || projectColorMap.v1;
                return (
                  <div
                    key={i}
                    style={{
                      flex: '0 0 calc(50% - 4px)',
                      background: pc.bg,
                      borderRadius: '5px',
                      padding: '10px 12px',
                      borderTop: `2px solid ${pc.border}`,
                      boxSizing: 'border-box',
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <div style={{ marginBottom: '4px' }}>
                      {project.url ? (
                        <a
                          href={project.url}
                          style={{
                            fontFamily: "'Spectral', Georgia, serif",
                            fontSize: '11pt',
                            color: pc.border,
                            fontWeight: 400,
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                          }}
                        >
                          {project.name} &#8599;
                        </a>
                      ) : (
                        <span
                          style={{
                            fontFamily: "'Spectral', Georgia, serif",
                            fontSize: '11pt',
                            color: '#1c1a18',
                            fontWeight: 400,
                          }}
                        >
                          {project.name}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Mono', monospace",
                        fontSize: '7pt',
                        color: '#8a8884',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '5px',
                      }}
                    >
                      {project.type}
                    </div>
                    <div
                      style={{
                        fontSize: '9pt',
                        color: '#4a4844',
                        lineHeight: 1.55,
                        marginBottom: '6px',
                      }}
                    >
                      {project.description}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                      {project.tags.map((tag, j) => (
                        <span
                          key={j}
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '7pt',
                            color: pc.tagText,
                            background: pc.tagBg,
                            padding: '2px 6px',
                            borderRadius: '2px',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SKILLS */}
        {skills && (
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '7.5pt',
                color: '#4535d4',
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                marginBottom: '10px',
                fontWeight: 500,
                paddingBottom: '5px',
                borderBottom: '1.5px solid #dedad4',
              }}
            >
              Core Skills
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {skills.map((group, i) => (
                <div key={i} style={{ flex: 1, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <div
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '7pt',
                      color: '#0a7a5c',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    {group.title}
                  </div>
                  <div
                    style={{ fontSize: '9pt', color: '#4a4844', lineHeight: 1.9 }}
                    dangerouslySetInnerHTML={{ __html: group.items.map((s) => sanitizeInlineHtml(s)).join('<br>') }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM SECTIONS */}
        {customSections && customSections.length > 0 && customSections.map((section) => (
          <div key={section.id} style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '7.5pt',
                color: '#4535d4',
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                marginBottom: '10px',
                fontWeight: 500,
                paddingBottom: '5px',
                borderBottom: '1.5px solid #dedad4',
              }}
            >
              {section.title}
            </div>
            <div>
              {section.items.map((item, j) => (
                <div
                  key={j}
                  style={{
                    fontSize: '10pt',
                    color: '#4a4844',
                    lineHeight: 1.65,
                    paddingLeft: '12px',
                    position: 'relative',
                    marginBottom: j < section.items.length - 1 ? '3px' : 0,
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, color: '#8a8884' }}>&mdash;</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* EDUCATION */}
        <div>
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '7.5pt',
              color: '#4535d4',
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              marginBottom: '10px',
              fontWeight: 500,
              paddingBottom: '5px',
              borderBottom: '1.5px solid #dedad4',
            }}
          >
            Education
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {education.map((edu, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  border: '1px solid #dedad4',
                  borderRadius: '4px',
                  borderLeft: '3px solid #4535d4',
                  breakInside: 'avoid',
                  pageBreakInside: 'avoid',
                }}
              >
                <div style={{ fontSize: '10pt', color: '#1c1a18', fontWeight: 400, marginBottom: '3px' }}>
                  {edu.degree}
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: '8pt', color: '#8a8884' }}>
                  {edu.university}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
