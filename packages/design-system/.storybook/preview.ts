import type { Preview } from '@storybook/react-vite';
import '../src/styles.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'surface',
      values: [
        { name: 'surface', value: '#fff8f0' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
};

export default preview;
