export interface Personal {
  name: string;
  title: string;
  location: string;
  email: string;
  phone: string;
  linkedin: string;
  linkedinUrl: string;
  website: string;
  calendly: string;
  whatsapp: string;
  portfolio: string;
  portfolioLabel: string;
}

export interface Badge {
  text: string;
  variant: string;
}

export interface Hero {
  tag: string;
  headline: string;
  description: string;
  badges: Badge[];
}

export interface Stat {
  value: string;
  label: string;
  sub: string;
  color: string;
}

export interface ExperienceHighlight {
  label: string;
  text: string;
  color: string;
  /** Span both columns of the highlight grid. */
  wide?: boolean;
}

export interface ExperienceItem {
  period: string;
  company: string;
  badge: string;
  title: string;
  bullets: string[];
  highlights: ExperienceHighlight[];
}

export interface Project {
  name: string;
  icon: string;
  variant: string;
  type: string;
  description: string;
  tags: string[];
  url: string | null;
}

export interface SkillGroup {
  title: string;
  color: string;
  items: string[];
}

export interface Education {
  degree: string;
  university: string;
}

export interface BookingDetail {
  icon: string;
  text: string;
}

export interface Booking {
  tagline: string;
  description: string;
  details: BookingDetail[];
}

export interface ContactInfo {
  heading: string;
  description: string;
  subtext: string;
}

export interface CustomSection {
  id: string;
  title: string;
  position: string;
  items: string[];
}

export interface ResumeData {
  personal: Personal;
  hero: Hero;
  stats: Stat[];
  experience: ExperienceItem[] | false;
  projects: Project[] | false;
  skills: SkillGroup[] | false;
  education: Education[];
  booking: Booking;
  contact: ContactInfo;
  summary: string;
  footer: string;
  customSections?: CustomSection[];
}

export interface ProfileMeta {
  company: string;
  created: string;
  jdSource?: string;
  active: boolean;
}

export interface ProfileOverride {
  meta: ProfileMeta;
  personal?: Partial<Personal>;
  hero?: Partial<Hero>;
  stats?: Stat[];
  experience?: ExperienceItem[] | false;
  projects?: Project[] | false;
  skills?: SkillGroup[] | false;
  education?: Education[];
  booking?: Partial<Booking>;
  contact?: Partial<ContactInfo>;
  summary?: string;
  footer?: string;
  customSections?: CustomSection[];
}

export interface RegistryEntry {
  company: string;
  created: string;
  active: boolean;
}

export type Registry = Record<string, RegistryEntry>;
