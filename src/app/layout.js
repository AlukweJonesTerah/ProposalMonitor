import './globals.css';
import './overrides.css';

export const metadata = {
  title: 'Proposal Monitor',
  description: 'Proposal opportunity intelligence workspace',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
