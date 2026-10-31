/**
 * Site-wide settings. Everything marked PLACEHOLDER must be confirmed by the IGNUS team.
 * Links that point at the (future) backend go through src/lib/api, not here.
 */
export const SITE = {
  name: 'IGNUS ’27',
  shortName: 'IGNUS',
  edition: 2027,
  theme: 'The Isekai Shift',
  themeHi: 'अतींद्रिय भावांतर',
  college: 'IIT Jodhpur',
  tagline: 'Cross the berm and enter the magic circle.',
  description:
    'IGNUS ’27 · The Isekai Shift. The annual fest of IIT Jodhpur: four days where academic gravity switches off. Events, pronites, competitions and passes.',

  /** PLACEHOLDER dates (IST). Day 1 = start. Drives the countdown, schedule and schema.org data. */
  dates: {
    start: '2027-02-18T10:00:00+05:30',
    end: '2027-02-21T23:59:00+05:30',
    days: 4,
  },
  timezone: 'Asia/Kolkata',
  venue: {
    name: 'IIT Jodhpur',
    address: 'NH 62, Nagaur Road, Karwar, Jodhpur, Rajasthan 342030',
  },

  /** PLACEHOLDER social links. Empty strings are hidden. */
  social: {
    instagram: '',
    youtube: '',
    linkedin: '',
    x: '',
  },
  email: '',
} as const;

/** Feature switches. posters: Lite-mode stills exist in public/posters/ (scripts/render-posters.mjs). */
export const FEATURES = {
  posters: true,
} as const;

export type NavItem = { href: string; label: string; short?: string };

/** Primary nav (top HUD). The pause menu lists everything. */
export const NAV: NavItem[] = [
  { href: '/events/', label: 'Events' },
  { href: '/schedule/', label: 'Schedule' },
  { href: '/pronites/', label: 'Pronites' },
  { href: '/passes/', label: 'Passes' },
];

export const MENU: NavItem[] = [
  { href: '/', label: 'Home', short: 'Spawn point' },
  { href: '/events/', label: 'Events', short: 'Quest board' },
  { href: '/schedule/', label: 'Schedule', short: 'Four-day timeline' },
  { href: '/pronites/', label: 'Pronites', short: 'Boss encounters' },
  { href: '/passes/', label: 'Passes', short: 'Entry tokens' },
  { href: '/sponsors/', label: 'Sponsors', short: 'Allies' },
  { href: '/team/', label: 'Team', short: 'Game masters' },
  { href: '/faq/', label: 'FAQ & Contact', short: 'Help desk' },
];

/** The five player classes. Colours match tokens.css. */
export const AVATARS = {
  performer: { name: 'Performer', color: '#ff2e93', token: '--rani', line: 'Owns the stage.', where: 'Main stage · dance floors · open mics' },
  artist: { name: 'Artist', color: '#ff8a1f', token: '--saffron', line: 'Leaves colour on every wall.', where: 'Live art · graffiti walls · installations' },
  competitor: { name: 'Competitor', color: '#dcff3c', token: '--acid', line: 'Here for the win.', where: 'Competitions · tournaments · gaming arenas' },
  strategist: { name: 'Strategist', color: '#6f8cff', token: '--jodhpur', line: 'Plays the long game.', where: 'Quizzes · puzzles · treasure hunts' },
  spellcaster: { name: 'Spellcaster', color: '#5ef2ff', token: '--portal', line: 'Finds what is around the next corner.', where: 'Workshops · hidden corridors · late nights' },
} as const;
export type AvatarKey = keyof typeof AVATARS;
export const AVATAR_KEYS = Object.keys(AVATARS) as AvatarKey[];

/** Event categories, read as a game (from the handoff's quest log). */
export const CATEGORIES = {
  boss: { label: 'Boss encounter', plural: 'Boss encounters', blurb: 'Headline events. Big crowds, big stages, one shot at it.' },
  side: { label: 'Side quest', plural: 'Side quests', blurb: 'Competitions across music, dance, art, quizzing and more.' },
  workshop: { label: 'Skill tree', plural: 'Skill trees', blurb: 'Workshops and masterclasses. Level up something new.' },
  discovery: { label: 'Rare discovery', plural: 'Rare discoveries', blurb: 'Installations and informals placed around campus.' },
} as const;
export type CategoryKey = keyof typeof CATEGORIES;

/** Sticker class and accent colour per category. */
export const CATEGORY_STYLE: Record<CategoryKey, readonly [string, string]> = {
  boss: ['s-rani', 'var(--rani)'],
  side: ['', 'var(--acid)'],
  workshop: ['s-cyan', 'var(--portal)'],
  discovery: ['s-saffron', 'var(--saffron)'],
};
