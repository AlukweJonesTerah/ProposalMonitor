'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/site-header';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function HistoryPage({ brand = PROPOSAL_MONITOR_BRAND }) {
  const [data, setData] = useState(null);
  const [name, setName] = useState(''); const [category, setCategory] = useState(''); const [source, setSource] = useState(''); const [keywords, setKeywords] = useState(''); const [priority, setPriority] = useState(''); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState('');
  useEffect(() => { fetch(`${brand.apiBase}/history`, { cache: 'no-store' }).then((response) => response.json()).then(setData).catch(() => setData({ proposals: [] })); }, [brand.apiBase]);
  const proposals = data?.proposals || [];
  const categories = [...new Set(proposals.map((item) => item.category).filter(Boolean))].sort();
  const filtered = useMemo(() => proposals.filter((item) => {
    const due = item.due_date || ''; const archived = item.archived_at?.slice(0, 10) || '';
    return (!name || item.name?.toLowerCase().includes(name.toLowerCase())) && (!category || item.category === category) && (!source || item.source?.toLowerCase().includes(source.toLowerCase())) && (!keywords || item.keywords?.toLowerCase().includes(keywords.toLowerCase())) && (!priority || item.relevance_score === priority) && (!fromDate || due >= fromDate || archived >= fromDate) && (!toDate || (due && due <= toDate) || (archived && archived <= toDate));
  }), [proposals, name, category, source, keywords, priority, fromDate, toDate]);
  const clear = () => { setName(''); setCategory(''); setSource(''); setKeywords(''); setPriority(''); setFromDate(''); setToDate(''); };
  const filteredActive = Boolean(name || category || source || keywords || priority || fromDate || toDate);

  return (
    <>
      <SiteHeader active="history" brand={brand} />
      <main className="container max-w-[1040px] py-10">
        <Link href={brand.basePath || '/'} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight">Previous opportunities</h1>
        <p className="mt-2 text-muted-foreground">Expired opportunities are retained here for reference; they are no longer shown as active opportunities.</p>

        {!data ? <p className="mt-8 text-sm text-muted-foreground">Loading previous opportunities…</p> : (
          <>
            <Card className="mt-7">
              <CardContent className="flex flex-wrap items-end gap-3 pt-6">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Search proposal name" className="min-w-[170px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select value={category || 'all'} onValueChange={(value) => setCategory(value === 'all' ? '' : value)}>
                    <SelectTrigger className="min-w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Source</Label>
                  <Input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Search source" className="min-w-[150px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Keywords</Label>
                  <Input value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="Search keywords" className="min-w-[150px]" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Priority</Label>
                  <Select value={priority || 'all'} onValueChange={(value) => setPriority(value === 'all' ? '' : value)}>
                    <SelectTrigger className="min-w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All priorities</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>From date</Label>
                  <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>To date</Label>
                  <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                </div>
                <Button type="button" variant="outline" disabled={!filteredActive} onClick={clear}>Clear filters</Button>
                <span className="pb-2 text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
              </CardContent>
            </Card>

            {filtered.length ? (
              <div className="mt-6 grid gap-3.5">
                {filtered.map((item) => (
                  <Card key={item.link}>
                    <CardContent className="pt-6">
                      <Badge variant="muted" className="mb-2">{item.category} · {item.relevance_score || 'Unscored'} · closed {item.due_date}</Badge>
                      <h2 className="font-serif text-xl font-bold leading-snug">{item.name}</h2>
                      <p className="mt-1.5 text-sm text-muted-foreground">{item.source}{item.keywords ? ` · Keywords: ${item.keywords}` : ''}{item.archived_at ? ` · Archived ${new Date(item.archived_at).toLocaleString()}` : ''}</p>
                      <a href={item.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-bold text-primary no-underline hover:underline">Open official source →</a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <h2 className="font-serif text-xl font-bold">{proposals.length ? 'No opportunities match these filters' : 'No previous opportunities yet'}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{proposals.length ? 'Clear or change the filters to see other archived opportunities.' : 'Opportunities will appear here automatically after their deadline has passed.'}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </>
  );
}
