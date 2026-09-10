import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './header';

const meta: Meta<typeof Header> = {
  title: 'Patterns/Header',
  component: Header,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Landing: Story = {
  args: {
    links: [
      { label: 'Qui som', href: '/#qui-som' },
      { label: 'Gats', href: '/#gats' },
      { label: 'Colònies', href: '/#colonies' },
      { label: 'Col·labora', href: '/#colabora' },
      { label: 'Contacte', href: '/#contacte' },
    ],
    donate: { label: 'Fes un donatiu', href: '#donatiu' },
    localeLabel: 'CA',
  },
};
