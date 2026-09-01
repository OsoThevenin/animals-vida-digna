import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Input',
  component: Input,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Text: Story = {
  args: { id: 'name', placeholder: 'El teu nom' },
};

export const Email: Story = {
  args: { id: 'email', type: 'email', placeholder: 'nom@exemple.cat' },
};

export const Textarea: Story = {
  args: {
    id: 'message',
    type: 'textarea',
    rows: 4,
    placeholder: 'Com vols col·laborar amb nosaltres?',
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Input id="all-name" placeholder="Nom" />
      <Input id="all-email" placeholder="Correu" type="email" />
      <Input id="all-phone" placeholder="Telèfon" type="tel" />
      <Input id="all-message" placeholder="Missatge" rows={3} type="textarea" />
    </div>
  ),
};
