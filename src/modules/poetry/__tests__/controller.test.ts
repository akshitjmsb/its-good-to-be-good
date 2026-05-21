import { describe, expect, it } from 'vitest';
import {
  PoetryModule,
  destroy,
  fetchAndShowPoetry,
  init,
} from '../controller';
import { buildPoetryPrompt, isPoetryMoment } from '../data';
import { renderPoetryFallback, renderPoetryMoment } from '../view';

describe('Poetry module controller', () => {
  it('exposes init/destroy and the legacy fetchAndShowPoetry entry', () => {
    expect(typeof init).toBe('function');
    expect(typeof destroy).toBe('function');
    expect(typeof fetchAndShowPoetry).toBe('function');
    expect(PoetryModule.init).toBe(init);
    expect(PoetryModule.destroy).toBe(destroy);
  });

  it('isPoetryMoment narrows to PoetryMoment only when every field is a string', () => {
    expect(
      isPoetryMoment({
        scene: 'a',
        couplet: 'b',
        transliteration: 'c',
        translation: 'd',
        aboutWriter: 'e',
        poet: 'f',
        language: 'g',
      })
    ).toBe(true);
    expect(isPoetryMoment({ scene: 'a' })).toBe(false);
    expect(isPoetryMoment(null)).toBe(false);
    expect(isPoetryMoment('not an object')).toBe(false);
  });

  it('buildPoetryPrompt embeds the recents lists and the day index', () => {
    const prompt = buildPoetryPrompt(42, ['Mir'], ['Urdu']);
    expect(prompt).toContain('"Mir"');
    expect(prompt).toContain('"Urdu"');
    expect(prompt).toContain('42');
  });

  it('renderPoetryMoment escapes user-visible fields', () => {
    const html = renderPoetryMoment({
      scene: '<script>x</script>',
      couplet: 'c',
      transliteration: 't',
      translation: 'tr',
      aboutWriter: 'a',
      poet: 'p',
      language: 'l',
    });
    expect(html).not.toContain('<script>x</script>');
  });

  it('renderPoetryFallback escapes raw text', () => {
    const html = renderPoetryFallback('<img src=x>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('Poetry in Motion');
  });
});
