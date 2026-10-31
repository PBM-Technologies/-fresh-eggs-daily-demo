import type { DateKey } from '../contracts/domain';
import type { Snapshot } from '../data/service';
import { FED_ALL, FED_COOP, FED_TREATS } from '../content/shop';
import { addDays, diffDays } from './dates';
import { layingTrend } from './eggs';
import { stockLevel } from './feed';
import { incubationDay } from './incubation';

export type Season = 'winter' | 'spring' | 'summer' | 'fall';

/** Northern hemisphere meteorological seasons. */
export function seasonOf(day: DateKey): Season {
  const m = Number(day.slice(5, 7));
  return m === 12 || m <= 2 ? 'winter' : m <= 5 ? 'spring' : m <= 8 ? 'summer' : 'fall';
}

export interface DayForecast { date: DateKey; highF: number; lowF: number; precipIn: number; windMph: number; code: number }
export type AlertLevel = 'watch' | 'act';
export interface WeatherAlert { id: string; level: AlertLevel; emoji: string; title: string; when: string; steps: string[] }

const dayName = (d: DateKey, today: DateKey) => {
  const n = diffDays(d, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long' });
};

/** WMO weather codes used by Open-Meteo. */
export function describeCode(code: number): { label: string; emoji: string } {
  if (code === 0) return { label: 'Clear', emoji: '☀️' };
  if (code <= 2) return { label: 'Partly cloudy', emoji: '⛅' };
  if (code === 3) return { label: 'Cloudy', emoji: '☁️' };
  if (code <= 48) return { label: 'Fog', emoji: '🌫️' };
  if (code <= 57) return { label: 'Drizzle', emoji: '🌦️' };
  if (code <= 67) return { label: 'Rain', emoji: '🌧️' };
  if (code <= 77) return { label: 'Snow', emoji: '🌨️' };
  if (code <= 82) return { label: 'Showers', emoji: '🌦️' };
  if (code <= 86) return { label: 'Snow showers', emoji: '🌨️' };
  return { label: 'Storms', emoji: '⛈️' };
}

/** Flock care alerts from the next few days of forecast. Each kind appears once, at its first day. */
export function weatherAlerts(days: DayForecast[], today: DateKey): WeatherAlert[] {
  const out: WeatherAlert[] = [];
  const first = (pred: (d: DayForecast) => boolean) => days.find(pred);
  const hot = first((d) => d.highF >= 90);
  if (hot) out.push({
    id: 'heat', level: hot.highF >= 95 ? 'act' : 'watch', emoji: '🥵', title: `Heat: ${Math.round(hot.highF)}°F`, when: dayName(hot.date, today),
    steps: ['Add a second waterer in the shade and refill it midday.', 'Freeze water jugs or offer frozen fruit treats.', 'Open coop vents and windows for airflow.', 'Watch for panting with wings held out. Move that hen somewhere cool.'],
  });
  const frigid = first((d) => d.lowF <= 15);
  const freeze = first((d) => d.lowF <= 32);
  if (frigid) out.push({
    id: 'cold', level: 'act', emoji: '🥶', title: `Hard freeze: ${Math.round(frigid.lowF)}°F`, when: dayName(frigid.date, today),
    steps: ['Use a heated waterer base or swap water twice a day.', 'Scatter scratch grains in the evening so they go to roost with a full crop.', 'Keep vents open up high but block drafts at roost level.', 'Rub petroleum jelly on large combs and wattles to help prevent frostbite.'],
  });
  else if (freeze) out.push({
    id: 'freeze', level: 'watch', emoji: '🧊', title: `Freezing night: ${Math.round(freeze.lowF)}°F`, when: dayName(freeze.date, today),
    steps: ['Check the waterer first thing in the morning for ice.', 'Collect eggs early so they do not freeze and crack.', 'Add a fresh layer of dry bedding.'],
  });
  const wet = first((d) => d.precipIn >= 0.75 || d.code >= 95);
  if (wet) out.push({
    id: 'storm', level: wet.code >= 95 ? 'act' : 'watch', emoji: wet.code >= 95 ? '⛈️' : '🌧️', title: wet.code >= 95 ? 'Storms' : `Heavy rain: ${wet.precipIn.toFixed(1)} in`, when: dayName(wet.date, today),
    steps: ['Lock the flock in early and check the run roof and latches.', 'Move feed under cover so it stays dry and mold free.', 'Add sand or straw to muddy spots in the run afterward.'],
  });
  const windy = first((d) => d.windMph >= 30);
  if (windy) out.push({
    id: 'wind', level: 'watch', emoji: '💨', title: `High wind: ${Math.round(windy.windMph)} mph`, when: dayName(windy.date, today),
    steps: ['Weigh down or stake lightweight coops and tarps.', 'Keep hens in the run until the wind dies down.'],
  });
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === 'act' ? -1 : 1));
}

export interface SeasonTip { title: string; detail: string }

export const SEASON_TIPS: Record<Season, { headline: string; tips: SeasonTip[] }> = {
  winter: {
    headline: 'Keep them dry, fed and drinking',
    tips: [
      { title: 'Water that does not freeze', detail: 'A heated base or two swaps a day. Hens stop laying fast without water.' },
      { title: 'Ventilate, do not seal', detail: 'Moist air causes frostbite more than cold does. Keep high vents open.' },
      { title: 'Expect fewer eggs', detail: 'Short days slow laying. That is normal rest, not a problem.' },
      { title: 'Deep litter', detail: 'Add bedding on top instead of a full cleanout. It composts and adds warmth.' },
    ],
  },
  spring: {
    headline: 'Laying picks up and chick season starts',
    tips: [
      { title: 'Deep clean the coop', detail: 'Strip bedding, scrub roosts and nest boxes, let it dry in the sun.' },
      { title: 'Mite and lice check', detail: 'Warm weather brings pests. Check under wings and around the vent.' },
      { title: 'Brooder ready', detail: 'Chicks need 95°F the first week, dropping about 5°F each week.' },
      { title: 'Collect often', detail: 'Peak laying means fuller nest boxes. Collect twice a day to keep eggs clean.' },
    ],
  },
  summer: {
    headline: 'Shade, water and airflow',
    tips: [
      { title: 'Shade the run', detail: 'A tarp or shade cloth over part of the run drops temps fast.' },
      { title: 'Cool treats, not more treats', detail: 'Frozen watermelon or cucumber helps. Keep treats under 10% of the diet.' },
      { title: 'Watch for broodies', detail: 'Summer brings broody hens. Decide early whether you want chicks.' },
      { title: 'Fly control', detail: 'Keep bedding dry and turn the compost to cut down on flies.' },
    ],
  },
  fall: {
    headline: 'Molt season: feathers out, protein up',
    tips: [
      { title: 'Molting is normal', detail: 'Hens drop feathers and stop laying for 6 to 12 weeks. Handle them gently.' },
      { title: 'More protein', detail: 'Feathers are mostly protein. Mealworms and higher protein feed help them regrow.' },
      { title: 'Winter prep', detail: 'Fix drafts, check the waterer heater and stock up on bedding.' },
      { title: 'Deworming check', detail: 'A good time for a fecal check or your usual deworming routine.' },
    ],
  },
};

export interface ProductPick { id: string; emoji: string; title: string; why: string; url: string; cta: string }

/**
 * Fresh Eggs Daily product suggestions tied to what is going on with this
 * flock: low stock, molt, weather, season, hatching and laying. Links only go to
 * confirmed fresheggsdailyshop.com pages. Returns at most `limit` picks.
 */
export function productPicks(s: Snapshot, today: DateKey, alerts: WeatherAlert[] = [], limit = 3): ProductPick[] {
  const picks: ProductPick[] = [];
  const add = (p: ProductPick) => { if (!picks.some((x) => x.id === p.id)) picks.push(p); };
  const season = seasonOf(today);

  for (const f of s.feed_inventory) {
    const lvl = stockLevel(f, today);
    if (lvl !== 'low' && lvl !== 'out') continue;
    if (f.category === 'treats') add({ id: 'low-treats', emoji: '🌽', title: 'Restock treats', why: `${f.name} is ${lvl === 'out' ? 'out' : 'running low'}.`, url: FED_TREATS, cta: 'Shop treats' });
    if (f.category === 'supplement') add({ id: 'low-supp', emoji: '🌿', title: 'Restock supplements', why: `${f.name} is ${lvl === 'out' ? 'out' : 'running low'}.`, url: FED_ALL, cta: 'Shop supplements' });
    if (f.category === 'coop_care') add({ id: 'low-coop', emoji: '🪺', title: 'Restock coop care', why: `${f.name} is ${lvl === 'out' ? 'out' : 'running low'}.`, url: FED_COOP, cta: 'Shop coop care' });
  }

  const recentMolt = s.bird_health_events.some((e) => e.type === 'molt' && e.occurredOn >= addDays(today, -45));
  if (recentMolt) add({ id: 'molt', emoji: '🪶', title: 'Molt support', why: 'You logged a molt recently. Protein-rich treats help feathers grow back.', url: FED_TREATS, cta: 'Shop protein treats' });
  if (alerts.some((a) => a.id === 'heat')) add({ id: 'heat', emoji: '💧', title: 'Beat the heat', why: 'Hot days ahead. Hydration support and cool treats help hens cope.', url: FED_ALL, cta: 'Shop supplements' });
  if (alerts.some((a) => a.id === 'cold' || a.id === 'freeze')) add({ id: 'cold', emoji: '🔥', title: 'Cold night fuel', why: 'Freezing nights ahead. An evening snack helps hens stay warm on the roost.', url: FED_TREATS, cta: 'Shop treats' });

  const hatching = s.incubation_batches.some((b) => { const d = incubationDay(b.setOn, today); return d >= 0 && d <= 35; });
  if (hatching) add({ id: 'chicks', emoji: '🐣', title: 'Chick care', why: 'You have a hatch going. Get chick support ready before they arrive.', url: FED_ALL, cta: 'Shop chick care' });

  const trend = layingTrend(s.egg_collections, today);
  if (trend.direction === 'down' && !recentMolt && season !== 'winter') add({ id: 'laying', emoji: '🥚', title: 'Laying support', why: 'Egg counts dipped this week. Nutritional add-ins can help hens get back on track.', url: FED_ALL, cta: 'Shop supplements' });

  if (season === 'fall') add({ id: 'molt-season', emoji: '🪶', title: 'Molt season', why: 'Fall molt is here. Extra protein helps the flock refeather.', url: FED_TREATS, cta: 'Shop protein treats' });
  if (season === 'spring') add({ id: 'spring-coop', emoji: '🌸', title: 'Spring coop refresh', why: 'Freshen nest boxes with herbs after your spring cleanout.', url: FED_COOP, cta: 'Shop nesting herbs' });
  if (season === 'summer') add({ id: 'summer', emoji: '🍉', title: 'Summer boredom busters', why: 'Hot days mean more time in the shade. Enrichment keeps hens busy.', url: FED_TREATS, cta: 'Shop treats' });
  if (season === 'winter') add({ id: 'winter', emoji: '❄️', title: 'Winter boredom busters', why: 'Snowed-in hens get bored and peck. A treat to forage keeps the peace.', url: FED_TREATS, cta: 'Shop treats' });
  add({ id: 'nest', emoji: '🪺', title: 'Fresh nest boxes', why: 'Nesting herbs keep boxes smelling fresh between cleanings.', url: FED_COOP, cta: 'Shop nesting herbs' });

  return picks.slice(0, limit);
}
