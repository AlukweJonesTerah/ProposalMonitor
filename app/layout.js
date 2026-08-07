import './globals.css';

export const metadata = {
  title: 'Proposal Monitor',
  description: 'Proposal opportunities, alerts, and workflow tracking',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
