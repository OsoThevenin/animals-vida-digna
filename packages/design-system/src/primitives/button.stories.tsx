import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Accent: Story = {
  args: { children: "Adopta'm", href: '#adopt' },
};

export const Primary: Story = {
  args: { children: 'Envia el missatge', variant: 'primary', type: 'submit' },
};

export const Outline: Story = {
  args: { children: 'Fes un donatiu', variant: 'outline', href: '#donate' },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (Story) => (
      <div className="bg-primary-dark p-8">
        <Story />
      </div>
    ),
  ],
};
