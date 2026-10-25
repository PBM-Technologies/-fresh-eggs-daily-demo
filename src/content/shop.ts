import type { ShopCategory } from '../contracts/domain';

/**
 * Links point at the official Fresh Eggs Daily shop. Only URLs confirmed on
 * fresheggsdailyshop.com are used; categories without their own collection
 * open the full catalog.
 */
export const FED_SITE = 'https://fresheggsdailyshop.com';
export const FED_ALL = FED_SITE + '/collections/all';
export const FED_TREATS = FED_SITE + '/collections/treats';
export const FED_COOP = FED_SITE + '/collections/all-products/products/coop-confetti-nesting-herbs-8-oz-1';
export const FED_STORE_LOCATOR = FED_SITE + '/pages/store-locator';

export const SHOP_CATEGORIES: ShopCategory[] = [
  { slug: 'supplements', title: 'Supplements', blurb: 'Herbal and nutritional add-ins to support everyday flock health.', url: FED_ALL },
  { slug: 'treats', title: 'Treats and enrichment', blurb: 'Healthy snacks and boredom busters for curious hens.', url: FED_TREATS },
  { slug: 'coop-care', title: 'Coop care', blurb: 'Nesting box and coop freshening products for a cleaner coop.', url: FED_COOP },
  { slug: 'chick-care', title: 'Chick care', blurb: 'Support for chicks from the brooder to the backyard.', url: FED_ALL },
];
