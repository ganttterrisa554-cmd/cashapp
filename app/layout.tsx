import type { ReactNode } from 'react';

export const metadata = {
  title: 'Send, Receive, Invest, & Manage Your Money with Cash App',
  description: 'Download Cash App to send & receive money instantly, spend with the Cash App Card, buy bitcoin, invest in stocks, & manage your finances.',
  openGraph: {
    images: ['https://cash-f.squarecdn.com/web/marketing/40f36d0bf580010b0c5ff09460a82d7a01dfe98a/assets/images/share/default.png'],
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
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#ebebeb' }}>
        {children}
      </body>
    </html>
  );
}
