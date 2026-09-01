import type { Meta, StoryObj } from '@storybook/react-vite';
import { CatTraits } from './cat-traits';

const meta: Meta<typeof CatTraits> = {
  title: 'Patterns/CatTraits',
  component: CatTraits,
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CatTraits>;

export const FullProfile: Story = {
  args: {
    statusLabel: 'Disponible',
    status: 'available',
    traits: [
      { term: 'Raça', value: 'Comú europeu' },
      { term: 'Edat', value: '3 anys' },
      { term: 'Sexe', value: 'Femella' },
      { term: 'Mida', value: 'Mitjana' },
      { term: 'Pes', value: '4 kg' },
      { term: 'Salut', value: 'Sana' },
    ],
    personalityTitle: 'Personalitat',
    personality: ['Juganera', 'Tranquil·la', 'Afectuosa'],
    goodWithTitle: 'Compatible amb',
    goodWith: ['Nens', 'Altres gats'],
    medical: [
      { label: 'Vacunada', done: true },
      { label: 'Microxip', done: true },
      { label: 'Esterilitzada', done: false },
    ],
    specialNeeds: 'Necessita medicació diària per a una condició crònica.',
  },
};
