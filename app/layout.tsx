import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inbaraj B — AI Implementation Manager & Builder',
  description:
    "Experienced in leading enterprise SaaS implementations, architecting complex integrations, and building AI agents that automate workflows and turn fragmented knowledge into reusable solutions. Combines hands-on solution design and enterprise delivery with the development of agentic systems that reduce manual effort, improve consistency, and make implementation processes scalable.",
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
