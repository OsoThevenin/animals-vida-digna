import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './card';

const meta: Meta<typeof Card> = {
  title: 'Primitives/Card',
  component: Card,
};

export default meta;
type Story = StoryObj<typeof Card>;

export const WithPlaceholder: Story = {
  args: {
    imageAlt: '',
    children: <p className="text-text">Una targeta sense imatge</p>,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const Linked: Story = {
  args: {
    href: '#',
    imageAlt: '',
    children: <p className="text-text">Tota la targeta és un enllaç</p>,
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};
