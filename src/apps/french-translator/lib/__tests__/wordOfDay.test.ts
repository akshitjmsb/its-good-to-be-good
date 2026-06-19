import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { callAI } = vi.hoisted(() => ({ callAI: vi.fn() }));
vi.mock('../../../../infra/ai/client', async () => {
  const actual = await vi.importActual<typeof import('../../../../infra/ai/client')>(
    '../../../../infra/ai/client'
  );
  return { ...actual, callAI };
});

import { difficultyForCount, generateWordOfDay } from '../wordOfDay';

const VALID = JSON.stringify({
  word: 'bonjour',
  pronunciation: 'bon-ZHOOR',
  meaning: 'hello',
  grammar: 'interjection',
  examples: [
    { french: 'Bonjour!', english: 'Hello!' },
    { french: 'Bonjour, ça va?', english: 'Hello, how are you?' },
    { french: 'Bonjour madame.', english: 'Hello madam.' },
  ],
  note: 'Literally "good day".',
});

beforeEach(() => callAI.mockReset());
afterEach(() => vi.clearAllMocks());

describe('difficultyForCount', () => {
  it('ramps from beginner to advanced with progress', () => {
    expect(difficultyForCount(0)).toBe('beginner');
    expect(difficultyForCount(11)).toBe('beginner');
    expect(difficultyForCount(12)).toBe('intermediate');
    expect(difficultyForCount(39)).toBe('intermediate');
    expect(difficultyForCount(40)).toBe('advanced');
  });
});

describe('generateWordOfDay', () => {
  it('parses a valid JSON response', async () => {
    callAI.mockResolvedValue(VALID);
    const word = await generateWordOfDay([], 0);
    expect(word.word).toBe('bonjour');
    expect(word.examples).toHaveLength(3);
  });

  it('strips markdown code fences before parsing', async () => {
    callAI.mockResolvedValue('```json\n' + VALID + '\n```');
    const word = await generateWordOfDay([], 0);
    expect(word.word).toBe('bonjour');
  });

  it('passes the already-learned words into the prompt so they are avoided', async () => {
    callAI.mockResolvedValue(VALID);
    await generateWordOfDay(['merci', 'oui'], 2);
    const systemPrompt = callAI.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toContain('merci');
    expect(systemPrompt).toContain('oui');
  });

  it('caps the avoid-list to keep the prompt bounded', async () => {
    callAI.mockResolvedValue(VALID);
    const many = Array.from({ length: 200 }, (_, i) => `word${i}`);
    await generateWordOfDay(many, 200);
    const systemPrompt = callAI.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toContain('word0');
    expect(systemPrompt).toContain('word79');
    expect(systemPrompt).not.toContain('word80');
  });

  it('uses advanced guidance once enough words are learned', async () => {
    callAI.mockResolvedValue(VALID);
    await generateWordOfDay([], 50);
    const systemPrompt = callAI.mock.calls[0][1].systemPrompt as string;
    expect(systemPrompt).toContain('idiomatic');
  });

  it('throws on a malformed response', async () => {
    callAI.mockResolvedValue('not json at all');
    await expect(generateWordOfDay([], 0)).rejects.toThrow();
  });

  it('throws when required fields are missing', async () => {
    callAI.mockResolvedValue(JSON.stringify({ word: 'x' }));
    await expect(generateWordOfDay([], 0)).rejects.toThrow(
      /Malformed word-of-the-day/
    );
  });
});
