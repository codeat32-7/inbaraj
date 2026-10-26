import { z } from 'zod';

const BadgeSchema = z.object({
  text: z.string(),
  variant: z.string(),
});

const HeroSchema = z.object({
  tag: z.string().optional(),
  headline: z.string().optional(),
  description: z.string().optional(),
  badges: z.array(BadgeSchema).optional(),
}).partial();

const StatSchema = z.object({
  value: z.string(),
  label: z.string(),
  sub: z.string(),
  color: z.string(),
});

const ExperienceHighlightSchema = z.object({
  label: z.string(),
  text: z.string(),
  color: z.string(),
  wide: z.boolean().optional(),
});

const ExperienceItemSchema = z.object({
  period: z.string(),
  company: z.string(),
  badge: z.string(),
  title: z.string(),
  bullets: z.array(z.string()),
  highlights: z.array(ExperienceHighlightSchema),
});

const ProjectSchema = z.object({
  name: z.string(),
  icon: z.string(),
  variant: z.string(),
  type: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  url: z.string().nullable(),
});

const SkillGroupSchema = z.object({
  title: z.string(),
  color: z.string(),
  items: z.array(z.string()),
});

const EducationSchema = z.object({
  degree: z.string(),
  university: z.string(),
});

const BookingDetailSchema = z.object({
  icon: z.string(),
  text: z.string(),
});

const BookingSchema = z.object({
  tagline: z.string().optional(),
  description: z.string().optional(),
  details: z.array(BookingDetailSchema).optional(),
}).partial();

const ContactInfoSchema = z.object({
  heading: z.string().optional(),
  description: z.string().optional(),
  subtext: z.string().optional(),
}).partial();

const CustomSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  position: z.string(),
  items: z.array(z.string()),
});

export const ProfileOverrideSchema = z.object({
  hero: HeroSchema.optional(),
  stats: z.array(StatSchema).optional(),
  experience: z.union([z.array(ExperienceItemSchema), z.literal(false)]).optional(),
  projects: z.union([z.array(ProjectSchema), z.literal(false)]).optional(),
  skills: z.union([z.array(SkillGroupSchema), z.literal(false)]).optional(),
  education: z.array(EducationSchema).optional(),
  booking: BookingSchema.optional(),
  contact: ContactInfoSchema.optional(),
  summary: z.string().optional(),
  footer: z.string().optional(),
  customSections: z.array(CustomSectionSchema).optional(),
}).strict();

export type ValidatedProfileOverride = z.infer<typeof ProfileOverrideSchema>;
