// src/pages/AdminMessages.jsx
import { useParams, Link } from "react-router-dom";
import {
  Table,
  ScrollArea,
  Group,
  Button,
  Modal,
  Loader,
  Stack,
  ActionIcon,
  Title,
  Breadcrumbs,
  Badge,
  Text,
} from "@mantine/core";
import {
  IconTrash,
  IconDownload,
  IconArrowLeft,
  IconReload,
} from "@tabler/icons-react";
import * as XLSX from "xlsx";
import { useEffect, useState, useCallback } from "react";
import { db } from "../lib/firebase";
import { ref, get, query, orderByKey, remove, child } from "firebase/database";
import dayjs from "dayjs";

const dbPath = (id) => `/events/${id}/public/messages`;
const fmt = (ts) => (ts ? dayjs(ts).format("DD/MM/YYYY HH:mm") : "");

const getLikeCount = (r) =>
  typeof r.likesCount === "number"
    ? r.likesCount
    : Object.keys(r.likes || {}).length;

export default function AdminMessages() {
  const { id } = useParams();

  // State
  const [rows, setRows] = useState(null); // null = cargando
  const [open, setOpen] = useState(false); // Modal confirmación
  const [target, setTarget] = useState(null); // 'ALL' o key del mensaje

  // Cargar datos
  const load = useCallback(async () => {
    const snap = await get(query(ref(db, dbPath(id)), orderByKey()));
    const arr = [];

    if (snap.exists()) {
      snap.forEach((s) => {
        arr.push({ key: s.key, ...s.val() });
      });
    }

    setRows(arr);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Borrar un mensaje
  const delOne = (k) => {
    setTarget(k);
    setOpen(true);
  };

  // Borrar todos los mensajes
  const delAll = () => {
    setTarget("ALL");
    setOpen(true);
  };

  // Confirmar borrado
  const confirm = async () => {
    if (target === "ALL") {
      await remove(ref(db, dbPath(id)));
    } else {
      await remove(child(ref(db), `${dbPath(id)}/${target}`));
    }
    setOpen(false);
    load();
  };

  // Exportar a Excel
  const exportXlsx = () => {
    if (!rows?.length) return;

    const data = rows.map((r) => {
      const type =
        (r.type || "message") === "question" ? "Pregunta" : "Mensaje";
      const isQuestion = type === "Pregunta";

      return {
        Usuario: r.name || "",
        Tipo: type,
        Mensaje: r.text || "",
        Fecha: fmt(r.ts),
        Likes: isQuestion ? getLikeCount(r) : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Chat");
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
        <Button leftSection={<IconReload size={16} />} onClick={load}>
          Recargar
        </Button>

        <Button
          leftSection={<IconDownload size={16} />}
          onClick={exportXlsx}
          disabled={!rows.length}
        >
          Exportar
        </Button>

        <Button
          color="red"
          leftSection={<IconTrash size={16} />}
          onClick={delAll}
          disabled={!rows.length}
        >
          Borrar todo
        </Button>
      </Group>

      {!rows.length ? (
        <Text c="dimmed">No hay mensajes para este evento.</Text>
      ) : (
        <ScrollArea h={500}>
          <Table striped highlightOnHover withColumnBorders>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Mensaje</th>
                <th>Fecha</th>
                <th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isQuestion = (r.type || "message") === "question";

                return (
                  <tr
                    key={r.key}
                    style={
                      isQuestion
                        ? { background: "var(--mantine-color-blue-0)" }
                        : undefined
                    }
                  >
                    <td>{r.name}</td>

                    <td>
                      <Badge
                        variant={isQuestion ? "filled" : "light"}
                        color={isQuestion ? "blue" : "gray"}
                        size="sm"
                      >
                        {isQuestion ? "Pregunta" : "Mensaje"}
                      </Badge>
                    </td>

                    <td style={{ fontWeight: isQuestion ? 600 : 400 }}>
                      {r.text}
                    </td>

                    <td>{fmt(r.ts)}</td>

                    <td>
                      <ActionIcon
                        color="red"
                        variant="subtle"
                        onClick={() => delOne(r.key)}
                        aria-label="Borrar mensaje"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </ScrollArea>
      )}

      {/* Modal confirmación */}
      <Modal
        opened={open}
        onClose={() => setOpen(false)}
        title="Confirmar borrado"
        centered
      >
        <Stack gap="md">
          <Text>
            {target === "ALL"
              ? "¿Seguro que deseas eliminar TODOS los mensajes del evento?"
              : "¿Seguro que deseas eliminar este mensaje?"}
          </Text>

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
