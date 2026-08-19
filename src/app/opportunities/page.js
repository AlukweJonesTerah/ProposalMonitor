import OpportunitiesListPage from '@/components/opportunities-list-page';
import { PROPOSAL_MONITOR_BRAND } from '@/lib/brand';

export default function Page() {
  return <OpportunitiesListPage brand={PROPOSAL_MONITOR_BRAND} active="opportunities" title="All opportunities" />;
}
