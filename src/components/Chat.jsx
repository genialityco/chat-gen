import {
  Flex,
  Stack,
  Paper,
  ScrollArea,
  TextInput,
  ActionIcon,
  Text,
  Avatar,
  Group,
  Loader,
  rem,
} from "@mantine/core";
import { IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import {
  ref,
  push,
  onChildAdded,
  get,
  query,
  limitToLast,
  orderByKey,
  endBefore,
  serverTimestamp,
  onChildChanged,
  onChildRemoved,
} from "firebase/database";
import { db } from "../lib/firebase";
import { useEffect, useRef, useState, useCallback } from "react";

/* --- helpers ---------------------------------------------------------- */
const PAGE = 40;
const getInitials = (name = "") => name.slice(0, 2).toUpperCase();

/* --- componente ------------------------------------------------------- */
export default function Chat({
  nombre,
  chatid,
  iduser,
  eventid,
  anonimo = "false",
  message_highlighted = "",
}) {
  /* ---------------- estado ---------------- */
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingMore, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const path = iduser
    ? `/events/${eventid}/private/${chatid}/messages`
    : `/events/${eventid}/public/messages`;

  /* ----------- carga inicial + suscripción -------------- */
  useEffect(() => {
    let unsubAdd, unsubRemove, unsubChange;

    const firstLoad = async () => {
      const snap = await get(query(ref(db, path), limitToLast(PAGE)));
      const arr = [];
      snap.forEach((s) => arr.push({ key: s.key, ...s.val() }));
      setMessages(arr);

      const msgRef = ref(db, path);

      unsubAdd = onChildAdded(msgRef, (s) => {
        setMessages((prev) =>
          prev.find((m) => m.key === s.key)
            ? prev
            : [...prev, { key: s.key, ...s.val() }]
        );
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      });

      unsubRemove = onChildRemoved(msgRef, (s) => {
        setMessages((prev) => prev.filter((m) => m.key !== s.key));
      });

      unsubChange = onChildChanged(msgRef, (s) => {
        setMessages((prev) =>
          prev.map((m) => (m.key === s.key ? { key: s.key, ...s.val() } : m))
        );
      });
    };
    firstLoad();

    return () => {
      unsubAdd && unsubAdd();
      unsubRemove && unsubRemove();
      unsubChange && unsubChange();
    };
  }, [path]);

  /* ------------- paginar hacia arriba ------------------ */
  const loadMore = useCallback(async () => {
    if (loadingMore || !messages.length) return;
    setLoading(true);

    const firstKey = messages[0].key;
    const snap = await get(
      query(ref(db, path), orderByKey(), endBefore(firstKey), limitToLast(PAGE))
    );

    const arr = [];
    snap.forEach((s) => arr.push({ key: s.key, ...s.val() }));
    setMessages((prev) => [...arr, ...prev]);
    setLoading(false);
  }, [loadingMore, messages, path]);

  const onScroll = ({ y }) => y === 0 && loadMore();

  /* ------------- enviar mensaje ------------------------- */
  const send = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    push(ref(db, path), {
      text: value,
      name: anonimo === "true" ? "Anónimo" : nombre,
      ts: serverTimestamp(),
    });
    setText("");
  };

  /* ---------------- render ------------------------------ */
  return (
    <Flex direction="column" h="100vh" p="md" gap="sm">
      {/* encabezado general */}
      {/* <Group gap="xs">
          <Avatar radius="xl" size="sm" color="indigo">
            {getInitials(nombre || 'U')}
          </Avatar>
          <Text fw={600}>
            {iduser ? `Chat con ${nombre}` : 'Chat público'}
          </Text>
        </Group> */}

      {/* lista de mensajes */}
      <ScrollArea flex="1" offsetScrollbars onScrollPositionChange={onScroll}>
        <Stack gap="xs" pr="sm">
          {loadingMore && <Loader size="xs" mx="auto" my="xs" />}
          {messages.map((m) => {
            const mine =
              m.name === nombre || (anonimo === "true" && m.name === "Anónimo");
            const align = mine ? "flex-end" : "flex-start";
            const time = m.ts ? dayjs(m.ts).format("HH:mm") : "";
            const bubble = (
              <Paper
                radius="md"
                p="sm"
                mt="xs"
                w="fit-content"
                bg={mine ? "indigo.6" : "gray.0"}
                c={mine ? "white" : "black"}
                style={
                  m.text.includes(message_highlighted)
                    ? { boxShadow: `0 0 0 1px var(--mantine-color-yellow-6)` }
                    : undefined
                }
              >
                {/* cabecera dentro de la burbuja */}
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={600}>
                    {m.name}
                  </Text>
                  <Text size="xs" c={mine ? "white" : "dimmed"}>
                    {time}
                  </Text>
                </Group>
                <Text size="sm" lh={1.4}>
                  {m.text}
                </Text>
              </Paper>
            );

            return (
              <Flex key={m.key} justify={align} gap="xs" w="100%">
                {/* avatar izquierda/derecha según el autor */}
                {!mine && (
                  <Avatar radius="xl" size="md" color="blue">
                    {getInitials(m.name)}
                  </Avatar>
                )}
                {bubble}
                {mine && (
                  <Avatar radius="xl" size="md" color="blue">
                    {getInitials(m.name)}
                  </Avatar>
                )}
              </Flex>
            );
          })}
          <div ref={bottomRef} />
        </Stack>
      </ScrollArea>

      {/* input */}
      <form onSubmit={send}>
        <Flex gap="xs">
          <TextInput
            flex="1"
            placeholder="Escribe un mensaje…"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
          />
          <ActionIcon type="submit" size={rem(36)} variant="filled">
            <IconSend size={18} />
          </ActionIcon>
        </Flex>
      </form>
    </Flex>
  );
}
