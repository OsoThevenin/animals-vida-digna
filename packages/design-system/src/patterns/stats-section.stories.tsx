import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatsSection } from './stats-section';

const meta: Meta<typeof StatsSection> = {
  title: 'Patterns/StatsSection',
  component: StatsSection,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof StatsSection>;

export const Landing: Story = {
  args: {
    title: 'La nostra feina en xifres',
    items: [
      { value: '312', label: 'Gats rescatats' },
      { value: '248', label: 'Adopcions' },
      { value: '14', label: 'Colònies cuidades' },
      { value: '40', label: 'Voluntaris' },
    ],
  },
};
