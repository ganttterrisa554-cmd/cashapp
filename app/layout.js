export const metadata = {
  title: 'Pay Linda',
  description: 'Secure Bitcoin/Lightning payment',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#0c0f12' }}>
        {children}
      </body>
    </html>
  );
}
