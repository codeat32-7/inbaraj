import { ExperienceItem } from '@/lib/types';

interface ExperienceProps {
  experience: ExperienceItem[];
}

export default function Experience({ experience }: ExperienceProps) {
  return (
    <section id="experience">
      <div className="section-label">Work history</div>
      <h2 dangerouslySetInnerHTML={{ __html: "Where I've <em>delivered</em>" }} />
      {experience.map((item, i) => (
        <div key={i} className="exp-item reveal">
          <div>
            <div className="exp-period">{item.period}</div>
            <div className="exp-company">{item.company}</div>
            <span className="exp-co-badge">{item.badge}</span>
          </div>
          <div>
            <div className="exp-title">{item.title}</div>
            <ul className="exp-bullets">
              {item.bullets.map((bullet, j) => (
                <li key={j}>{bullet}</li>
              ))}
            </ul>
            {item.highlights.length > 0 && (
              <div className="exp-highlights">
                {[...item.highlights.filter((h) => !h.wide), ...item.highlights.filter((h) => h.wide)].map((hl, j) => (
                  <div key={j} className={`exp-highlight ${hl.color}${hl.wide ? ' wide' : ''}`}>
                    <div className="exp-highlight-label">{hl.label}</div>
                    {hl.text.includes('\n') ? (
                      <ul>
                        {hl.text
                          .split('\n')
                          .filter((line) => line.trim())
                          .map((raw, k) => {
                            // "- " marks a nested pointer; a line ending in ":" is a label-only heading
                            const isSub = raw.trim().startsWith('- ');
                            const line = isSub ? raw.trim().slice(2) : raw.trim();
                            return (
                              <li key={k} className={isSub ? 'sub' : undefined}>
                                {line.endsWith(':') ? (
                                  <strong>{line}</strong>
                                ) : line.includes(': ') ? (
                                  <>
                                    <strong>{line.slice(0, line.indexOf(': ') + 1).trim()}</strong>
                                    {line.slice(line.indexOf(': ') + 1)}
                                  </>
                                ) : (
                                  line
                                )}
                              </li>
                            );
                          })}
                      </ul>
                    ) : (
                      <p>{hl.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
