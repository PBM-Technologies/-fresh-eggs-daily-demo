import { useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';

export interface Route { path: string; params: Record<string, string>; query: URLSearchParams }

function parseHash(): Route {
  const raw = (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#/, '') || '/';
  const [p, q = ''] = raw.split('?');
  const path = '/' + p.split('/').filter(Boolean).join('/');
  return { path, params: {}, query: new URLSearchParams(q) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Matches "/flock/:birdId" style patterns. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function navigate(to: string, replace = false) {
  const hash = '#' + to;
  if (replace) window.location.replace(hash);
  else window.location.hash = to;
}

export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={'#' + to} {...rest}>{children}</a>;
}
