import './globals.css';
import './overrides.css';
import SourceFilterClear from './source-filter-clear';

export const metadata = {
  title: 'Proposal Monitor',
  description: 'Proposal opportunity intelligence workspace',
};

export default function RootLayout({ children }) {
  return <html lang="en"><body><SourceFilterClear />{children}</body></html>;
}
