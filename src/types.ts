export type PoetrySelection = { poet: string; language: string; timestamp: number };

export type Task = { text: string; completed: boolean };

export type ChatMessage = { role: 'user' | 'model'; text: string };
