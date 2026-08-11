import Link from 'next/link'; import AppHeader from '../../app-header'; import OpportunityBrowser from '../../opportunity-browser';
export default function HighPriority() { return <><AppHeader /><main className="historyPage"><Link className="backLink" href="/">← Back to dashboard</Link><h1>High-priority opportunities</h1><OpportunityBrowser highOnly /></main></>; }
