import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hero } from './hero';

const meta: Meta<typeof Hero> = {
  title: 'Patterns/Hero',
  component: Hero,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Hero>;

export const Landing: Story = {
  args: {
    title: 'Una vida digna per a cada gat',
    subtitle:
      'Rescatem, cuidem i busquem llar per als gats abandonats de la comarca.',
    primaryCta: { label: "Adopta'm", href: '#gats' },
    secondaryCta: { label: 'Fes un donatiu', href: '#donatiu' },
  },
};

export const TextOnly: Story = {
  args: {
    title: 'Col·labora amb nosaltres',
    subtitle: 'Cada ajuda compta, per petita que sigui.',
  },
};
