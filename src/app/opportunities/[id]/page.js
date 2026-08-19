import OpportunityDetailPage from '@/components/opportunity-detail-page';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';

export default function Page({ params }) {
  return <OpportunityDetailPage brand={PROPOSAL_MONITOR_BRAND} id={params.id} />;
}
