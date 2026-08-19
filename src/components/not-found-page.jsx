import Link from 'next/link';

import SiteHeader from '@/components/site-header';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';
import { Button } from '@/components/ui/button';

export default function NotFoundPage({ brand = PROPOSAL_MONITOR_BRAND }) {
  return (
    <>
      <SiteHeader brand={brand} />
      <main className="container flex min-h-[48vh] max-w-[1040px] flex-col justify-center py-10">
        <p className="font-serif text-7xl font-bold leading-none text-primary">404</p>
        <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-muted-foreground">The page you requested does not exist or may have moved.</p>
        <Button asChild className="mt-5 self-start">
          <Link href={brand.basePath || '/'}>Return to dashboard</Link>
        </Button>
      </main>
    </>
  );
}
