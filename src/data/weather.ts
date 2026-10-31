import { useCallback, useEffect, useState } from 'react';
import type { DayForecast } from '../logic/seasonal';

/**
 * Weather comes from Open-Meteo (free, no key, no account). The chosen place
 * and the last forecast are per-device conveniences kept in localStorage; the
 * app works fine without either.
 */
export interface Place { name: string; lat: number; lon: number }
export interface WeatherState { place: Place | null; days: DayForecast[]; status: 'idle' | 'loading' | 'ready' | 'error'; error?: string; fetchedAt?: number }

const PLACE_KEY = 'fed:ui:place';
const CACHE_KEY = 'fed:ui:forecast';
const MAX_AGE = 60 * 60 * 1000;

function read<T>(k: string): T | null {
  try { const v = window.localStorage.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
}
function write(k: string, v: unknown) {
  try { if (v === null) window.localStorage.removeItem(k); else window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* optional */ }
}

export async function searchPlaces(q: string): Promise<Place[]> {
  const zip = /^\d{5}$/.test(q.trim());
  const url = `https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&format=json${zip ? '&countryCode=US' : ''}&name=${encodeURIComponent(q.trim())}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not search places right now.');
  const j = (await res.json()) as { results?: { name: string; admin1?: string; country_code?: string; latitude: number; longitude: number }[] };
  return (j.results ?? []).map((r) => ({ name: [r.name, r.admin1, r.country_code !== 'US' ? r.country_code : ''].filter(Boolean).join(', '), lat: r.latitude, lon: r.longitude }));
}

export async function fetchForecast(p: Place): Promise<DayForecast[]> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat.toFixed(3)}&longitude=${p.lon.toFixed(3)}`
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max'
    + '&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=5';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load the forecast right now.');
  const j = (await res.json()) as { daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_sum: number[]; wind_speed_10m_max: number[] } };
  const d = j.daily;
  return d.time.map((date, i) => ({ date, code: d.weather_code[i] ?? 0, highF: d.temperature_2m_max[i] ?? 0, lowF: d.temperature_2m_min[i] ?? 0, precipIn: d.precipitation_sum[i] ?? 0, windMph: d.wind_speed_10m_max[i] ?? 0 }));
}

export function useWeather() {
  const [state, setState] = useState<WeatherState>(() => {
    const place = read<Place>(PLACE_KEY);
    const cache = read<{ key: string; at: number; days: DayForecast[] }>(CACHE_KEY);
    const fresh = place && cache && cache.key === `${place.lat},${place.lon}`;
    return { place, days: fresh ? cache.days : [], status: fresh ? 'ready' : 'idle', fetchedAt: fresh ? cache.at : undefined };
  });

  const load = useCallback(async (p: Place, force = false) => {
    const cache = read<{ key: string; at: number; days: DayForecast[] }>(CACHE_KEY);
    const key = `${p.lat},${p.lon}`;
    if (!force && cache && cache.key === key && Date.now() - cache.at < MAX_AGE) {
      setState({ place: p, days: cache.days, status: 'ready', fetchedAt: cache.at });
      return;
    }
    setState((s) => ({ ...s, place: p, status: 'loading' }));
    try {
      const days = await fetchForecast(p);
      const at = Date.now();
      write(CACHE_KEY, { key, at, days });
      setState({ place: p, days, status: 'ready', fetchedAt: at });
    } catch (e) {
      setState((s) => ({ ...s, place: p, status: 'error', error: e instanceof Error ? e.message : 'Weather is unavailable.' }));
    }
  }, []);

  useEffect(() => { if (state.place) void load(state.place); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPlace = useCallback((p: Place | null) => {
    write(PLACE_KEY, p);
    if (p) void load(p, true);
    else { write(CACHE_KEY, null); setState({ place: null, days: [], status: 'idle' }); }
  }, [load]);

  return { ...state, setPlace, refresh: () => state.place && load(state.place, true) };
}

export function currentPosition(): Promise<Place> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Location is not available on this device.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ name: 'My location', lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error('Location permission was not given. Search by town or ZIP instead.')),
      { timeout: 10000, maximumAge: 3600000 }
    );
  });
}
