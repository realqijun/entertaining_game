/**
 * The story layer: you are a dinosaur tech founder running a news app on Pangaea.
 * Pure flavour. Nothing here changes the simulation, and picks are hashed from the
 * seed and day (never `rand`), so stories never shift a run's numbers.
 */

export const APP_NAME = 'The Daily Roar';

/** Player names: famous tech founders, but dinosaurs. */
export const FOUNDERS = [
  'Steve Jobasaurus',
  'Ada Lovelaceratops',
  'Bill Gatesodon',
  'Linus Torvaldsaurus',
  'Grace Hopperasaurus',
  'Jeff Bezosaurus Rex',
  'Mark Zuckerbronto',
  'Tim Cookadactyl',
];

/** Your mentor: the oldest system architect on Pangaea. Gives hints and writes the postmortems. */
export const MENTOR = {
  name: 'Prof. Archie Tectopteryx',
  short: 'Archie',
  title: 'Chief Architectopteryx',
};

export function hash(a: number, b = 0): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x7f4a7c15), 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export function founderFor(seed: number): string {
  return FOUNDERS[hash(seed, 1) % FOUNDERS.length];
}

export interface Headline {
  emoji: string;
  text: string;
}

/** Everyday stories on the front page. */
export const HEADLINES: Headline[] = [
  { emoji: '🦖', text: 'Velociraptor gang robs 7 corner stores in one night, takes only the rotisserie chickens' },
  { emoji: '🎤', text: 'Pop star Pterodactyl finally explains why his P is silent' },
  { emoji: '☄️', text: 'Scientists spot a "small, friendly" bright light in the sky' },
  { emoji: '🏋️', text: 'T-Rex sues gym over "discriminatory" push-up machine' },
  { emoji: '🦕', text: 'Local Brachiosaurus still hasn\'t heard last week\'s news. Neck too long, says doctor' },
  { emoji: '☕', text: 'Triceratops opens horn-themed coffee shop. Every order comes with three shots' },
  { emoji: '🏆', text: 'Ankylosaurus wins the tail-whacking championship for the 12th year running' },
  { emoji: '🦎', text: 'Mosasaurus insists it is "technically a lizard", threatens to sue anyone who says otherwise' },
  { emoji: '😢', text: 'Pterodactyls are not technically dinosaurs, scientists confirm. Pterodactyls "devastated"' },
  { emoji: '🥚', text: 'Egg prices hit a record high. Every dinosaur in town suddenly very quiet' },
  { emoji: '🎺', text: 'Parasaurolophus band\'s new album is "mostly honking", critics agree' },
  { emoji: '🗳️', text: 'Compsognathus elected mayor after promising "smaller government"' },
  { emoji: '📉', text: 'DinoCoin crashes 90% after its founder gets stuck in a tar pit' },
  { emoji: '🌿', text: 'Weather tomorrow: 100% chance of ferns' },
  { emoji: '🦴', text: 'Brontosaurus officially a real dinosaur again. Brontosaurus: "I never left"' },
  { emoji: '👍', text: 'Historian: Iguanodon\'s thumb spike was "definitely for giving thumbs-ups"' },
  { emoji: '💪', text: 'T-Rex influencer hits 2M followers with "small arms, big gains" workout series' },
  { emoji: '🛒', text: 'Herd of Gallimimus stampedes through Black Friday sale' },
  { emoji: '📜', text: 'Diplodocus finishes reading a post it started last Tuesday' },
  { emoji: '🌫️', text: 'Swamp water rebranded as "artisanal". Price triples' },
  { emoji: '🪶', text: 'Archaeopteryx claims to be the first bird. Other birds ask for receipts' },
  { emoji: '🦃', text: 'Real velociraptors were turkey-sized, scientists say. Hollywood in shambles' },
  { emoji: '🌋', text: 'Volcano erupts during a gender-reveal party. "It\'s lava," says proud parent' },
  { emoji: '🛁', text: 'Spinosaurus swim school reports "mostly positive" reviews' },
  { emoji: '🧠', text: 'Stegosaurus with a "second brain" in its hip wins pub quiz, demands two prizes' },
  { emoji: '🎬', text: 'Raptor CEO says "clever girl" was a compliment. HR disagrees' },
  { emoji: '🧳', text: 'Continental drift ruins family reunion again' },
  { emoji: '🦷', text: 'Dentists baffled as T-Rex refuses to floss "on principle"' },
  { emoji: '🛰️', text: 'Bright light in the sky "probably nothing", says nervous astronomer' },
  { emoji: '🍔', text: 'Herbivore restaurant introduces "meat-free meat". Carnivores suspicious' },
];

/** Headlines tied to scheduled traffic events, keyed by event id. They explain why traffic spikes. */
export const EVENT_STORIES: Record<string, Headline & { why: string }> = {
  viral: {
    emoji: '☄️',
    text: 'Meteor bunker stocks SOAR after scientists spot bright light in sky',
    why: 'Everyone on Pangaea is reading the same story. That means lots of reads, and the same reads again and again.',
  },
  flashSale: {
    emoji: '🎤',
    text: 'Pop star Pterodactyl explains why his P is silent. 3 million comments and counting',
    why: 'Fans aren\'t just reading, they\'re commenting. Every comment is a write to the database.',
  },
  keynote: {
    emoji: '🦖',
    text: 'LIVE: Velociraptor crime spree hits its 40th store. Readers refresh every 5 seconds',
    why: 'Live coverage means the same page gets read over and over.',
  },
};

/** Flavour for a crashed app instance. */
export const CRASH_STORIES = [
  'A Triceratops tripped over the server\'s power cable.',
  'A Compsognathus chewed through a network cable. Again.',
  'Swamp season: water got into the server room.',
  'Volcanic ash clogged the server fans.',
  'A Brachiosaurus mistook the server rack for a snack.',
];

export function headlineFor(seed: number, day: number): Headline {
  return HEADLINES[hash(seed, day + 100) % HEADLINES.length];
}

export function crashStory(seed: number, day: number): string {
  return CRASH_STORIES[hash(seed, day + 7) % CRASH_STORIES.length];
}

/** Readers on a headline: big round numbers that grow with your user base. */
export function readsFor(users: number, seed: number, day: number, hot: boolean): number {
  const share = hot ? 0.6 + (hash(seed, day) % 30) / 100 : 0.05 + (hash(seed, day + 3) % 20) / 100;
  return Math.round((users * share) / 100) * 100;
}

/** What Archie says when an incident is declared. Never gives the answer away. */
export const MENTOR_INCIDENT: Record<string, string> = {
  db: 'Roar! Something is overloaded. Find whoever is panicking before readers leave.',
  app: 'Our app servers are drowning in readers. Find whoever is panicking.',
  instance: 'One of our servers is down. Are readers still being sent to it?',
};

/** Milestones retold as funding news. */
export const MILESTONE_STORIES = [
  'Pterodactyl Ventures invests! "We back anything that flies," says a partner who cannot fly.',
  'Tar Pit Capital leads your seed round. Their money is a little sticky.',
  'Series A from Jurassic Partners. They ask about the "bright light in the sky". Nobody answers.',
  'The Daily Roar is the most-read news app on Pangaea!',
];

/** How the story ends, per end reason. */
export const ENDINGS: Record<string, { icon: string; title: string; story: string }> = {
  win: { icon: '🏆', title: '1 million readers!', story: 'The Daily Roar is the #1 news app on Pangaea. Next quarter: the bright light in the sky. Probably nothing.' },
  bankrupt: { icon: '💸', title: 'Out of cash', story: 'The Daily Roar was sold for parts to a tar pit. The tar pit is not hiring.' },
  reputation: { icon: '📉', title: 'Your readers left', story: 'Readers went back to getting news from a gossiping Archaeopteryx.' },
  timeout: { icon: '☄️', title: 'The meteor arrived first', story: 'Investors ran out of patience before you hit 1 million readers. Then the bright light landed.' },
};

const CAUSE_TO_EVENT: Record<string, string> = {
  'Meteor panic goes viral': 'viral',
  'Pterodactyl comment storm': 'flashSale',
  'Raptor crime spree, live': 'keynote',
};

/** The story behind a workload cause (an event name), if any. */
export function storyForCause(cause: string | null | undefined) {
  const id = cause ? CAUSE_TO_EVENT[cause] : undefined;
  return id ? EVENT_STORIES[id] : null;
}
