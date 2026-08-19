'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, CalendarPlus } from 'lucide-react';

import SiteHeader from '@/components/site-header';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const categories = ['Analytics', 'Data science', 'Training', 'Grant', 'Certification', 'Paper proposal', 'Digital Health & Climate Tech', 'Youth, Women & Inclusion', 'Other'];

export default function OpportunityDetailPage({ brand = PROPOSAL_MONITOR_BRAND, id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${brand.apiBase}/results`, { cache: 'no-store' }).then((response) => response.json()).then(setData).catch(() => setError('The opportunity details could not be loaded.'));
  }, [brand.apiBase]);

  if (error) return <main className="container max-w-[1040px] py-10"><p className="text-sm text-destructive">{error}</p></main>;
  if (!data) return <main className="container max-w-[1040px] py-10"><p className="text-sm text-muted-foreground">Loading opportunity…</p></main>;
  const opportunity = data.proposals.find((item) => item.id === id);
  if (!opportunity) return (
    <main className="container max-w-[1040px] py-10">
      <h1 className="font-serif text-3xl font-bold">Opportunity not found</h1>
      <Link href={brand.basePath || '/'} className="mt-3 inline-block text-sm font-bold text-primary no-underline hover:underline">Return to dashboard</Link>
    </main>
  );
  const others = data.proposals.filter((item) => item.id !== opportunity.id).slice(0, 6);

  return (
    <>
      <SiteHeader active="opportunities" brand={brand} />
      <main className="container grid max-w-[1040px] grid-cols-1 gap-6 py-10 lg:grid-cols-[minmax(0,1fr)_290px]">
        <Link href={brand.basePath || '/'} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline lg:col-span-2"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>

        <Card>
          <CardContent className="p-8">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{opportunity.category} opportunity</p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight md:text-4xl">{opportunity.name}</h1>
            <p className="mt-3 border-b pb-4 text-sm text-muted-foreground">{opportunity.source} · Deadline: {opportunity.due_date || 'Not stated'} · {opportunity.relevance_score || 'Unscored'} relevance</p>
            <section className="mt-6">
              <h2 className="font-serif text-xl font-bold">Summary</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{opportunity.match_reason || 'Review the source document to confirm the scope and fit.'}</p>
            </section>
            <section className="mt-6">
              <h2 className="font-serif text-xl font-bold">Eligibility and fit</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{opportunity.eligibility_notes || 'Check the source requirements before applying.'}</p>
            </section>
            <section className="mt-6">
              <h2 className="font-serif text-xl font-bold">How to apply</h2>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-muted-foreground">
                <li>Open the official opportunity page or document.</li>
                <li>Confirm eligibility, scope, closing date, required documents, and submission channel.</li>
                <li>Prepare the required technical and financial/application materials.</li>
                <li>Submit through the official portal or the instructions on the source page before the deadline.</li>
              </ol>
            </section>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href={opportunity.link} target="_blank" rel="noreferrer">Open official source and apply <ArrowUpRight className="h-4 w-4" /></a>
              </Button>
              {opportunity.due_date && opportunity.due_date !== 'Not stated' && (
                <Button asChild variant="outline">
                  <a href={`${brand.apiBase}/calendar?id=${opportunity.id}`} title="Downloads a calendar file with the deadline and a 3-day-before reminder">
                    <CalendarPlus className="h-4 w-4" />Add deadline to calendar
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="p-8">
            <h2 className="font-serif text-xl font-bold">Available categories</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((category) => <Badge key={category} variant="muted">{category}</Badge>)}
            </div>
            <h2 className="mt-8 font-serif text-xl font-bold">More opportunities</h2>
            {others.length ? (
              <div className="mt-2 divide-y">
                {others.map((item) => (
                  <Link href={`${brand.basePath}/opportunities/${item.id}`} key={item.id} className="block py-3.5 text-foreground no-underline hover:text-primary">
                    <small className="text-xs text-muted-foreground">{item.category} · {item.relevance_score || 'Review'}</small>
                    <b className="mt-1 block text-sm leading-snug">{item.name}</b>
                    <em className="mt-1 block text-xs not-italic text-muted-foreground">Due {item.due_date || 'Not stated'}</em>
                  </Link>
                ))}
              </div>
            ) : <p className="mt-2 text-sm text-muted-foreground">New opportunities will appear here after the next monitor update.</p>}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
