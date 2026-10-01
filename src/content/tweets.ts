import type { GameState, Tweet } from '../engine/types';
import { HANDLES } from './people';
import { pick } from '../engine/rng';

type Mood = Tweet['mood'];

/** Fake social-media reactions: a real-time, human-readable view of what your metrics mean. */
export function makeTweet(s: GameState): Tweet {
  const name = s.companyName.replace(/[^A-Za-z0-9_]/g, '');
  const m = s.metrics;
  const options: [Mood, string][] = [];
  if (m.downtime > 0) {
    options.push(['angry', `is @${name} down for anyone else?? 😤`], ['angry', `@${name} status page says "all systems operational" lmao`], ['angry', `@${name} has been down so long I started a garden 🌱`]);
  }
  if (m.dropRate > 0.05) {
    options.push(['angry', `@${name} keeps giving me 503s. pay for more servers maybe??`], ['angry', `getting "Service Unavailable" from @${name} every 3rd click 🙃`]);
  }
  if (m.satParts.latency < 40) {
    options.push(['angry', `@${name} loading spinner simulator ⏳`], ['angry', `I could walk to the data centre faster than @${name} loads`], ['meh', `@${name} is so slow I made coffee between clicks ☕`]);
  }
  if (s.bugs > 25) {
    options.push(['angry', `found ${Math.round(s.bugs / 3)} bugs in @${name} before breakfast. do they have QA?`], ['meh', `@${name} has more bugs than features at this point 🐛`]);
  }
  if (m.satParts.features < 40) {
    options.push(['meh', `@${name} hasn't shipped anything in ages. is the team ok?`], ['meh', `competitor has 5 features @${name} doesn't. just saying`]);
  }
  if (s.monetization > 0.8) {
    options.push(['angry', `@${name} raised prices AGAIN?! cancelling.`], ['meh', `@${name} premium tier costs more than my rent 💸`]);
  }
  if (s.features.length && s.day - (s.log.find((l) => l.text.startsWith('🚀'))?.day ?? -99) < 10) {
    const f = s.features[s.features.length - 1];
    options.push(['happy', `omg @${name} just shipped ${f} 😍`], ['happy', `${f} on @${name} is actually really good ngl`]);
  }
  if (s.sat > 75) {
    options.push(['happy', `@${name} is so fast it feels local 🚀`], ['happy', `switched to @${name} and never looking back`], ['happy', `@${name} engineering team is cracked 🔥`]);
  }
  if (s.hype > 0.6) {
    options.push(['happy', `everyone at my school is on @${name} now`], ['meh', `is @${name} the next big thing or just hype? 🤔`]);
  }
  if (!options.length) {
    options.push(['meh', `@${name} is fine I guess`], ['meh', `using @${name} for a class project`], ['happy', `@${name} just works 👍`], ['meh', `wonder what stack @${name} runs on`]);
  }
  const [mood, text] = pick(s, options);
  return { day: s.day, handle: pick(s, HANDLES), text, mood };
}
