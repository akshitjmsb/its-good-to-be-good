import type { Meta, StoryObj } from '@storybook/react';
import { PhilosophicalQuote } from '../react/PhilosophicalQuote';

const meta: Meta<typeof PhilosophicalQuote> = {
  title: 'Components/PhilosophicalQuote',
  component: PhilosophicalQuote,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    quote: 'The unexamined life is not worth living.',
    author: 'Socrates',
  },
};

export const LongQuote: Story = {
  args: {
    quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
    author: 'Aristotle',
  },
};

export const ModernQuote: Story = {
  args: {
    quote: 'The only way to deal with an unfree world is to become so absolutely free that your very existence is an act of rebellion.',
    author: 'Albert Camus',
  },
};

export const ShortQuote: Story = {
  args: {
    quote: 'I think, therefore I am.',
    author: 'René Descartes',
  },
};

export const Inspirational: Story = {
  args: {
    quote: 'The future belongs to those who believe in the beauty of their dreams.',
    author: 'Eleanor Roosevelt',
  },
};
