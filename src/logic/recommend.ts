import type { Bird, Breed, EggColor } from '../contracts/domain';
import { eggColorLabel, findBreed, GUIDE_BREEDS } from '../content/breeds';

export type Climate = 'cold' | 'hot' | 'both' | 'mild';
export type Goal = 'eggs' | 'colors' | 'kids' | 'broody' | 'rare';
export type Space = 'small' | 'free';
export interface RecommendPrefs { climate: Climate; goal: Goal; space: Space }
export interface Recommendation { breed: Breed; score: number; reasons: string[] }

/** How many hens of one breed before we stop suggesting more of it. */
export const ENOUGH_OF_A_BREED = 3;

export interface FlockProfile {
  /** Active birds matched to guide breeds, grouped by slug. */
  bySlug: Map<string, Bird[]>;
  eggColors: Set<EggColor>;
  /** Names of active hens with calm or friendly breeds. */
  gentleHens: string[];
}

export function flockProfile(birds: Bird[]): FlockProfile {
  const bySlug = new Map<string, Bird[]>();
  const eggColors = new Set<EggColor>();
  const gentleHens: string[] = [];
  for (const bird of birds) {
    if (bird.status !== 'active') continue;
    const br = findBreed(bird.breed);
    if (!br) continue;
    bySlug.set(br.slug, [...(bySlug.get(br.slug) ?? []), bird]);
    eggColors.add(br.eggColor);
    if (br.temperament === 'calm' || br.temperament === 'friendly') gentleHens.push(bird.name);
  }
  return { bySlug, eggColors, gentleHens };
}

const avgEggs = (b: Breed) => (b.eggsPerYear[0] + b.eggsPerYear[1]) / 2;
const gentle = (b: Breed) => b.temperament === 'calm' || b.temperament === 'friendly';
const listNames = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and others`);

/** Scores one breed for these preferences and this flock. Pure. Returns null when the breed should be skipped. */
export function scoreBreed(b: Breed, prefs: RecommendPrefs, flock: FlockProfile): Recommendation | null {
  const have = flock.bySlug.get(b.slug) ?? [];
  if (have.length >= ENOUGH_OF_A_BREED) return null;
  let score = 0;
  const reasons: string[] = [];

  // Goal carries the most weight.
  switch (prefs.goal) {
    case 'eggs': {
      const avg = avgEggs(b);
      score += (avg - 180) / 15;
      if (avg >= 240) reasons.push(`Lays about ${b.eggsPerYear[0]} to ${b.eggsPerYear[1]} eggs a year`);
      break;
    }
    case 'colors': {
      if (!flock.eggColors.has(b.eggColor)) {
        score += b.eggColor === 'white' || b.eggColor === 'light brown' || b.eggColor === 'brown' ? 4 : 7;
        reasons.push(`Adds ${eggColorLabel(b.eggColor).toLowerCase()} eggs to your basket`);
      } else score -= 3;
      break;
    }
    case 'kids': {
      if (b.goodWithKids && gentle(b)) { score += 6; reasons.push('Calm and gentle with kids'); }
      else if (b.temperament === 'flighty') score -= 6;
      else if (!b.goodWithKids) score -= 3;
      break;
    }
    case 'broody': {
      if (b.broody === 'high') { score += 7; reasons.push('Often goes broody and raises chicks'); }
      else if (b.broody === 'medium') score += 2;
      else score -= 4;
      break;
    }
    case 'rare': {
      if (b.uncommon) { score += 4; reasons.push('A less common breed you will not see in every backyard'); }
      if (b.crestOrBeard || b.featherFeet || b.purpose === 'ornamental') {
        score += 2;
        reasons.push(b.featherFeet && b.crestOrBeard ? 'Fancy feathers from beard to feet' : b.featherFeet ? 'Feathered feet stand out' : b.crestOrBeard ? 'Eye-catching crest or beard' : 'Kept for its looks');
      }
      break;
    }
  }

  // Climate.
  const cold = b.coldHardy;
  const hot = b.heatTolerant;
  if (prefs.climate === 'cold' || prefs.climate === 'both') {
    score += (cold - 2) * 3;
    if (cold === 3) reasons.push('Handles cold winters');
  }
  if (prefs.climate === 'hot' || prefs.climate === 'both') {
    score += (hot - 2) * 3;
    if (hot === 3) reasons.push('Copes well with hot summers');
  }

  // Space.
  if (prefs.space === 'small') {
    if (b.confinementTolerant) { score += 2; reasons.push('Does fine in a smaller run'); }
    else score -= 5;
  } else {
    score += b.foraging - 2;
    if (b.foraging === 3) reasons.push('Loves to free range and forage');
  }

  // Flock fit.
  if (have.length > 0) {
    score -= 2 + have.length * 2;
    reasons.push(`You already have ${listNames(have.map((h) => h.name))}; another would keep her company`);
  } else if (flock.gentleHens.length > 0 && gentle(b)) {
    score += 1;
    reasons.push(`Easygoing like ${listNames(flock.gentleHens)}, so she should fit in`);
  }
  if (b.goodForBeginners) score += 0.5;

  return { breed: b, score: Math.round(score * 10) / 10, reasons: reasons.slice(0, 4) };
}

/** Ranks every guide breed for the given preferences and flock. */
export function recommendBreeds(prefs: RecommendPrefs, birds: Bird[], limit = 5, breeds: Breed[] = GUIDE_BREEDS): Recommendation[] {
  const flock = flockProfile(birds);
  return breeds
    .map((b) => scoreBreed(b, prefs, flock))
    .filter((r): r is Recommendation => r !== null)
    .sort((a, b) => b.score - a.score || a.breed.name.localeCompare(b.breed.name))
    .slice(0, limit);
}
