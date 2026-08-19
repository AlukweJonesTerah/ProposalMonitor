import OpportunitiesListPage from '@/components/opportunities-list-page';
import { PATHWAYS_BRAND } from '@/lib/brand';

export default function Page() {
  return <OpportunitiesListPage brand={PATHWAYS_BRAND} active="opportunities" title="All opportunities" />;
}
