import data from '@/data/timeline.json';

export type TimelineColor = 'amber' | 'purple' | 'teal';

export interface TimelineChapter {
  id: string;
  company: string;
  role: string;
  badge: string;
  period: string;
  /** YYYY-MM */
  from: string;
  /** YYYY-MM or "present" */
  to: string;
  color: TimelineColor;
  headline: { value: string; label: string };
  /** A few lines on the actual work. */
  work: string[];
  learned: string[];
  achieved: string[];
}

export const chapters = (data as { chapters: TimelineChapter[] }).chapters;

/** "2016-05" -> 2016.333 (fractional year, month start). */
export function monthToYear(ym: string): number {
  const [y, m] = ym.split('-').map(Number);
  return y + (m - 1) / 12;
}

export function nowYear(): number {
  const d = new Date();
  return d.getFullYear() + d.getMonth() / 12 + d.getDate() / 365;
}

export interface ChapterRange {
  from: number;
  to: number;
}

export function chapterRanges(): ChapterRange[] {
  const now = nowYear();
  return chapters.map((c) => ({
    from: monthToYear(c.from),
    to: c.to === 'present' ? now : monthToYear(c.to),
  }));
}
