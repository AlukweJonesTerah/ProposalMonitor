import OpportunityDetailPage from '@/components/opportunity-detail-page';
import { PATHWAYS_BRAND } from '@/lib/brand';

export default function Page({ params }) {
  return <OpportunityDetailPage brand={PATHWAYS_BRAND} id={params.id} />;
}
