import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inbaraj B — AI Implementation Manager & Builder',
  description:
    "I implement the platform and build the AI that runs it — delivered on the customer’s ground, from discovery to go-live. At Rocketlane, that means Nitro agents for customers, integrations with Salesforce, ServiceNow, and ADP, and the AI systems our implementation team runs on. At Facilio, $4.1M+ in contract value delivered across the UK, US, and Middle East.",
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
