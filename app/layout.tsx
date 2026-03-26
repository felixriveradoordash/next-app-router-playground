import '#/styles/globals.css';

import { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'MarTech Value OS', template: '%s | MarTech Value OS' },
  metadataBase: new URL('https://vercel.com'),
  description:
    'A scenario-aware MarTech impact calculator with portfolio rollups, Monte Carlo simulation, sensitivity analysis, and transparent formulas.',
  openGraph: {
    title: 'MarTech Value OS',
    description:
      'Executive-ready impact modeling for MarTech initiatives, translated from a PRD and spreadsheet into a modern Vercel web app.',
    images: [`/api/og?title=MarTech%20Value%20OS`],
  },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark [color-scheme:dark]">
      <body
        className={`bg-slate-950 font-sans ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
