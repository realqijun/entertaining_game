import { describe, expect, it } from 'vitest';
import { CRASH_STORIES, ENDINGS, EVENT_STORIES, FOUNDERS, HEADLINES, MILESTONE_STORIES, founderFor, headlineFor, storyForCause } from '../../src/sdt/content/story';
import { MILESTONES } from '../../src/sdt/content/balance';
import { newGame } from '../../src/sdt/engine/sim';

describe('story layer', () => {
  it('has a headline for every scheduled traffic event, found by its cause name', () => {
    const s = newGame(3);
    for (const e of s.events) {
      expect(EVENT_STORIES[e.id], e.id).toBeTruthy();
      expect(storyForCause(e.name), e.name).toBe(EVENT_STORIES[e.id]);
    }
  });

  it('covers every milestone and end reason', () => {
    expect(MILESTONE_STORIES.length).toBe(MILESTONES.length);
    for (const r of ['win', 'bankrupt', 'reputation', 'timeout']) expect(ENDINGS[r]).toBeTruthy();
  });

  it('picks are deterministic and drawn from the lists', () => {
    expect(headlineFor(7, 4)).toBe(headlineFor(7, 4));
    expect(HEADLINES).toContain(headlineFor(7, 4));
    expect(FOUNDERS).toContain(founderFor(7));
    expect(CRASH_STORIES.length).toBeGreaterThan(2);
    expect(new Set(HEADLINES.map((h) => h.text)).size).toBe(HEADLINES.length);
  });

  it('does not touch the simulation RNG', () => {
    const a = newGame(11);
    const b = newGame(11);
    delete a.founder;
    delete b.founder;
    expect(a).toEqual(b);
    expect(newGame(11).founder).toBe(founderFor(11));
  });
});
