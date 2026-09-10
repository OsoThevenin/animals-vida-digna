import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './section';

const meta: Meta<typeof Section> = {
  title: 'Primitives/Section',
  component: Section,
};

export default meta;
type Story = StoryObj<typeof Section>;

export const Tinted: Story = {
  args: {
    title: 'Les nostres colònies',
    tone: 'tint',
    children: <p className="text-center text-text-muted">Contingut</p>,
  },
};

export const Dark: Story = {
  args: {
    title: 'Contacta amb nosaltres',
    tone: 'dark',
    width: 'narrow',
    children: <p className="text-center text-surface/80">Contingut</p>,
  },
};
