// src/pages/AdminEvents.jsx
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, get } from 'firebase/database';
import { Stack, Title, Card, Text, Loader } from '@mantine/core';
import { Link } from 'react-router-dom';

export default function AdminEvents() {
  const [events, setEvents] = useState(null);

  useEffect(() => {
    get(ref(db, '/events')).then(snap => {
      const arr = [];
      snap.forEach(child => {
        const meta = child.val().meta || {};      // espera un nodo meta con nombre
        arr.push({ id: child.key, name: meta.name || child.key });
      });
      setEvents(arr);
    });
  }, []);

  if (!events) return <Loader mx="auto" mt="xl" />;

  return (
    <Stack p="lg">
      <Title order={3}>Eventos</Title>
      {events.map(ev => (
        <Card key={ev.id} withBorder>
          <Link to={`/admin/${ev.id}`}>
            <Text fw={500}>{ev.name}</Text>
            <Text size="xs" c="dimmed">{ev.id}</Text>
          </Link>
        </Card>
      ))}
    </Stack>
  );
}
