import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inbaraj B — AI Implementation Manager & Builder',
  description:
    "Experienced in leading enterprise SaaS implementations, architecting complex integrations, and building AI agents that automate workflows and turn fragmented knowledge into reusable solutions. Combines hands-on solution design and enterprise delivery with the development of agentic systems that reduce manual effort, improve consistency, and make implementation processes scalable.",
};

// Light is the default theme. A visitor who picked dark keeps it (localStorage "theme").
// Runs before first paint so dark-mode visitors never see a light flash.
const THEME_INIT =
  "try{if(localStorage.getItem('theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}";

// Screen fonts: Fraunces (display), Inter (body), JetBrains Mono (labels).
// DM Mono / Spectral / DM Sans stay loaded because the print/PDF layout (ResumePrint) names them directly.
const FONTS =
  'https://fonts.googleapis.com/css2' +
  '?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..600' +
  '&family=Inter:wght@400;500;600' +
  '&family=JetBrains+Mono:wght@400;500' +
  '&family=DM+Mono:wght@400;500' +
  '&family=Spectral:ital,wght@0,300;0,400;0,600;1,300;1,400' +
  '&family=DM+Sans:wght@300;400;500' +
  '&display=swap';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={FONTS} rel="stylesheet" />
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
