export function EggLogo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6C21 6 12 22 12 36a20 20 0 0 0 40 0C52 22 43 6 32 6z" fill="#fff9f1" />
      <ellipse cx="25" cy="26" rx="4" ry="7" fill="#fff" opacity=".8" transform="rotate(-20 25 26)" />
    </svg>
  );
}
const P = { viewBox: '0 0 24 24', 'aria-hidden': true } as const;
export const IconHome = () => (<svg {...P}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>);
export const IconFlock = () => (<svg {...P}><path d="M7 20c-2-2-3-5-2-8 1-4 5-6 8-5l2-3 1 3 3 1-2 2c1 3 0 7-3 9" /><path d="M7 20h10" /><circle cx="14" cy="9" r=".8" /><path d="M10 20v2M14 20v2" /></svg>);
export const IconEgg = () => (<svg {...P}><path d="M12 3C8 3 5 9 5 14a7 7 0 0 0 14 0c0-5-3-11-7-11z" /></svg>);
export const IconCoop = () => (<svg {...P}><path d="M3 10l9-6 9 6" /><path d="M5 9v11h14V9" /><circle cx="12" cy="13" r="2" /><path d="M9 20l3-3 3 3" /></svg>);
export const IconMore = () => (<svg {...P}><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>);
export const IconBell = () => (<svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 21h4" /></svg>);
export const Chevron = () => (<svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>);
export const Check = () => (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>);
