import { ResumeData } from '@/lib/types';
import { sanitizeInlineHtml } from '@/lib/sanitize';
import Navigation from '@/components/Navigation';
import Hero from '@/components/Hero';
import Experience from '@/components/Experience';
import Projects from '@/components/Projects';
import Skills from '@/components/Skills';
import BookingSection from '@/components/BookingSection';
import Contact from '@/components/Contact';
import CustomSection from '@/components/CustomSection';
import ResumePrint from '@/components/ResumePrint';
import { FabDownloadButton } from '@/components/ResumeDownload';
import ScrollReveal from '@/components/ScrollReveal';

interface ResumeLayoutProps {
  data: ResumeData;
  isolated?: boolean;
  profileSlug?: string;
}

export default function ResumeLayout({ data, isolated, profileSlug }: ResumeLayoutProps) {
  const customSections = data.customSections || [];

  const renderCustomSections = (position: string) =>
    customSections
      .filter((s) => s.position === position)
      .map((s) => (
        <div key={s.id}>
          <hr className="section-divider" />
          <CustomSection section={s} />
        </div>
      ));

  return (
    <>
      <Navigation isolated={isolated} />

      <Hero data={data} />

      {renderCustomSections('after-hero')}

      {data.experience && (
        <>
          <hr className="section-divider" />
          <Experience experience={data.experience} />
        </>
      )}

      {renderCustomSections('after-experience')}

      {data.projects && (
        <>
          <hr className="section-divider" />
          <Projects projects={data.projects} />
        </>
      )}

      {renderCustomSections('after-projects')}

      {data.skills && (
        <>
          <hr className="section-divider" />
          <Skills skills={data.skills} education={data.education} />
        </>
      )}

      {renderCustomSections('after-skills')}

      <hr className="section-divider" />
      <BookingSection data={data} />

      {renderCustomSections('after-booking')}

      <hr className="section-divider" />
      <Contact data={data} isolated={isolated} />

      {renderCustomSections('after-contact')}

      <footer dangerouslySetInnerHTML={{ __html: sanitizeInlineHtml(data.footer) }} />

      <ScrollReveal />
      <FabDownloadButton />
      <ResumePrint data={data} profileSlug={profileSlug} />
    </>
  );
}
