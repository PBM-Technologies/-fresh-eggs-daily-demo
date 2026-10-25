import type { ShopCategory } from '../contracts/domain';

/**
 * Only the Fresh Eggs Daily home page is linked. Category deep links were not
 * verified during this build, so every tile opens the brand site where the
 * current catalog lives. Swap in exact collection URLs once confirmed.
 */
export const FED_SITE = 'https://www.fresheggsdaily.com';

export const SHOP_CATEGORIES: ShopCategory[] = [
  { slug: 'supplements', title: 'Supplements', blurb: 'Herbal and nutritional add-ins to support everyday flock health.', url: FED_SITE },
  { slug: 'treats', title: 'Treats and enrichment', blurb: 'Healthy snacks and boredom busters for curious hens.', url: FED_SITE },
  { slug: 'coop-care', title: 'Coop care', blurb: 'Nesting box and coop freshening products for a cleaner coop.', url: FED_SITE },
  { slug: 'chick-care', title: 'Chick care', blurb: 'Support for chicks from the brooder to the backyard.', url: FED_SITE },
];
