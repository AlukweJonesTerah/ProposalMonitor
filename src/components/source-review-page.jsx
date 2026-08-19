'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

import SiteHeader from '@/components/site-header';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 6;
const SourceLink = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-sm text-primary no-underline hover:underline">{children}<ArrowUpRight className="h-3 w-3 shrink-0" /></a>;

function Paged({ items, empty, render }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  useEffect(() => { setPage(1); }, [items.length]);
  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <>
      <div className="grid gap-3">{items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(render)}</div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</Button>
          <span className="text-xs text-muted-foreground">Page {current} of {pages}</span>
          <Button type="button" variant="outline" size="sm" disabled={current === pages} onClick={() => setPage(current + 1)}>Next</Button>
        </div>
      )}
    </>
  );
}

export default function SourceReviewPage({ brand = PROPOSAL_MONITOR_BRAND }) {
  const [data, setData] = useState({ sources: [], recurring: [], analysed: [], discovered: [] });
  const [newUrl, setNewUrl] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  const [updating, setUpdating] = useState(false);
  const load = async () => {
    const response = await fetch(`${brand.apiBase}/sources`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load submitted sources.');
    setData(result);
  };
  useEffect(() => { load().catch(() => { setMessageTone('error'); setMessage('Could not load submitted sources.'); }); }, [brand.apiBase]);
  const request = async (payload) => {
    if (updating) return;
    setUpdating(true);
    setMessage('');
    try {
      const response = await fetch(`${brand.apiBase}/sources`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update this source.');
      setMessageTone('success');
      setMessage(result.message || 'Source updated.');
      setNewUrl('');
      await load();
    } catch (error) {
      setMessageTone('error');
      setMessage(error.message || 'Could not update this source.');
    } finally {
      setUpdating(false);
    }
  };
  const match = (item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase());
  const pending = useMemo(() => data.sources.filter((item) => item.status === 'pending_review' && match(item)), [data.sources, query]);
  const recurring = useMemo(() => data.recurring.filter(match), [data.recurring, query]);
  const analysed = useMemo(() => data.analysed.filter(match), [data.analysed, query]);
  const discovered = useMemo(() => data.discovered.filter(match), [data.discovered, query]);
  const edit = (url) => { const next = window.prompt('Enter the replacement public URL:', url); if (next && next !== url) request({ operation: 'update', oldUrl: url, newUrl: next }); };
  const showing = (section) => type === 'all' || type === section;
  const hasFilters = Boolean(query || type !== 'all');
  const clearFilters = () => { setQuery(''); setType('all'); };

  return (
    <>
      <SiteHeader brand={brand} />
      <main className="container max-w-[1040px] py-10">
        <Link href={brand.basePath || '/'} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight">Source review</h1>
        <p className="mt-2 text-muted-foreground">Manage the valid public links used by {brand.name}.</p>

        {message && (
          <Alert variant={messageTone === 'error' ? 'destructive' : 'success'} role={messageTone === 'error' ? 'alert' : 'status'} className="mt-6">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-bold">Add a recurring source</h2>
          <Card className="mt-3">
            <CardContent className="pt-6">
              <form onSubmit={(event) => { event.preventDefault(); request({ operation: 'add', url: newUrl }); }} className="flex flex-col gap-3 sm:flex-row">
                <Input type="url" required value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="https://public-portal.example/opportunities" className="flex-1" />
                <Button type="submit">Add recurring link</Button>
              </form>
              <small className="mt-3 block text-xs text-muted-foreground">Only safe public HTTP(S) links are accepted.</small>
            </CardContent>
          </Card>
        </section>

        <Card className="mt-7">
          <CardContent className="flex flex-wrap items-end gap-3 pt-6">
            <div className="grid gap-1.5">
              <Label>Find a link</Label>
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search URL, website, category, or status" className="min-w-[260px]" />
            </div>
            <div className="grid gap-1.5">
              <Label>Show</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="min-w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All link types</SelectItem>
                  <SelectItem value="pending">Awaiting review</SelectItem>
                  <SelectItem value="recurring">Recurring links</SelectItem>
                  <SelectItem value="analysed">One-off analyses</SelectItem>
                  <SelectItem value="discovered">Agent discoveries</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={!hasFilters} onClick={clearFilters}>Clear filters</Button>
          </CardContent>
        </Card>

        {showing('pending') && (
          <section className="mt-9">
            <h2 className="mb-3 font-serif text-2xl font-bold">Awaiting review ({pending.length})</h2>
            <Paged items={pending} empty="No sources awaiting review." render={(source) => (
              <Card key={source.url}>
                <CardContent className="pt-6">
                  <label className="text-xs uppercase tracking-wide text-muted-foreground">Submitted {new Date(source.submitted_at).toLocaleDateString()}</label>
                  <h3 className="mt-1 break-all text-sm font-semibold">{source.url}</h3>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <SourceLink href={source.url}>Visit website</SourceLink>
                    <Button type="button" size="sm" className="ml-auto" onClick={() => request({ url: source.url, action: 'approve' })}>Approve</Button>
                    <Button type="button" size="sm" variant="destructive" onClick={() => request({ url: source.url, action: 'reject' })}>Reject</Button>
                  </div>
                </CardContent>
              </Card>
            )} />
          </section>
        )}

        {showing('recurring') && (
          <section className="mt-9">
            <h2 className="mb-3 font-serif text-2xl font-bold">Recurring monitored websites ({recurring.length})</h2>
            <Paged items={recurring} empty="No recurring websites configured." render={(source) => {
              const url = source.start_urls?.[0];
              return (
                <Card key={url}>
                  <CardContent className="pt-6">
                    <Badge variant={source.active ? 'teal' : 'muted'}>{source.active ? 'Active recurring source' : 'Inactive'}</Badge>
                    <h3 className="mt-2 text-sm font-semibold">{source.name}</h3>
                    <SourceLink href={url}>{url}</SourceLink>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => edit(url)}>Edit link</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => request({ operation: 'delete', collection: 'recurring', url })}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            }} />
          </section>
        )}

        {showing('analysed') && (
          <section className="mt-9">
            <h2 className="mb-3 font-serif text-2xl font-bold">One-off links analysed ({analysed.length})</h2>
            <Paged items={analysed} empty="Links you analyse individually will be listed here." render={(source) => (
              <Card key={source.url}>
                <CardContent className="pt-6">
                  <Badge variant="muted">{source.category} · {source.relevance_score}</Badge>
                  <h3 className="mt-2 text-sm font-semibold">{source.title}</h3>
                  <SourceLink href={source.url}>{source.url}</SourceLink>
                  <div className="mt-3">
                    <Button type="button" size="sm" variant="destructive" onClick={() => request({ operation: 'delete', collection: 'analysed', url: source.url })}>Delete</Button>
                  </div>
                </CardContent>
              </Card>
            )} />
          </section>
        )}

        {showing('discovered') && (
          <section className="mt-9">
            <h2 className="mb-3 font-serif text-2xl font-bold">Links found by public-web discovery ({discovered.length})</h2>
            <Paged items={discovered} empty="No public-web discoveries yet. Enable public-web discovery to populate this section." render={(source) => (
              <Card key={source.link}>
                <CardContent className="pt-6">
                  <Badge variant="muted">{source.category} · {source.relevance_score}</Badge>
                  <h3 className="mt-2 text-sm font-semibold">{source.name}</h3>
                  <SourceLink href={source.link}>{source.link}</SourceLink>
                </CardContent>
              </Card>
            )} />
          </section>
        )}
      </main>
    </>
  );
}
