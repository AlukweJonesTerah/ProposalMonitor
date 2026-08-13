'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const PAGE_SIZE = 6;
const SourceLink = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>;

function Paged({ items, empty, render }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  useEffect(() => { setPage(1); }, [items.length]);
  if (!items.length) return <p className="muted">{empty}</p>;
  return <><div className="sourceList">{items.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map(render)}</div>{pages > 1 && <div className="pagination"><button disabled={current === 1} onClick={() => setPage(current - 1)}>Previous</button><span>Page {current} of {pages}</span><button disabled={current === pages} onClick={() => setPage(current + 1)}>Next</button></div>}</>;
}

export default function SourceReview() {
  const [data, setData] = useState({ sources: [], recurring: [], analysed: [], discovered: [] });
  const [newUrl, setNewUrl] = useState('');
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');
  const [updating, setUpdating] = useState(false);
  const load = async () => {
    const response = await fetch('/api/sources', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not load submitted sources.');
    setData(result);
  };
  useEffect(() => { load().catch(() => { setMessageTone('error'); setMessage('Could not load submitted sources.'); }); }, []);
  const request = async (payload) => {
    if (updating) return;
    setUpdating(true);
    setMessage('');
    try {
      const response = await fetch('/api/sources', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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

  return <><header className="detailHeader"><div className="mast"><a className="logo" href="/"><span>PM</span><b>ProposalMonitor</b><small>Find the right opportunity. Move with confidence.</small></a><a className="sources" href="/sources/review">Source review</a></div><nav><a href="/">Dashboard</a><a href="/#opportunities">Opportunities</a><a href="/#opportunities">High priority</a><a href="/opportunities/history">Previous opportunities</a><a href="/#intake">Source intake</a><a href="/api/download">Download Excel</a></nav></header><main className="historyPage"><Link className="backLink" href="/">← Back to dashboard</Link><h1>Source review</h1><p>Manage the valid public links used by ProposalMonitor.</p>{message && <p className={`reviewNotice ${messageTone}`} role={messageTone === 'error' ? 'alert' : 'status'}>{message}</p>}<section className="sourceSection"><h2>Add a recurring source</h2><form className="sourceAdd" onSubmit={(event) => { event.preventDefault(); request({ operation: 'add', url: newUrl }); }}><input type="url" required value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="https://public-portal.example/opportunities" /><button>Add recurring link</button></form><small>Only safe public HTTP(S) links are accepted.</small></section><section className="sourceFilters"><label>Find a link<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search URL, website, category, or status" /></label><label>Show<select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All link types</option><option value="pending">Awaiting review</option><option value="recurring">Recurring links</option><option value="analysed">One-off analyses</option><option value="discovered">Agent discoveries</option></select></label></section>{showing('pending') && <section className="sourceSection"><h2>Awaiting review ({pending.length})</h2><Paged items={pending} empty="No sources awaiting review." render={(source) => <article key={source.url}><label>Submitted {new Date(source.submitted_at).toLocaleDateString()}</label><h3>{source.url}</h3><div className="reviewActions"><SourceLink href={source.url}>Visit website</SourceLink><button onClick={() => request({ url: source.url, action: 'approve' })}>Approve</button><button className="reject" onClick={() => request({ url: source.url, action: 'reject' })}>Reject</button></div></article>} /></section>}{showing('recurring') && <section className="sourceSection"><h2>Recurring monitored websites ({recurring.length})</h2><Paged items={recurring} empty="No recurring websites configured." render={(source) => { const url = source.start_urls?.[0]; return <article key={url}><label>{source.active ? 'Active recurring source' : 'Inactive'}</label><h3>{source.name}</h3><SourceLink href={url}>{url}</SourceLink><div className="reviewActions"><button onClick={() => edit(url)}>Edit link</button><button className="reject" onClick={() => request({ operation: 'delete', collection: 'recurring', url })}>Delete</button></div></article>; }} /></section>}{showing('analysed') && <section className="sourceSection"><h2>One-off links analysed ({analysed.length})</h2><Paged items={analysed} empty="Links you analyse individually will be listed here." render={(source) => <article key={source.url}><label>{source.category} · {source.relevance_score}</label><h3>{source.title}</h3><SourceLink href={source.url}>{source.url}</SourceLink><div className="reviewActions"><button className="reject" onClick={() => request({ operation: 'delete', collection: 'analysed', url: source.url })}>Delete</button></div></article>} /></section>}{showing('discovered') && <section className="sourceSection"><h2>Links found by public-web discovery ({discovered.length})</h2><Paged items={discovered} empty="No public-web discoveries yet. Enable public-web discovery to populate this section." render={(source) => <article key={source.link}><label>{source.category} · {source.relevance_score}</label><h3>{source.name}</h3><SourceLink href={source.link}>{source.link}</SourceLink></article>} /></section>}</main></>;
}
