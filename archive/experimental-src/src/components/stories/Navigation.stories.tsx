import type { Meta, StoryObj } from '@storybook/react';
import { Navigation } from '../react/Navigation';

const meta: Meta<typeof Navigation> = {
  title: 'Components/Navigation',
  component: Navigation,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    onModalClick: { action: 'modal clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onModalClick: (modalType: string) => console.log(`Modal clicked: ${modalType}`),
    isMobile: false,
  },
};

export const Mobile: Story = {
  args: {
    onModalClick: (modalType: string) => console.log(`Modal clicked: ${modalType}`),
    isMobile: true,
  },
};

export const Interactive: Story = {
  args: {
    onModalClick: (modalType: string) => {
      alert(`Opening ${modalType} modal`);
    },
    isMobile: false,
  },
};
