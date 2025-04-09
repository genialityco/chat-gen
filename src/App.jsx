import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import Chat from './components/Chat';

export default function App({ query }) {
  // permite cambiar color principal desde ?primaryColor=teal
  const primaryColor = query.primaryColor || 'indigo';

  return (
    <MantineProvider theme={{ primaryColor }}>
      <Notifications position="top-right" />
      <Chat {...query} />
    </MantineProvider>
  );
}
