import type { Meta, StoryObj } from '@storybook/react-vite';
import { ContactCta } from './contact-cta';

const meta: Meta<typeof ContactCta> = {
  title: 'Patterns/ContactCta',
  component: ContactCta,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ContactCta>;

export const Landing: Story = {
  args: {
    id: 'contacte',
    title: 'Vols saber-ne més?',
    subtitle:
      'Escriu-nos i et respondrem tan aviat com puguem. Sempre busquem mans que ajudin.',
    cta: { label: 'Contacta amb nosaltres', href: '/contact' },
  },
};
