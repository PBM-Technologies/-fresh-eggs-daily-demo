import type { BirdIdResult, Confidence, EggColor, EggIdResult, EggSizeGuess, HealthCheckResult, Likelihood, Urgency } from '../contracts/domain';
import { EGG_COLORS, GUIDE_BREEDS } from '../content/breeds';

const breedList = () => GUIDE_BREEDS.map((b) => b.name).join(', ');

export function birdPrompt(photoCount: number): string {
  return [
    `You are helping a backyard chicken keeper identify a bird from ${photoCount === 1 ? 'a photo' : `${photoCount} photos of the same bird`}.`,
    'Reply with only JSON in exactly this shape:',
    '{"isChicken": boolean, "topMatches": [{"breed": string, "confidence": "high"|"medium"|"low", "why": string}], "sex": "hen"|"rooster"|"unsure", "ageGuess": string, "notes": string}',
    'Rules:',
    '- topMatches has at most 3 entries, best first. Use breed names from this list whenever one fits: ' + breedList() + '.',
    '- Mixed breed and barnyard birds are very common. If the bird looks mixed, say so plainly, use "Mixed" as a breed, and mention which breeds it may carry.',
    '- Be honest about uncertainty. Use "low" confidence when the photo is unclear or features are ambiguous. Never claim certainty you do not have.',
    '- "why" is one short sentence naming visible features (comb, feather pattern, leg color, earlobes, size).',
    '- ageGuess is a short phrase like "young pullet, about 3 to 5 months" or "adult".',
    '- If it is not a chicken, set isChicken false, leave topMatches empty and explain in notes.',
    '- Plain everyday language, no dashes as punctuation.',
  ].join('\n');
}

export function eggPrompt(photoCount: number): string {
  return [
    `You are helping a backyard chicken keeper with ${photoCount === 1 ? 'a photo of an egg' : `${photoCount} photos of an egg`}.`,
    'Reply with only JSON in exactly this shape:',
    '{"eggColor": ' + EGG_COLORS.map((c) => `"${c.value}"`).join('|') + ', "likelyBreeds": [{"breed": string, "why": string}], "sizeGuess": "pullet"|"small"|"medium"|"large"|"extra large"|"jumbo"|"unsure", "notes": string}',
    'Rules:',
    '- likelyBreeds has at most 5 entries and must use names from this list: ' + breedList() + '.',
    '- Egg color only narrows things to a group of breeds. It cannot prove which hen laid an egg, so say that in notes when relevant.',
    '- Size is hard to judge from a photo without something for scale. Use "unsure" unless there is a clear reference.',
    '- Lighting changes how shell color looks; mention it in notes if the light seems off.',
    '- Plain everyday language, no dashes as punctuation.',
  ].join('\n');
}

export const SYMPTOMS = [
  'Scratching or feather loss', 'Limping', 'Swollen foot', 'Lethargic', 'Not eating', 'Diarrhea', 'Sneezing or bubbly eyes',
  'Pale comb', 'Swollen eye', 'Egg bound signs', 'Wound',
] as const;

export function healthPrompt(photoCount: number, symptoms: string[], birdContext?: string): string {
  return [
    `You are helping a backyard chicken keeper look over ${photoCount === 1 ? 'a photo' : `${photoCount} photos`} of a chicken for possible health problems.`,
    birdContext ? `About the bird: ${birdContext}.` : '',
    symptoms.length ? `The keeper also noticed: ${symptoms.join(', ')}.` : 'The keeper did not list any symptoms.',
    'Reply with only JSON in exactly this shape:',
    '{"photoUsable": boolean, "possibleIssues": [{"name": string, "likelihood": "likely"|"possible"|"less likely", "signsSeen": string, "checkAtHome": string[], "careSteps": string[]}], "urgency": "routine"|"soon"|"urgent", "seeVetIf": string[], "summary": string}',
    'Rules:',
    '- Common backyard conditions include mites, lice, scaly leg mites, bumblefoot, molting, pecking injuries, frostbite, respiratory illness, egg binding, sour or impacted crop, vent prolapse and fowl pox. Consider these first.',
    '- At most 3 possible issues, most likely first. Describe possible issues only. Never give a definite diagnosis.',
    '- careSteps are general care only: isolate the bird, clean the area, inspect closely, keep her warm, calm and hydrated, offer supportive care. Never give medication names with doses or dosing instructions.',
    '- Say to consult a poultry vet or the local extension office before giving any medicine.',
    '- Use "urgent" for signs like labored breathing, a prolapse, heavy bleeding, a bird that is not moving, or suspected egg binding lasting over a day.',
    '- If there are sudden deaths or many sick birds, say in seeVetIf that this should be reported to the state veterinarian or local extension office, since avian influenza must be reported.',
    '- If the photo is too blurry, dark or far away to judge, set photoUsable false, keep possibleIssues short, and say what kind of photo would help.',
    '- checkAtHome items are short things the keeper can look at or feel for.',
    '- summary is 1 to 2 calm sentences. Plain everyday language, no dashes as punctuation.',
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// Sanitizers: model output is untrusted, so coerce it into the shapes the UI expects.
// ---------------------------------------------------------------------------
const str = (v: unknown, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strList = (v: unknown, n = 6) => (Array.isArray(v) ? v.map((x) => str(x, 240)).filter(Boolean).slice(0, n) : []);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], fallback: T): T => (opts.includes(v as T) ? (v as T) : fallback);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export function cleanBird(raw: unknown): BirdIdResult {
  const r = obj(raw);
  const matches = (Array.isArray(r.topMatches) ? r.topMatches : []).map(obj).map((m) => ({
    breed: str(m.breed, 60), confidence: oneOf<Confidence>(m.confidence, ['high', 'medium', 'low'], 'low'), why: str(m.why),
  })).filter((m) => m.breed).slice(0, 3);
  return {
    isChicken: r.isChicken !== false,
    topMatches: matches,
    sex: oneOf(r.sex, ['hen', 'rooster', 'unsure'] as const, 'unsure'),
    ageGuess: str(r.ageGuess, 80),
    notes: str(r.notes, 600),
  };
}

export function cleanEgg(raw: unknown): EggIdResult {
  const r = obj(raw);
  return {
    eggColor: oneOf<EggColor>(r.eggColor, EGG_COLORS.map((c) => c.value), 'light brown'),
    likelyBreeds: (Array.isArray(r.likelyBreeds) ? r.likelyBreeds : []).map(obj).map((m) => ({ breed: str(m.breed, 60), why: str(m.why) })).filter((m) => m.breed).slice(0, 5),
    sizeGuess: oneOf<EggSizeGuess>(r.sizeGuess, ['pullet', 'small', 'medium', 'large', 'extra large', 'jumbo', 'unsure'], 'unsure'),
    notes: str(r.notes, 600),
  };
}

export function cleanHealth(raw: unknown): HealthCheckResult {
  const r = obj(raw);
  return {
    photoUsable: r.photoUsable !== false,
    possibleIssues: (Array.isArray(r.possibleIssues) ? r.possibleIssues : []).map(obj).map((m) => ({
      name: str(m.name, 80), likelihood: oneOf<Likelihood>(m.likelihood, ['likely', 'possible', 'less likely'], 'possible'),
      signsSeen: str(m.signsSeen), checkAtHome: strList(m.checkAtHome), careSteps: strList(m.careSteps),
    })).filter((m) => m.name).slice(0, 3),
    urgency: oneOf<Urgency>(r.urgency, ['routine', 'soon', 'urgent'], 'soon'),
    seeVetIf: strList(r.seeVetIf, 8),
    summary: str(r.summary, 600),
  };
}

/** Learn articles to suggest for an issue name. */
export function relatedArticles(issueNames: string[]): string[] {
  const out = new Set<string>(['biosecurity']);
  const text = issueNames.join(' ').toLowerCase();
  if (/molt/.test(text)) out.add('molting');
  if (/frost|cold/.test(text)) out.add('winter-care');
  if (/heat/.test(text)) out.add('summer-heat');
  if (/mite|lice|louse|parasite/.test(text)) out.add('coop-cleaning');
  if (/peck|injur|wound/.test(text)) out.add('introducing-new-birds');
  if (/egg|bind|prolapse/.test(text)) out.add('egg-production');
  return [...out];
}
