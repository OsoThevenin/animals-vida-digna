import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';
import { Field } from './field';
import { Input } from './input';

const meta: Meta<typeof Field> = {
  title: 'Primitives/Field',
  component: Field,
};

export default meta;
type Story = StoryObj<typeof Field>;

export const ContactForm: Story = {
  render: () => (
    <form className="max-w-md">
      <Field id="contact-name" label="Nom">
        <Input id="contact-name" required />
      </Field>
      <Field id="contact-email" label="Correu electrònic">
        <Input id="contact-email" required type="email" />
      </Field>
      <Field
        error="El missatge és obligatori"
        id="contact-message"
        label="Missatge"
      >
        <Input id="contact-message" rows={4} type="textarea" />
      </Field>
      <Button fullWidth type="submit" variant="primary">
        Envia
      </Button>
    </form>
  ),
};
