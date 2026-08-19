'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import SiteHeader from '@/components/site-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function SourceIntake() {
  const [urls, setUrls] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const response = await fetch('/api/sources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls }) });
    const result = await response.json();
    setError(!response.ok);
    setNotice(response.ok ? `${result.added} source(s) submitted for review.` : result.error);
    if (response.ok) setUrls('');
  };

  return (
    <>
      <SiteHeader active="source-intake" />
      <main className="container max-w-[1040px] py-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary no-underline hover:underline"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link>
        <h1 className="mt-4 font-serif text-4xl font-bold tracking-tight">Source intake</h1>
        <p className="mt-2 text-muted-foreground">Submit public tender, donor, or ministry portals for review.</p>

        <Card className="mt-7">
          <CardContent className="pt-6">
            <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
              <Input value={urls} onChange={(event) => setUrls(event.target.value)} placeholder="https://public-portal.example/opportunities" required className="flex-1" />
              <Button type="submit">Submit source</Button>
            </form>
            {notice && (
              <Alert variant={error ? 'destructive' : 'success'} className="mt-4">
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            <Link href="/sources/review" className="mt-4 inline-block text-sm font-bold text-primary no-underline hover:underline">Review submitted sources →</Link>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
