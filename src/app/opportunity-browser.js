'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

  if (!all) return <p>Loading opportunities…</p>;

  return <>
    <section className="historyFilters" aria-label="Filter opportunities">
      <label>Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, source, or keyword" />
      </label>
      <label>Category
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      {highOnly ? <span className="fixedFilter">Priority: <b>High only</b></span> : <label>Priority
        <select value={priority} onChange={(event) => setPriority(event.target.value)}>
          <option value="">All priorities</option>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
      </label>}
      <button type="button" disabled={!hasFilters} onClick={clearFilters}>Clear filters</button>
      <span>{items.length} results</span>
    </section>
    {items.length ? <div className="historyList">
      {items.map((item) => <article key={item.id}>
        <label>{item.category} · {item.relevance_score}</label>
        <h2>{item.name}</h2>
        <p>{item.source} · Due {item.due_date}{item.keywords ? ` · Keywords: ${item.keywords}` : ''}</p>
        <Link href={`/opportunities/${item.id}`}>Read full summary →</Link>
      </article>)}
    </div> : <section className="historyEmpty"><h2>No opportunities match these filters</h2></section>}
  </>;
}
