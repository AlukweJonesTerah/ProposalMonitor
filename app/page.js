'use client';

import { useState } from 'react';

export default function Home() {
  const [urls, setUrls] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [analysisUrl, setAnalysisUrl] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);

  async function submitSources(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the links.');
      setUrls('');
      setStatus(`${result.added} link${result.added === 1 ? '' : 's'} saved for review. They are not monitored until approved.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function analyseUrl(event) {
    event.preventDefault();
    setAnalysing(true);
    setAnalysis(null);
    try {
      const response = await fetch('/api/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: analysisUrl }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not analyse the link.');
      setAnalysis(result.analysis);
    } catch (error) {
      setAnalysis({ error: error.message });
    } finally {
      setAnalysing(false);
    }
  }

  return (
    <main className="page">
      <nav className="nav"><span className="brand"><span className="brandMark">P</span> Proposal Monitor</span><span className="navNote">Opportunity intelligence workspace</span></nav>
      <section className="hero"><div><p className="eyebrow">Proposal discovery &amp; delivery</p><h1>Never miss the right opportunity.</h1><p className="intro">Monitor proposal websites, track ownership, and keep your myGov alerts and content workflow in one place.</p></div><div className="nextRun"><span>myGov alert schedule</span><strong>Tuesday &amp; Thursday</strong><small>Configure SMTP details in <code>.env</code> to send alerts.</small></div></section>
      <section className="metrics" aria-label="Project summary"><article><span>Monitored sources</span><strong>4</strong><small>Paste more source links below for review.</small></article><article><span>Active keywords</span><strong>3</strong><small>Analytics · Data science · Training</small></article><article><span>Proposal tracker</span><strong>Excel</strong><small>Generated after every monitoring run.</small></article></section>
      <section className="workspace"><article className="panel wide"><div className="panelHeading"><div><p className="eyebrow">Getting started</p><h2>Launch checklist</h2></div><span className="tag">Olivia actions</span></div><ol className="checklist"><li><span>01</span><div><strong>Provide source websites</strong><p>Add proposal, tender, ministry, and donor portal links below.</p></div></li><li><span>02</span><div><strong>Confirm targeting keywords</strong><p>Review the Keywords sheet and add exclusion terms if needed.</p></div></li><li><span>03</span><div><strong>Set up alert recipients</strong><p>Add SMTP settings and <code>ALERT_EMAIL_TO</code> in <code>.env</code>.</p></div></li><li><span>04</span><div><strong>Connect the content folder</strong><p>Define approval and posting steps in the Content Calendar and Workflows sheets.</p></div></li></ol></article><aside className="panel commandPanel"><p className="eyebrow">Run monitor</p><h2>Generate the tracker</h2><p>The monitor exports <code>proposal_output/proposals.xlsx</code> with proposal, workplan, workflow, content, and source-register sheets.</p><pre><code>python proposal_monitor_runtime.py{`\n`}python proposal_monitor_runtime.py --mygov-alert</code></pre><p className="hint">Run the alert command on Tuesdays and Thursdays using Task Scheduler, cron, or your automation platform.</p></aside></section>
      <section className="panel sourcePanel"><div><p className="eyebrow">Source intake</p><h2>Paste proposal website links</h2><p>Paste one or more URLs, one per line or separated by commas. Links are saved for review and will not be scraped until a technical owner approves them.</p></div><form onSubmit={submitSources}><label htmlFor="source-urls">Proposal, tender, ministry, or donor links</label><textarea id="source-urls" value={urls} onChange={(event) => setUrls(event.target.value)} placeholder={'https://example.gov/tenders\nhttps://example.org/funding'} required /><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save links for review'}</button>{status && <p className="formStatus" role="status">{status}</p>}</form></section>
      <section className="panel analysisPanel"><div><p className="eyebrow">One-off analysis</p><h2>Analyse one opportunity</h2><p>Get an immediate Gemini scorecard without adding the link to recurring monitoring. HTML webpages are supported.</p></div><form onSubmit={analyseUrl}><label htmlFor="analysis-url">Opportunity webpage URL</label><input id="analysis-url" type="url" value={analysisUrl} onChange={(event) => setAnalysisUrl(event.target.value)} placeholder="https://example.org/opportunity" required /><button type="submit" disabled={analysing}>{analysing ? 'Analysing…' : 'Analyse opportunity'}</button></form>{analysis && (analysis.error ? <p className="formStatus">{analysis.error}</p> : <div className="scorecard"><strong>{analysis.title}</strong><span className="tag">{analysis.relevance_score || 'Unscored'}</span><p><b>Action:</b> {analysis.recommended_action}</p><p><b>Why it matches:</b> {analysis.match_reason}</p><p><b>Eligibility:</b> {analysis.eligibility_notes}</p><p><b>Due:</b> {analysis.due_date}</p></div>)}</section>
    </main>
  );
}
