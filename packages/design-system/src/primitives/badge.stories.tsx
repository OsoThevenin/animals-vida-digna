import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './badge';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Badge',
  component: Badge,
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Available: Story = {
  args: { label: 'Disponible', status: 'available' },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge label="Disponible" status="available" />
      <Badge label="Adoptat" status="adopted" />
      <Badge label="En tractament" status="treatment" />
      <Badge label="No disponible" status="unavailable" />
    </div>
  ),
};
