import type { Meta, StoryObj } from '@storybook/react-vite';
import { Footer } from './footer';

const meta: Meta<typeof Footer> = {
  title: 'Patterns/Footer',
  component: Footer,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Footer>;

export const Landing: Story = {
  args: {
    tagline: 'Refugi de gats a la comarca.',
    navTitle: 'Navegació',
    links: [
      { label: 'Qui som', href: '/#qui-som' },
      { label: 'Gats', href: '/#gats' },
      { label: 'Col·labora', href: '/#colabora' },
      { label: 'Contacte', href: '/#contacte' },
    ],
    socialTitle: 'Xarxes socials',
    donate: { label: 'Fes un donatiu', href: '#donatiu' },
    copyright: '© 2026 Animals Vida Digna. Tots els drets reservats.',
  },
};
