'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function OpportunityBrowser({ highOnly = false }) {
  const [all, setAll] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState(highOnly ? 'High' : '');

  useEffect(() => {
    fetch('/api/results', { cache: 'no-store' })
      .then((response) => response.json())
      .then((results) => setAll(results.proposals || []));
  }, []);

  const items = useMemo(() => {
    if (!all) return [];
    const search = query.trim().toLowerCase();

    return all.filter((proposal) =>
      (!highOnly || proposal.relevance_score === 'High') &&
      (!search || `${proposal.name} ${proposal.source} ${proposal.keywords}`.toLowerCase().includes(search)) &&
      (!category || proposal.category === category) &&
      (!priority || proposal.relevance_score === priority),
    );
  }, [all, query, category, priority, highOnly]);

  const categories = [...new Set((all || []).map((proposal) => proposal.category))].filter(Boolean);
  const hasFilters = Boolean(query || category || (!highOnly && priority));

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    if (!highOnly) setPriority('');
  };

  if (!all) return <p className="text-sm text-muted-foreground">Loading opportunities…</p>;

  return (
    <>
      <Card className="mt-7">
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="grid gap-1.5">
            <Label>Search</Label>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, source, or keyword" className="min-w-[220px]" />
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={category || 'all'} onValueChange={(value) => setCategory(value === 'all' ? '' : value)}>
              <SelectTrigger className="min-w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {highOnly ? (
            <span className="self-end rounded-md border px-3 py-2 text-sm text-muted-foreground">Priority: <b className="text-foreground">High only</b></span>
          ) : (
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={priority || 'all'} onValueChange={(value) => setPriority(value === 'all' ? '' : value)}>
                <SelectTrigger className="min-w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="button" variant="outline" disabled={!hasFilters} onClick={clearFilters}>Clear filters</Button>
          <span className="pb-2 text-xs text-muted-foreground">{items.length} results</span>
        </CardContent>
      </Card>

      {items.length ? (
        <div className="mt-6 grid gap-3.5">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="pt-6">
                <Badge variant="muted" className="mb-2">{item.category} · {item.relevance_score}</Badge>
                <h2 className="font-serif text-xl font-bold leading-snug">{item.name}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.source} · Due {item.due_date}{item.keywords ? ` · Keywords: ${item.keywords}` : ''}</p>
                <Link href={`/opportunities/${item.id}`} className="mt-3 inline-block text-sm font-bold text-primary no-underline hover:underline">Read full summary →</Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-6">
          <CardContent className="pt-6">
            <h2 className="font-serif text-xl font-bold">No opportunities match these filters</h2>
          </CardContent>
        </Card>
      )}
    </>
  );
}
