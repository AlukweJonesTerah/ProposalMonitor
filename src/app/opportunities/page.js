import Link from 'next/link'; import AppHeader from '../app-header'; import OpportunityBrowser from '../opportunity-browser';
export default function Opportunities() { return <><AppHeader /><main className="historyPage"><Link className="backLink" href="/">← Back to dashboard</Link><h1>All opportunities</h1><OpportunityBrowser /></main></>; }
