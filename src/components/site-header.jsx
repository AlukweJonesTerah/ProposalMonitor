'use client';

import Link from 'next/link';
import { CalendarClock, Download, History, LayoutDashboard, ListChecks, Search, Send, ShieldCheck, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';

const NAV_ITEMS = [
  { key: 'dashboard', sub: '', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'opportunities', sub: '/opportunities', label: 'Opportunities', icon: ListChecks },
  { key: 'high-priority', sub: '/opportunities/high-priority', label: 'High priority', icon: Star },
  { key: 'history', sub: '/opportunities/history', label: 'Previous opportunities', icon: History },
  { key: 'source-intake', sub: '/sources/intake', label: 'Source intake', icon: Send },
];

export default function SiteHeader({ active = '', search, brand = PROPOSAL_MONITOR_BRAND }) {
  const home = brand.basePath || '/';
  const linkFor = (sub) => (sub === '' ? home : `${brand.basePath}${sub}`);

  return (
    <header className="border-t-[3px] border-t-foreground border-b bg-card">
      <div className="container flex h-[72px] items-center gap-6 md:h-[106px] md:gap-16">
        <Link href={home} className="relative flex shrink-0 items-center gap-2 text-foreground no-underline">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-icon font-bold text-primary-foreground md:h-[52px] md:w-[52px]">{brand.logoInitials}</span>
          <span className="flex flex-col">
            <b className="font-serif text-[22px] font-bold leading-none md:text-[28px]">{brand.name}</b>
            <small className="hidden text-xs text-muted-foreground md:absolute md:top-[63px] md:block">{brand.tagline}</small>
          </span>
        </Link>

        {search ? (
          <label className="hidden h-[43px] flex-1 items-center gap-2 rounded-xl border bg-background px-3 text-muted-foreground md:flex">
            <span className="sr-only">Search opportunities</span>
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder="Search opportunities, sources, or categories..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
        ) : (
          <div className="hidden flex-1 md:block" />
        )}

        <Link
          href={linkFor('/sources/review')}
          className="ml-auto hidden shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
        >
          <ShieldCheck className="h-4 w-4" />
          Source review
        </Link>
      </div>

      <nav className="no-scrollbar flex justify-start gap-1 overflow-x-auto border-t px-3 py-2 md:justify-center md:gap-2 md:px-5">
        {NAV_ITEMS.map(({ key, sub, label, icon: Icon }) => (
          <Link
            key={key}
            href={linkFor(sub)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:px-4',
              key === active && 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
        <a
          href={`${brand.apiBase}/calendar`}
          title="Subscribe in Google Calendar, Outlook, or Apple Calendar by pasting this link as a calendar subscription"
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:px-4"
        >
          <CalendarClock className="h-4 w-4 shrink-0" />
          Deadlines calendar
        </a>
        <a
          href={`${brand.apiBase}/download`}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:px-4"
        >
          <Download className="h-4 w-4 shrink-0" />
          Download Excel
        </a>
      </nav>
    </header>
  );
}
