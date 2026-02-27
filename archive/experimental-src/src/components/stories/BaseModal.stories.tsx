import type { Meta, StoryObj } from '@storybook/react';
import { BaseModal } from '../react/BaseModal';

const meta: Meta<typeof BaseModal> = {
  title: 'Components/BaseModal',
  component: BaseModal,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    onClose: { action: 'modal closed' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Sample Modal',
    onClose: () => {},
    children: 'This is a sample modal content for design purposes.',
  },
};

export const WithLongContent: Story = {
  args: {
    isOpen: true,
    title: 'Long Content Modal',
    onClose: () => {},
    children: 'This modal contains longer content to test how it looks in different scenarios. Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  },
};

export const WithForm: Story = {
  args: {
    isOpen: true,
    title: 'Form Modal',
    onClose: () => {},
    children: 'Form content with name and email fields would go here.',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    title: 'Closed Modal',
    onClose: () => {},
    children: 'This modal is closed and should not be visible.',
  },
};
