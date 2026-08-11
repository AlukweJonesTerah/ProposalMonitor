'use client';

import { useEffect, useMemo, useState } from 'react';

const categories = ['Analytics', 'Data science', 'Training', 'Grant', 'Certification', 'Paper proposal', 'Other'];
const fmt = (value) => value && value !== 'Not stated' ? new Date(`${value}T00:00:00`).toLocaleDateString() : 'Not stated';

export default function Dashboard() {
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
    try { setData(await (await fetch('/api/results', { cache: 'no-store' })).json()); }
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
      const response = await fetch('/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setUrls(''); setNotice(`${result.added} source${result.added === 1 ? '' : 's'} submitted for review.`);
    } catch (error) { setNotice(error.message || 'Could not submit the sources.'); }
    finally { setSaving(false); }
  };

  const analyse = async (event) => {
    event.preventDefault(); setAnalysing(true); setAnalysis(null);
    try {
      const response = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: analysisUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setAnalysis({ ...result.analysis, warning: result.warning });
    } catch (error) { setAnalysis({ error: error.message || 'Could not analyse this URL.' }); }
    finally { setAnalysing(false); }
  };

  const clearFilters = () => { setQuery(''); setCategoryFilter(''); setPriorityFilter(''); };

  return <main>
    <header>
      <div className="mast">
        <a className="logo" href="#dashboard"><span>PM</span><b>ProposalMonitor</b><small>Find the right opportunity. Move with confidence.</small></a>
        <label className="search"><span className="srOnly">Search opportunities</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search opportunities, sources, or categories..." /></label>
        <a className="sources" href="/sources/review">Source review</a>
      </div>
      <nav><a className="active" href="#dashboard">Dashboard</a><a href="#opportunities">Opportunities</a><a href="#opportunities">High priority</a><a href="/opportunities/history">Previous opportunities</a><a href="#intake">Source intake</a><a href="/api/download">Download Excel</a></nav>
    </header>

    <div className="keywordStrip"><span>Monitoring for</span>{(data.keywords || []).map((keyword) => <b key={keyword}>{keyword}</b>)}</div>
    <div className="filterBar">
      <label>Find an opportunity <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, category, source, or keyword" /></label>
      <label>Category <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>Priority <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">All priorities</option><option>High</option><option>Medium</option><option>Low</option></select></label>
      <button disabled={!query && !categoryFilter && !priorityFilter} onClick={clearFilters}>Clear filters</button><span>{items.length} result{items.length === 1 ? '' : 's'}</span>
    </div>

    <div className="wrap" id="dashboard">
      <section className="main">
        <div className="lead">
          {lead ? <>
            <div className="leadText"><p><em>LEAD OPPORTUNITY</em> Updated {data.generated_at ? new Date(data.generated_at).toLocaleDateString() : 'today'}</p><h1>{lead.name}</h1><small>{lead.source} · {lead.category}</small><a className="readMore" href={`/opportunities/${lead.id}`}>Read full summary</a></div>
            <div className="covered"><label>OPPORTUNITY DETAILS</label><b>{lead.recommended_action || 'Review'}</b><p><strong>Deadline</strong>{fmt(lead.due_date)}</p><p><strong>Priority</strong>{lead.relevance_score || 'Unscored'}</p><p>{lead.match_reason || 'Open the opportunity to review its requirements and eligibility.'}</p><a className="proposalRedirect" href={lead.link} target="_blank" rel="noreferrer">View official proposal →</a></div>
          </> : <div className="blank"><h1>No opportunities match these filters</h1><p>Try another category or priority, or clear the filters to view every available opportunity.</p></div>}
        </div>
        <div className="lower">
          <section className="other" id="opportunities"><h2>Other opportunities <span>{items.length > 1 ? `${items.length - 1} more` : ''}</span></h2>{items.slice(1, 4).map((proposal) => <a className="mini" href={`/opportunities/${proposal.id}`} key={proposal.id}><label>{proposal.category}</label><b>{proposal.name}</b><small>{proposal.source} · Due {fmt(proposal.due_date)}</small></a>)}</section>
          <section className="ops"><article><label>LIVE PIPELINE</label><div><b>{data.count}</b><span>Matches<br />identified</span><b>{high}</b><span>High<br />priority</span></div></article><article><label>MONITOR STATUS</label><p><i></i>{loading ? 'Refreshing latest results' : 'Ready for review'}</p><small>{data.generated_at ? `Last updated ${new Date(data.generated_at).toLocaleString()}` : 'No result snapshot yet'}</small><button onClick={load}>Refresh dashboard</button></article></section>
        </div>
        <div className="actionRow">
          <section className="intake" id="intake"><div><label>RECURRING MONITORING</label><h2>Suggest a proposal website</h2><p>Add a tender, donor, or ministry portal for the team to review. Approved websites are checked in future monitor runs.</p></div><form onSubmit={submitSources}><textarea value={urls} onChange={(event) => setUrls(event.target.value)} placeholder={'https://example.gov/tenders\nhttps://example.org/funding'} required /><button disabled={saving}>{saving ? 'Submitting…' : 'Submit sources'}</button>{notice && <small>{notice}</small>}</form></section>
          <section className="intake analyzer"><div><label>ONE-OFF ANALYSIS</label><h2>Analyse an opportunity now</h2><p>Paste one public opportunity page for an immediate relevance score, eligibility notes, and deadline. It will not be added to recurring monitoring.</p></div><form onSubmit={analyse}><input type="url" value={analysisUrl} onChange={(event) => setAnalysisUrl(event.target.value)} placeholder="https://example.org/opportunity" required /><button disabled={analysing}>{analysing ? 'Analysing…' : 'Analyse URL'}</button>{analysis && <small className={analysis.error ? 'error' : analysis.warning ? 'warning' : ''}>{analysis.error || `${analysis.title || 'Opportunity'} — ${analysis.recommended_action || 'Review'} · Due ${analysis.due_date || 'Not stated'}${analysis.warning ? ` — ${analysis.warning}` : ''}`}</small>}</form></section>
        </div>
      </section>
      <aside><section className="rail"><h2>OPPORTUNITY ANALYSIS</h2><b className="big">{data.count}</b><p>Total Matches</p><div className="bar"><label>High priority <span>{high}</span></label><b><i className="red" style={{ width: `${data.count ? high / data.count * 100 : 0}%` }} /></b></div><div className="bar"><label>Review queue <span>{Math.max(data.count - high, 0)}</span></label><b><i className="teal" style={{ width: `${data.count ? Math.max(data.count - high, 0) / data.count * 100 : 0}%` }} /></b></div></section><section className="rail trending"><h2>PRIORITY QUEUE</h2>{items.slice(0, 5).map((proposal, index) => <a href={`/opportunities/${proposal.id}`} key={proposal.id}><strong>{index + 1}</strong><span>{proposal.name}<small>{proposal.source}</small></span></a>)}</section></aside>
    </div>
  </main>;
}
