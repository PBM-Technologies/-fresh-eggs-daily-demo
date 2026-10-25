import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { friendlyError, getVisionAI, isPermanentOff, resetVisionAI, _internal } from '../ai/vision';
import { cleanBird, cleanEgg, cleanHealth, birdPrompt, eggPrompt, healthPrompt, relatedArticles } from '../ai/prompts';
import { possibleLayers } from '../screens/Identify';
import type { Bird } from '../contracts/domain';

const IMG_LIMITS = { images: { maxCount: 3, maxInputBytes: 20_000_000, mediaTypes: ['image/jpeg', 'image/png'] } };
type W = { claude?: unknown };
const w = window as unknown as W;

function fakeSample(opts: { limits?: unknown; limitsThrows?: boolean; json?: (...a: unknown[]) => Promise<unknown> } = {}) {
  return {
    limits: vi.fn(() => (opts.limitsThrows ? Promise.reject(new Error('x')) : Promise.resolve(opts.limits ?? IMG_LIMITS))),
    json: vi.fn(opts.json ?? (() => Promise.resolve({ ok: true }))),
  };
}

describe('getVisionAI adapter selection', () => {
  beforeEach(() => { resetVisionAI(); delete w.claude; vi.unstubAllEnvs(); });
  afterEach(() => { delete w.claude; resetVisionAI(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('returns null with no runtime and no endpoint', async () => {
    expect(await getVisionAI()).toBeNull();
  });
  it('uses the artifact runtime when sample has image limits, and does not call json on load', async () => {
    const s = fakeSample();
    const use = vi.fn(async (n: string) => (n === 'sample' ? s : null));
    w.claude = { use };
    const ai = await getVisionAI();
    expect(ai?.kind).toBe('claude');
    expect(use).toHaveBeenCalledWith('sample');
    expect(s.limits).toHaveBeenCalledTimes(1);
    expect(s.json).not.toHaveBeenCalled();
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    const ctl = new AbortController();
    await ai!.askJson('prompt', [blob], ctl.signal);
    expect(s.json).toHaveBeenCalledWith('prompt', { images: [blob], modelTier: 'default', signal: ctl.signal });
  });
  it('falls through when use("sample") is null, limits lack images, or limits rejects', async () => {
    w.claude = { use: async () => null };
    expect(await getVisionAI()).toBeNull();
    resetVisionAI();
    w.claude = { use: async () => fakeSample({ limits: { maxInputBytes: 1 } }) };
    expect(await getVisionAI()).toBeNull();
    resetVisionAI();
    w.claude = { use: async () => fakeSample({ limitsThrows: true }) };
    expect(await getVisionAI()).toBeNull();
    resetVisionAI();
    w.claude = { use: async () => { throw new Error('boom'); } };
    expect(await getVisionAI()).toBeNull();
  });
  it('uses the endpoint when VITE_AI_ENDPOINT is set and no runtime images are available', async () => {
    vi.stubEnv('VITE_AI_ENDPOINT', 'https://api.example.test/vision');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ a: 1 }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const ai = await getVisionAI();
    expect(ai?.kind).toBe('endpoint');
    expect(await ai!.askJson('p', [new Blob(['x'])])).toEqual({ a: 1 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.test/vision');
    const fd = init.body as FormData;
    expect(fd.get('prompt')).toBe('p');
    expect(fd.getAll('images[]')).toHaveLength(1);
  });
  it('prefers the runtime over the endpoint', async () => {
    vi.stubEnv('VITE_AI_ENDPOINT', 'https://api.example.test/vision');
    w.claude = { use: async () => fakeSample() };
    expect((await getVisionAI())?.kind).toBe('claude');
  });
  it('maps endpoint HTTP failures to friendly errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })));
    await expect(_internal.fromEndpoint('https://x.test')!.askJson('p', [])).rejects.toEqual({ code: 'rate_limited', message: 'Too many checks in a row. Try again in a bit.' });
  });
  it('turns sample rejections into friendly errors without retrying', async () => {
    const s = fakeSample({ json: () => Promise.reject({ code: 'image_rejected', message: 'dev text' }) });
    w.claude = { use: async () => s };
    const ai = await getVisionAI();
    await expect(ai!.askJson('p', [])).rejects.toEqual({ code: 'image_rejected', message: 'That photo could not be read. Try a different one.' });
    expect(s.json).toHaveBeenCalledTimes(1);
  });
});

describe('friendlyError', () => {
  it('maps every documented code', () => {
    for (const c of ['not_granted', 'sampling_disabled', 'images_unavailable', 'not_declared', 'capability_disabled']) {
      expect(friendlyError(c)).toBe('Photo checks are turned off for this view');
      expect(isPermanentOff(c)).toBe(true);
    }
    expect(friendlyError('rate_limited')).toBe('Too many checks in a row. Try again in a bit.');
    expect(friendlyError('image_rejected')).toBe('That photo could not be read. Try a different one.');
    expect(friendlyError('refused')).toBe('That photo could not be checked. Try a clearer photo of the bird.');
    for (const c of ['invalid_json', 'empty_completion', 'upstream_error', 'something_new', undefined]) expect(friendlyError(c)).toBe('Something went wrong. Try again.');
    expect(friendlyError('cancelled')).toBeNull();
    expect(isPermanentOff('rate_limited')).toBe(false);
  });
  it('never uses em dashes in copy', () => {
    for (const c of ['not_granted', 'rate_limited', 'image_rejected', 'refused', 'x']) expect(friendlyError(c)).not.toMatch(/—/);
  });
});

describe('prompts and sanitizers', () => {
  it('prompts include the breed list and safety rules', () => {
    expect(birdPrompt(1)).toContain('Barred Plymouth Rock');
    expect(birdPrompt(1)).toMatch(/Mixed breed and barnyard/);
    expect(eggPrompt(2)).toMatch(/cannot prove which hen/);
    const h = healthPrompt(2, ['Limping'], 'Buff Orpington');
    expect(h).toMatch(/bumblefoot/);
    expect(h).toMatch(/Never give medication/);
    expect(h).toMatch(/state veterinarian/);
    expect(h).toContain('Limping');
  });
  it('coerces junk model output into safe shapes', () => {
    const b = cleanBird({ topMatches: [{ breed: 'Silkie', confidence: 'certain' }, { nope: 1 }, { breed: 'A' }, { breed: 'B' }, { breed: 'C' }], sex: 'x' });
    expect(b.topMatches).toHaveLength(3);
    expect(b.topMatches[0].confidence).toBe('low');
    expect(b.sex).toBe('unsure');
    expect(b.isChicken).toBe(true);
    expect(cleanEgg({ eggColor: 'purple' }).eggColor).toBe('light brown');
    const h = cleanHealth({ urgency: 'now', possibleIssues: [{ name: 'Mites', likelihood: 'likely', checkAtHome: ['a', 3, ''], careSteps: 'no' }] });
    expect(h.urgency).toBe('soon');
    expect(h.possibleIssues[0].checkAtHome).toEqual(['a']);
    expect(h.possibleIssues[0].careSteps).toEqual([]);
    expect(cleanHealth(null).possibleIssues).toEqual([]);
  });
  it('suggests related articles', () => {
    expect(relatedArticles(['Mites'])).toEqual(expect.arrayContaining(['biosecurity', 'coop-cleaning']));
    expect(relatedArticles(['Molting'])).toContain('molting');
  });
  it('finds possible layers from the flock by egg color or breed', () => {
    const base = { householdId: 'h', flockId: 'f', createdAt: '', updatedAt: '', status: 'active' as const };
    const birds: Bird[] = [
      { ...base, id: '1', name: 'Olive', breed: 'Easter Egger' },
      { ...base, id: '2', name: 'Daisy', breed: 'Buff Orpington' },
      { ...base, id: '3', name: 'Gone', breed: 'Easter Egger', status: 'deceased' },
    ];
    const r = possibleLayers({ eggColor: 'green', likelyBreeds: [{ breed: 'Easter Egger', why: '' }], sizeGuess: 'unsure', notes: '' }, birds);
    expect(r.map((x) => x.bird.name)).toEqual(['Olive']);
  });
});
