export default function AppHeader() {
  return <header className="detailHeader"><div className="mast"><a className="logo" href="/"><span>PM</span><b>ProposalMonitor</b><small>Find the right opportunity. Move with confidence.</small></a><a className="sources" href="/sources/review">Source review</a></div><nav><a href="/">Dashboard</a><a href="/opportunities">Opportunities</a><a href="/opportunities/high-priority">High priority</a><a href="/opportunities/history">Previous opportunities</a><a href="/sources/intake">Source intake</a><a href="/api/download">Download Excel</a></nav></header>;
}
