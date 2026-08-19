'use client';

import Link from 'next/link';
import { Download, History, LayoutDashboard, ListChecks, Search, Send, ShieldCheck, Star } from 'lucide-react';

import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { key: 'dashboard', href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'opportunities', href: '/opportunities', label: 'Opportunities', icon: ListChecks },
  { key: 'high-priority', href: '/opportunities/high-priority', label: 'High priority', icon: Star },
  { key: 'history', href: '/opportunities/history', label: 'Previous opportunities', icon: History },
  { key: 'source-intake', href: '/sources/intake', label: 'Source intake', icon: Send },
  { key: 'download', href: '/api/download', label: 'Download Excel', icon: Download },
];

export default function SiteHeader({ active = '', search }) {
  return (
    <header className="border-t-[3px] border-t-foreground border-b bg-card">
      <div className="container flex h-[72px] items-center gap-6 md:h-[106px] md:gap-16">
        <Link href="/" className="relative flex shrink-0 items-center gap-2 text-foreground no-underline">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground md:h-[52px] md:w-[52px]">PM</span>
          <span className="flex flex-col">
            <b className="font-serif text-[22px] font-bold leading-none md:text-[28px]">ProposalMonitor</b>
            <small className="hidden text-xs text-muted-foreground md:absolute md:top-[63px] md:block">Find the right opportunity. Move with confidence.</small>
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
          href="/sources/review"
          className={cn(
            'ml-auto hidden shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex',
          )}
        >
          <ShieldCheck className="h-4 w-4" />
          Source review
        </Link>
      </div>

      <nav className="no-scrollbar flex justify-start gap-1 overflow-x-auto border-t px-3 py-2 md:justify-center md:gap-2 md:px-5">
        {NAV_ITEMS.map(({ key, href, label, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-muted-foreground no-underline transition-colors hover:bg-accent hover:text-accent-foreground md:px-4',
              key === active && 'bg-accent text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
