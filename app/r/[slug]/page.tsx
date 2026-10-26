import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { loadBase, loadProfile, mergeResume, getProfileSlugs } from '@/lib/resume';
import ResumeLayout from '@/components/ResumeLayout';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = getProfileSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await loadProfile(slug);

  if (!profile) {
    return { title: 'Not Found' };
  }

  const base = loadBase();
  const merged = mergeResume(base, profile);

  return {
    title: `${merged.personal.name} — ${merged.personal.title}`,
    robots: 'noindex, nofollow',
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await loadProfile(slug);

  if (!profile) {
    notFound();
  }

  const base = loadBase();
  const data = mergeResume(base, profile);

  return <ResumeLayout data={data} isolated profileSlug={slug} />;
}
