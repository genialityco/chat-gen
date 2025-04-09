// src/pages/AdminMessages.jsx
import { useParams, Link } from 'react-router-dom';
import {
  Table, ScrollArea, Group, Button, Modal, Loader,
  Stack, ActionIcon, Title, Breadcrumbs
} from '@mantine/core';
import { IconTrash, IconDownload, IconArrowLeft, IconReload } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { ref, get, query, orderByKey, remove, child } from 'firebase/database';
import dayjs from 'dayjs';

const path = (id) => `/events/${id}/public/messages`;
const fmt  = (ts) => dayjs(ts).format('DD/MM/YYYY HH:mm');

export default function AdminMessages() {
  const { id } = useParams();

  // State
  const [rows,   setRows]   = useState(null); // Todos los mensajes del evento
  const [open,   setOpen]   = useState(false); // Modal de confirmación
  const [target, setTarget] = useState(null);  // 'ALL' o el ID de un mensaje

  // Cargar datos
  const load = async () => {
    const snap = await get(query(ref(db, path(id)), orderByKey()));
    const arr = [];
    snap.forEach(s => {
      // Cada snapshot es un mensaje
      arr.push({ key: s.key, ...s.val() });
    });
    // arr tendrá varias filas, incluso si pertenecen al mismo nombre
    setRows(arr);
  };

  useEffect(() => {
    load();
  }, [id]);

  // Borrar un mensaje
  const delOne = (k) => {
    setTarget(k);
    setOpen(true);
  };

  // Borrar todos los mensajes
  const delAll = () => {
    setTarget('ALL');
    setOpen(true);
  };

  // Confirmar en modal
  const confirm = async () => {
    if (target === 'ALL') {
      // Borrar TODO el nodo
      await remove(ref(db, path(id)));
    } else {
      // Borrar solo un mensaje
      await remove(child(ref(db), `${path(id)}/${target}`));
    }
    setOpen(false);
    load();
  };

  // Exportar a Excel
  const exportXlsx = () => {
    // Cada mensaje es una fila
    const data = rows.map(r => ({
      Usuario: r.name,
      Mensaje: r.text,
      Fecha:   fmt(r.ts),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Chat');
    XLSX.writeFile(wb, `chat_${id}.xlsx`);
  };

  // Mientras carga...
  if (!rows) return <Loader mx="auto" mt="xl" />;

  return (
    <Stack p="lg">
      {/* Migas de pan */}
      <Breadcrumbs>
        <Link to="/admin">Eventos</Link>
        <span>{id}</span>
      </Breadcrumbs>

      <Group justify="space-between">
        <Title order={4}>Mensajes del evento</Title>
        <Button
          size="xs"
          leftSection={<IconArrowLeft size={14} />}
          component={Link}
          to="/admin"
        >
          Volver
        </Button>
      </Group>

      <Group my="sm">
        {/* Recargar */}
        <Button leftSection={<IconReload size={16} />} onClick={load}>
          Recargar
        </Button>

        {/* Exportar */}
        <Button
          leftSection={<IconDownload size={16} />}
          onClick={exportXlsx}
          disabled={!rows.length}
        >
          Exportar
        </Button>

        {/* Borrar todo */}
        <Button
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={delAll}
          disabled={!rows.length}
        >
          Borrar todo
        </Button>
      </Group>

      <ScrollArea h={500}>
        <Table striped highlightOnHover>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Mensaje</th>
              <th>Fecha</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {/* Para cada mensaje, una fila */}
            {rows.map(r => (
              <tr key={r.key}>
                <td>{r.name}</td>
                <td>{r.text}</td>
                <td>{fmt(r.ts)}</td>
                {/* Botón de borrar */}
                <td>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => delOne(r.key)}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ScrollArea>

      {/* Modal confirmación */}
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title="Confirmar borrado"
        centered
      >
        <Stack gap="md">
          <p>
            {target === 'ALL'
              ? '¿Seguro que deseas eliminar TODOS los mensajes del evento?'
              : '¿Seguro que deseas eliminar este mensaje?'}
          </p>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button color="red" onClick={confirm}>
              Borrar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
