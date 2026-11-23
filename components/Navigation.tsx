import ThemeToggle from '@/components/ThemeToggle';
import TimelineButton from '@/components/TimelineButton';
import { NavDownloadButton } from '@/components/ResumeDownload';

interface NavigationProps {
  isolated?: boolean;
}

export default function Navigation({ isolated }: NavigationProps) {
  const brandHref = isolated ? '#top' : '/';

  return (
    <nav>
      <a href={brandHref} className="nav-brand">
        Inbaraj <span>B</span>
      </a>
      <ul className="nav-links">
        <li><a href="#experience">Experience</a></li>
        <li><a href="#projects">Projects</a></li>
        <li><a href="#skills">Skills</a></li>
        <li><a href="#booking">Book a call</a></li>
        <li><a href="#contact">Contact</a></li>
      </ul>
      <div className="nav-right">
        <TimelineButton />
        <ThemeToggle />
        <NavDownloadButton />
        <a
          href="https://calendly.com/inbarajb91/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-cta"
        >
          Get in touch
        </a>
      </div>
    </nav>
  );
}
