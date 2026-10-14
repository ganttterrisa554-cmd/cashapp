import type { ReactNode } from 'react';

export const metadata = {
  title: 'Instant Lightning Payment Portal',
  description: 'Generate a Lightning Network invoice for instant payment.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/globe.svg" type="image/svg+xml" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#ebebeb' }}>
        {children}
      </body>
    </html>
  );
}
