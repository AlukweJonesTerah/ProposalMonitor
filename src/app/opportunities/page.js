import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/site-header';
import OpportunityBrowser from '../opportunity-browser';

export default function Opportunities() {
  return (
    <>
      <SiteHeader active="opportunities" />
      <main className="container max-w-[1040px] py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight">All opportunities</h1>
        <OpportunityBrowser />
      </main>
    </>
  );
}
