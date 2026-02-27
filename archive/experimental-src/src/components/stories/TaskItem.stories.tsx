import type { Meta, StoryObj } from '@storybook/react';
import { TaskItem } from '../react/TaskItem';

const meta: Meta<typeof TaskItem> = {
  title: 'Components/TaskItem',
  component: TaskItem,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onToggle: { action: 'toggled' },
    onDelete: { action: 'deleted' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    task: { text: 'Sample task', completed: false },
    onToggle: () => {},
    onDelete: () => {},
  },
};

export const Completed: Story = {
  args: {
    task: { text: 'Completed task', completed: true },
    onToggle: () => {},
    onDelete: () => {},
  },
};

export const LongText: Story = {
  args: {
    task: { 
      text: 'This is a very long task description that should wrap properly and show how the component handles longer text content', 
      completed: false 
    },
    onToggle: () => {},
    onDelete: () => {},
  },
};

export const Interactive: Story = {
  args: {
    task: { text: 'Interactive task', completed: false },
    onToggle: () => console.log('Task toggled'),
    onDelete: () => console.log('Task deleted'),
  },
};
