import { describe, expect, it } from 'vitest';
import { BREEDS, EGG_COLORS, findBreed, GUIDE_BREEDS } from '../content/breeds';
import { ENOUGH_OF_A_BREED, flockProfile, recommendBreeds, scoreBreed, type RecommendPrefs } from '../logic/recommend';
import type { Bird } from '../contracts/domain';

const base = { householdId: 'h', flockId: 'f', createdAt: '', updatedAt: '', status: 'active' as const };
const hen = (id: string, name: string, breed: string, status: Bird['status'] = 'active'): Bird => ({ ...base, id, name, breed, status });
const SAMPLE: Bird[] = [hen('1', 'Daisy', 'Buff Orpington'), hen('2', 'Pepper', 'Barred Rock'), hen('3', 'Olive', 'Easter Egger')];
const slugs = (r: { breed: { slug: string } }[]) => r.map((x) => x.breed.slug);

describe('breed guide content', () => {
  it('has 40+ breeds with unique slugs and complete, valid data', () => {
    expect(GUIDE_BREEDS.length).toBeGreaterThanOrEqual(40);
    expect(new Set(GUIDE_BREEDS.map((b) => b.slug)).size).toBe(GUIDE_BREEDS.length);
    const colors = EGG_COLORS.map((c) => c.value);
    for (const b of GUIDE_BREEDS) {
      expect(colors).toContain(b.eggColor);
      expect(b.eggsPerYear[0]).toBeLessThanOrEqual(b.eggsPerYear[1]);
      expect(b.goodToKnow.length).toBeGreaterThanOrEqual(2);
      expect(b.goodToKnow.length).toBeLessThanOrEqual(4);
      expect(b.description.length).toBeGreaterThan(40);
      expect(JSON.stringify(b)).not.toMatch(/—/);
    }
  });
  it('maps sample flock and form breeds through aliases', () => {
    expect(findBreed('Barred Rock')?.slug).toBe('barred-plymouth-rock');
    expect(findBreed('barred rocks')?.slug).toBe('barred-plymouth-rock');
    expect(findBreed('Buff Orpington')?.slug).toBe('buff-orpington');
    expect(findBreed('Easter Egger')?.slug).toBe('easter-egger');
    expect(findBreed('Isa Brown')?.slug).toBe('isa-brown');
    expect(findBreed('Turken')?.slug).toBe('naked-neck');
    expect(findBreed('Mixed')).toBeUndefined();
    expect(findBreed(undefined)).toBeUndefined();
    // every hen form choice except Mixed/Sapphire Gem resolves to a guide entry
    const unresolved = BREEDS.filter((b) => !findBreed(b));
    expect(unresolved.sort()).toEqual(['Mixed', 'Sapphire Gem']);
  });
});

describe('flockProfile', () => {
  it('collects egg colors and gentle hens from active birds only', () => {
    const p = flockProfile([...SAMPLE, hen('4', 'Ghost', 'Cream Legbar', 'deceased'), hen('5', 'Mutt', 'Mixed')]);
    expect([...p.eggColors].sort()).toEqual(['green', 'light brown']);
    expect(p.bySlug.get('barred-plymouth-rock')?.map((b) => b.name)).toEqual(['Pepper']);
    expect(p.bySlug.has('cream-legbar')).toBe(false);
    expect(p.gentleHens).toEqual(['Daisy', 'Pepper', 'Olive']);
  });
});

describe('recommendBreeds', () => {
  const P = (x: Partial<RecommendPrefs>): RecommendPrefs => ({ climate: 'mild', goal: 'eggs', space: 'free', ...x });

  it('returns 5 by default, sorted by score, each with reasons', () => {
    const r = recommendBreeds(P({}), []);
    expect(r).toHaveLength(5);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    for (const x of r) expect(x.reasons.length).toBeGreaterThan(0);
  });
  it('more eggs favors high production layers', () => {
    const r = recommendBreeds(P({ goal: 'eggs' }), []);
    for (const x of r) expect(x.breed.eggsPerYear[1]).toBeGreaterThanOrEqual(280);
    expect(r[0].reasons.some((s) => /eggs a year/.test(s))).toBe(true);
  });
  it('colors goal adds egg colors missing from the flock', () => {
    const r = recommendBreeds(P({ goal: 'colors' }), SAMPLE);
    for (const x of r) expect(['green', 'light brown']).not.toContain(x.breed.eggColor);
    expect(r.some((x) => x.reasons.some((s) => /^Adds (blue|olive|dark brown|pink tint|cream|speckled) eggs to your basket$/.test(s)))).toBe(true);
    // a flock with no blue layer should see a blue layer near the top
    expect(r.slice(0, 5).some((x) => x.breed.eggColor === 'blue' || x.breed.eggColor === 'olive' || x.breed.eggColor === 'dark brown')).toBe(true);
  });
  it('colors goal penalizes colors already in the basket', () => {
    const flock = flockProfile(SAMPLE);
    const ee = GUIDE_BREEDS.find((b) => b.slug === 'olive-egger')!;
    const greenish = GUIDE_BREEDS.find((b) => b.slug === 'easter-egger')!;
    expect(scoreBreed(ee, P({ goal: 'colors' }), flock)!.score).toBeGreaterThan(scoreBreed(greenish, P({ goal: 'colors' }), flock)!.score);
  });
  it('kids goal never suggests flighty breeds and says why', () => {
    const r = recommendBreeds(P({ goal: 'kids' }), [], 10);
    for (const x of r) { expect(x.breed.temperament).not.toBe('flighty'); expect(x.breed.goodWithKids).toBe(true); }
    expect(r[0].reasons).toContain('Calm and gentle with kids');
  });
  it('cold climate favors cold hardy breeds, hot favors heat tolerant', () => {
    for (const x of recommendBreeds(P({ climate: 'cold', goal: 'kids' }), [])) expect(x.breed.coldHardy).toBe(3);
    expect(recommendBreeds(P({ climate: 'cold' }), [])[0].reasons).toContain('Handles cold winters');
    for (const x of recommendBreeds(P({ climate: 'hot' }), [])) expect(x.breed.heatTolerant).toBeGreaterThanOrEqual(2);
    const hot = recommendBreeds(P({ climate: 'hot' }), []);
    expect(hot.filter((x) => x.breed.heatTolerant === 3).length).toBeGreaterThanOrEqual(3);
    expect(hot.some((x) => x.reasons.includes('Copes well with hot summers'))).toBe(true);
  });
  it('both climates prefer birds that handle cold and heat', () => {
    for (const x of recommendBreeds(P({ climate: 'both', goal: 'kids' }), [])) expect(x.breed.coldHardy + x.breed.heatTolerant).toBeGreaterThanOrEqual(5);
  });
  it('small space favors confinement tolerant breeds', () => {
    for (const x of recommendBreeds(P({ space: 'small', goal: 'eggs' }), [], 8)) expect(x.breed.confinementTolerant).toBe(true);
    const free = recommendBreeds(P({ space: 'free', goal: 'eggs' }), [], 8);
    expect(free.some((x) => !x.breed.confinementTolerant)).toBe(true);
  });
  it('broody goal favors high broody breeds', () => {
    const r = recommendBreeds(P({ goal: 'broody' }), []);
    for (const x of r) expect(x.breed.broody).toBe('high');
    expect(r[0].reasons).toContain('Often goes broody and raises chicks');
  });
  it('rare goal favors uncommon or fancy breeds', () => {
    for (const x of recommendBreeds(P({ goal: 'rare' }), [])) expect(x.breed.uncommon || x.breed.featherFeet || x.breed.crestOrBeard).toBe(true);
  });
  it('down-ranks breeds already in the flock and skips ones with enough hens', () => {
    const prefs = P({ goal: 'broody', climate: 'cold' });
    const none = recommendBreeds(prefs, [], 50);
    const withDaisy = recommendBreeds(prefs, SAMPLE, 50);
    const rank = (r: typeof none, s: string) => slugs(r).indexOf(s);
    expect(rank(withDaisy, 'buff-orpington')).toBeGreaterThan(rank(none, 'buff-orpington'));
    const daisyRec = withDaisy.find((x) => x.breed.slug === 'buff-orpington')!;
    expect(daisyRec.reasons.some((s) => s.includes('You already have Daisy'))).toBe(true);
    const many = Array.from({ length: ENOUGH_OF_A_BREED }, (_, i) => hen('b' + i, 'Buff ' + i, 'Buff Orpington'));
    expect(slugs(recommendBreeds(prefs, many, 100))).not.toContain('buff-orpington');
  });
  it('references gentle flockmates in reasons', () => {
    const r = recommendBreeds(P({ goal: 'kids' }), SAMPLE);
    expect(r.some((x) => x.reasons.some((s) => /Easygoing like Daisy, Pepper and others/.test(s)))).toBe(true);
  });
  it('is deterministic and caps reasons at 4', () => {
    const a = recommendBreeds(P({ goal: 'colors', climate: 'both', space: 'small' }), SAMPLE);
    const b = recommendBreeds(P({ goal: 'colors', climate: 'both', space: 'small' }), SAMPLE);
    expect(slugs(a)).toEqual(slugs(b));
    for (const x of a) expect(x.reasons.length).toBeLessThanOrEqual(4);
  });
});
