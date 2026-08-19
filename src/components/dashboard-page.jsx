'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import SiteHeader from '@/components/site-header';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const categories = ['Analytics', 'Data science', 'Training', 'Grant', 'Certification', 'Paper proposal', 'Digital Health & Climate Tech', 'Youth, Women & Inclusion', 'Other'];
const fmt = (value) => value && value !== 'Not stated' ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not stated';

export default function DashboardPage({ brand = PROPOSAL_MONITOR_BRAND }) {
  const [data, setData] = useState({ proposals: [], count: 0, generated_at: null });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [urls, setUrls] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await (await fetch(`${brand.apiBase}/results`, { cache: 'no-store' })).json()); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const items = useMemo(() => data.proposals.filter((proposal) =>
    `${proposal.name} ${proposal.source} ${proposal.category} ${proposal.keywords}`.toLowerCase().includes(query.toLowerCase()) &&
    (!categoryFilter || proposal.category === categoryFilter) &&
    (!priorityFilter || proposal.relevance_score === priorityFilter),
  ), [data, query, categoryFilter, priorityFilter]);
  const lead = items.find((proposal) => proposal.relevance_score === 'High') || items[0];
  const high = items.filter((proposal) => proposal.relevance_score === 'High').length;

  const submitSources = async (event) => {
    event.preventDefault(); setSaving(true); setNotice('');
    try {
      const response = await fetch(`${brand.apiBase}/sources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUrls(''); setNotice(`${result.added} source${result.added === 1 ? '' : 's'} submitted for review.`);
    } catch (error) { setNotice(error.message || 'Could not submit the sources.'); }
    finally { setSaving(false); }
  };

  const analyse = async (event) => {
    event.preventDefault(); setAnalysing(true); setAnalysis(null);
    try {
      const response = await fetch(`${brand.apiBase}/analyse`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: analysisUrl }) });
      const result = await response.json();
      if (!response.ok) {
        setAnalysis({ error: result.error, blockedUrl: result.code === 'AUTOMATED_ACCESS_BLOCKED' ? result.url : '' });
        return;
      }
      setAnalysis({ ...result.analysis, warning: result.warning });
    } catch (error) { setAnalysis({ error: error.message || 'Could not analyse this URL.' }); }
    finally { setAnalysing(false); }
  };

  const clearFilters = () => { setQuery(''); setCategoryFilter(''); setPriorityFilter(''); };
  const opportunityHref = (id) => `${brand.basePath}/opportunities/${id}`;

  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader active="dashboard" search={{ value: query, onChange: setQuery }} brand={brand} />

      <div className="flex flex-wrap items-center justify-center gap-2 border-b bg-accent/60 px-4 py-2.5 text-xs text-muted-foreground">
        <span>Monitoring for</span>
        {(data.keywords || []).map((keyword) => <Badge key={keyword} variant="outline" className="bg-card font-medium text-primary">{keyword}</Badge>)}
      </div>

      <div className="flex flex-wrap items-end justify-center gap-3 border-b bg-card px-4 py-3">
        <div className="grid gap-1.5">
          <Label htmlFor="find-opportunity">Find an opportunity</Label>
          <Input id="find-opportunity" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, category, source, or keyword" className="min-w-[260px]" />
        </div>
        <div className="grid gap-1.5">
          <Label>Category</Label>
          <Select value={categoryFilter || 'all'} onValueChange={(value) => setCategoryFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="min-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Priority</Label>
          <Select value={priorityFilter || 'all'} onValueChange={(value) => setPriorityFilter(value === 'all' ? '' : value)}>
            <SelectTrigger className="min-w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" disabled={!query && !categoryFilter && !priorityFilter} onClick={clearFilters}>Clear filters</Button>
        <span className="pb-2 text-xs text-muted-foreground">{items.length} result{items.length === 1 ? '' : 's'}</span>
      </div>

      <div className="container grid flex-1 grid-cols-1 gap-6 py-6 lg:grid-cols-[minmax(0,3fr)_294px]" id="dashboard">
        <section className="flex flex-col gap-6">
          <Card className="overflow-hidden">
            {lead ? (
              <div className="grid md:grid-cols-2">
                <div className="flex min-w-0 flex-col p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="destructive" className="shrink-0 uppercase tracking-wide">High priority summary</Badge>
                    <span className="whitespace-nowrap">Updated {data.generated_at ? new Date(data.generated_at).toLocaleDateString() : 'today'}</span>
                  </div>
                  <h1 className="my-4 line-clamp-5 font-serif text-[29px] font-bold leading-tight tracking-tight md:text-4xl">{lead.name}</h1>
                  <small className="mt-auto text-xs text-muted-foreground">{lead.source} · {lead.category}</small>
                  <Button asChild variant="outline" className="mt-4 self-start">
                    <Link href={opportunityHref(lead.id)}>Read full summary</Link>
                  </Button>
                </div>
                <div className="flex flex-col bg-accent p-6 md:p-8">
                  <Label>Opportunity details</Label>
                  <b className="my-4 font-serif text-[26px] md:text-[30px]">{lead.recommended_action || 'Review'}</b>
                  <div className="border-t pt-2.5">
                    <span className="block text-xs font-semibold text-foreground">Deadline</span>
                    <span className="text-sm text-muted-foreground">{fmt(lead.due_date)}</span>
                  </div>
                  <div className="mt-2.5 border-t pt-2.5">
                    <span className="block text-xs font-semibold text-foreground">Priority</span>
                    <span className="text-sm text-muted-foreground">{lead.relevance_score || 'Unscored'}</span>
                  </div>
                  <p className="mt-4 rounded-lg bg-card p-3 text-sm leading-relaxed text-muted-foreground">{lead.match_reason || 'Open the opportunity to review its requirements and eligibility.'}</p>
                  <Button asChild className="mt-4 self-start">
                    <a href={lead.link} target="_blank" rel="noreferrer">View official proposal →</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[280px] flex-col justify-center p-10">
                <h1 className="font-serif text-2xl font-bold text-foreground">No opportunities match these filters</h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Try another category or priority, or clear the filters to view every available opportunity.</p>
              </div>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-[1.05fr_1.45fr]">
            <section id="opportunities">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">Other opportunities</h2>
                {items.length > 1 && <span className="text-sm text-primary">{items.length - 1} more</span>}
              </div>
              <div className="flex flex-col gap-3">
                {items.slice(1, 4).map((proposal) => (
                  <Link key={proposal.id} href={opportunityHref(proposal.id)} className="block rounded-xl border bg-card p-4 no-underline transition-colors hover:border-primary/50">
                    <Badge variant="muted" className="mb-2">{proposal.category}</Badge>
                    <b className="block text-sm leading-snug text-foreground">{proposal.name}</b>
                    <small className="mt-2 block text-xs text-muted-foreground">{proposal.source} · Due {fmt(proposal.due_date)}</small>
                  </Link>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <Card>
                <CardContent className="pt-6">
                  <Label>Live pipeline</Label>
                  <div className="mt-4 flex items-center gap-8">
                    <div className="flex items-baseline gap-2">
                      <b className="font-serif text-2xl">{data.count}</b>
                      <span className="text-xs leading-tight text-muted-foreground">Matches<br />identified</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <b className="font-serif text-2xl">{high}</b>
                      <span className="text-xs leading-tight text-muted-foreground">High<br />priority</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Label>Monitor status</Label>
                  <p className="mt-3 flex items-center gap-2 text-sm text-foreground">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    {loading ? 'Refreshing latest results' : 'Ready for review'}
                  </p>
                  <small className="mt-1 block text-xs text-muted-foreground">{data.generated_at ? `Last updated ${new Date(data.generated_at).toLocaleString()}` : 'No result snapshot yet'}</small>
                  <Button onClick={load} className="mt-4 w-full sm:w-auto">Refresh dashboard</Button>
                </CardContent>
              </Card>
            </section>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card id="intake">
              <CardHeader className="gap-2">
                <Label>Recurring monitoring</Label>
                <CardTitle>Suggest a proposal website</CardTitle>
                <p className="text-sm text-muted-foreground">Add a tender, donor, or ministry portal for the team to review. Approved websites are checked in future monitor runs.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitSources} className="flex flex-col gap-3">
                  <Textarea value={urls} onChange={(event) => setUrls(event.target.value)} placeholder={'https://example.gov/tenders\nhttps://example.org/funding'} required />
                  <Button disabled={saving} type="submit" className="self-start">{saving ? 'Submitting…' : 'Submit sources'}</Button>
                  {notice && <p className="text-sm text-teal">{notice}</p>}
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="gap-2">
                <Label>One-off analysis</Label>
                <CardTitle>Analyse an opportunity now</CardTitle>
                <p className="text-sm text-muted-foreground">Paste one public opportunity page for an immediate relevance score, eligibility notes, and deadline. It will not be added to recurring monitoring.</p>
              </CardHeader>
              <CardContent>
                <form onSubmit={analyse} className="flex flex-col gap-3">
                  <Input type="url" value={analysisUrl} onChange={(event) => setAnalysisUrl(event.target.value)} placeholder="https://example.org/opportunity" required />
                  <Button disabled={analysing} type="submit" className="self-start">{analysing ? 'Analysing…' : 'Analyse URL'}</Button>
                  {analysis && (
                    <Alert variant={analysis.error ? 'destructive' : analysis.warning ? 'warning' : 'success'}>
                      <AlertDescription>
                        {analysis.error || `${analysis.title || 'Opportunity'} — ${analysis.recommended_action || 'Review'} · Due ${analysis.due_date || 'Not stated'}${analysis.warning ? ` — ${analysis.warning}` : ''}`}
                        {analysis.blockedUrl && <> <a className="font-semibold underline" href={analysis.blockedUrl} target="_blank" rel="noreferrer">Open official page ↗</a></>}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-muted-foreground">Opportunity analysis</h2>
              <b className="font-serif text-3xl">{data.count}</b>
              <p className="text-sm text-muted-foreground">Total matches</p>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-destructive not-italic" />High priority</span>
                    <span className="text-muted-foreground">{high}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-destructive" style={{ width: `${data.count ? high / data.count * 100 : 0}%` }} /></div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-teal not-italic" />Review queue</span>
                    <span className="text-muted-foreground">{Math.max(data.count - high, 0)}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-teal" style={{ width: `${data.count ? Math.max(data.count - high, 0) / data.count * 100 : 0}%` }} /></div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">Priority queue</h2>
              <div className="divide-y">
                {items.slice(0, 5).map((proposal, index) => (
                  <Link key={proposal.id} href={opportunityHref(proposal.id)} className="flex gap-3 py-3.5 text-foreground no-underline">
                    <strong className="text-xl font-bold text-muted/70">{index + 1}</strong>
                    <span className="min-w-0 text-sm font-semibold leading-snug">
                      <span className="line-clamp-3">{proposal.name}</span>
                      <small className="mt-1 block font-normal text-muted-foreground">{proposal.source}</small>
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
