import type { Meta, StoryObj } from '@storybook/react-vite';
import { CatCard } from './cat-card';

const meta: Meta<typeof CatCard> = {
  title: 'Patterns/CatCard',
  component: CatCard,
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatCard>;

export const Available: Story = {
  args: {
    name: 'Mia',
    description:
      'Una gata tranquil·la que busca una llar on prendre el sol cada tarda.',
    statusLabel: 'Disponible',
    status: 'available',
    href: '#',
  },
};

export const Adopted: Story = {
  args: {
    name: 'Nil',
    description: 'Ja ha trobat una família.',
    statusLabel: 'Adoptat',
    status: 'adopted',
    href: '#',
  },
};

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-5xl">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <CatCard name="Mia" status="available" statusLabel="Disponible" />
      <CatCard name="Nil" status="adopted" statusLabel="Adoptat" />
      <CatCard name="Lluna" status="treatment" statusLabel="En tractament" />
    </div>
  ),
};
