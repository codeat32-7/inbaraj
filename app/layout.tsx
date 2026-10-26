import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inbaraj B — AI Implementation Manager & Builder',
  description:
    "Five years running SaaS implementations end to end — enterprise CMMS rollouts across the UK, US, and Middle East at Facilio, and AI-first customer onboarding at Rocketlane. I turn messy requirements into working systems, and build the AI agents that make the next implementation faster.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Spectral:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
