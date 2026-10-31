import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const avatar = z.enum(['performer', 'artist', 'competitor', 'strategist', 'spellcaster']);
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, 'Use 24h HH:MM, e.g. 18:30');

/** One Markdown file per event in src/content/events/. The file name is the URL slug. */
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    category: z.enum(['boss', 'side', 'workshop', 'discovery']),
    genre: z.enum(['music', 'dance', 'drama', 'art', 'literary', 'quiz', 'gaming', 'fashion', 'film', 'comedy', 'mun', 'informal', 'workshop']),
    avatars: z.array(avatar).min(1),
    day: z.number().int().min(1).max(4),
    start: hhmm,
    end: hhmm.optional(),
    venue: z.string(),
    prize: z.string().optional(),
    teamSize: z.string().optional(),
    fee: z.string().optional(),
    registerUrl: z.string().url().nullable().optional(),
    rulebookUrl: z.string().url().nullable().optional(),
    featured: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

/** Pronite nights. artist: null keeps the boss hidden ("???") until revealed. */
const pronites = defineCollection({
  loader: file('src/content/pronites.json'),
  schema: z.object({
    night: z.number().int().min(1).max(4),
    title: z.string(),
    artist: z.string().nullable(),
    genre: z.string(),
    start: hhmm,
    venue: z.string(),
    teaser: z.string(),
  }),
});

const passes = defineCollection({
  loader: file('src/content/passes.json'),
  schema: z.object({
    name: z.string(),
    price: z.string(),
    blurb: z.string(),
    perks: z.array(z.string()),
    url: z.string().url().nullable().optional(),
    highlight: z.boolean().default(false),
    order: z.number().default(100),
  }),
});

const sponsors = defineCollection({
  loader: file('src/content/sponsors.json'),
  schema: z.object({
    name: z.string(),
    tier: z.enum(['title', 'platinum', 'gold', 'partner']),
    role: z.string().optional(),
    url: z.string().url().nullable().optional(),
    logo: z.string().nullable().optional(),
  }),
});

const team = defineCollection({
  loader: file('src/content/team.json'),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    vertical: z.string(),
    photo: z.string().nullable().optional(),
    email: z.string().email().nullable().optional(),
    order: z.number().default(100),
  }),
});

const faq = defineCollection({
  loader: file('src/content/faq.json'),
  schema: z.object({
    group: z.string(),
    q: z.string(),
    a: z.string(),
    order: z.number().default(100),
  }),
});

export const collections = { events, pronites, passes, sponsors, team, faq };
