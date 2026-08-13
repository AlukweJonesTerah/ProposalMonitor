import Link from 'next/link';
import AppHeader from './app-header';

export default function NotFound() {
  return <>
    <AppHeader />
    <main className="historyPage notFoundPage">
      <p className="notFoundCode">404</p>
      <h1>Page not found</h1>
      <p>The page you requested does not exist or may have moved.</p>
      <Link className="notFoundLink" href="/">Return to dashboard</Link>
    </main>
  </>;
}
