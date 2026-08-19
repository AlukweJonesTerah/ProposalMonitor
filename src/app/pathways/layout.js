import { PATHWAYS_BRAND } from '@/lib/brand';

export const metadata = {
  title: PATHWAYS_BRAND.name,
  description: `${PATHWAYS_BRAND.name} proposal opportunity intelligence workspace — ${PATHWAYS_BRAND.tagline}`,
};

export default function PathwaysLayout({ children }) {
  return <div data-brand="pathways" className="contents">{children}</div>;
}
