import './globals.css';

export const metadata = {
  title: 'Scriper Tester',
  description: 'Dockerized Python and Next.js workspace',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
