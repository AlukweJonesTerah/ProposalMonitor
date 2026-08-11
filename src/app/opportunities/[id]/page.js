'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const categories = ['Analytics', 'Data science', 'Training', 'Grant', 'Certification', 'Paper proposal', 'Other'];

export default function OpportunityDetail({ params }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/results', { cache: 'no-store' }).then((response) => response.json()).then(setData).catch(() => setError('The opportunity details could not be loaded.'));
  }, []);

  if (error) return <main className="detailPage"><p>{error}</p></main>;
  if (!data) return <main className="detailPage"><p>Loading opportunity…</p></main>;
  const opportunity = data.proposals.find((item) => item.id === params.id);
  if (!opportunity) return <main className="detailPage"><h1>Opportunity not found</h1><Link href="/">Return to dashboard</Link></main>;
  const others = data.proposals.filter((item) => item.id !== opportunity.id).slice(0, 6);

  return <>
    <header className="detailHeader"><div className="mast"><a className="logo" href="/"><span>PM</span><b>ProposalMonitor</b><small>Find the right opportunity. Move with confidence.</small></a><a className="sources" href="/sources/review">Source review</a></div><nav><a href="/">Dashboard</a><a href="/#opportunities">Opportunities</a><a href="/#opportunities">High priority</a><a href="/opportunities/history">Previous opportunities</a><a href="/#intake">Source intake</a><a href="/api/download">Download Excel</a></nav></header>
    <main className="detailPage">
    <Link className="backLink" href="/">← Back to dashboard</Link>
    <article className="detailCard">
      <p className="eyebrow">{opportunity.category} opportunity</p><h1>{opportunity.name}</h1>
      <p className="detailMeta">{opportunity.source} · Deadline: {opportunity.due_date || 'Not stated'} · {opportunity.relevance_score || 'Unscored'} relevance</p>
      <section><h2>Summary</h2><p>{opportunity.match_reason || 'Review the source document to confirm the scope and fit.'}</p></section>
      <section><h2>Eligibility and fit</h2><p>{opportunity.eligibility_notes || 'Check the source requirements before applying.'}</p></section>
      <section><h2>How to apply</h2><ol><li>Open the official opportunity page or document.</li><li>Confirm eligibility, scope, closing date, required documents, and submission channel.</li><li>Prepare the required technical and financial/application materials.</li><li>Submit through the official portal or the instructions on the source page before the deadline.</li></ol></section>
      <a className="sourceButton" href={opportunity.link} target="_blank" rel="noreferrer">Open official source and apply →</a>
    </article>
    <aside className="categoryCard">
      <h2>Available categories</h2><div>{categories.map((category) => <span key={category}>{category}</span>)}</div>
      <h2 className="moreTitle">More opportunities</h2>
      {others.length ? <div className="relatedList">{others.map((item) => <Link href={`/opportunities/${item.id}`} key={item.id}><small>{item.category} · {item.relevance_score || 'Review'}</small><b>{item.name}</b><em>Due {item.due_date || 'Not stated'}</em></Link>)}</div> : <p className="muted">New opportunities will appear here after the next monitor update.</p>}
    </aside>
    </main>
  </>;
}
