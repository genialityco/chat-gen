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

import EmojiPicker from "emoji-picker-react";

const PAGE = 40;
const getInitials = (name = "") => name.slice(0, 2).toUpperCase();

// Añade esto cerca de tus imports (no requiere librerías extra)
const linkRegex =
  /((https?:\/\/|www\.)[^\s<>"'()]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function renderWithLinks(text = "") {
  const nodes = [];
  let lastIndex = 0;

  text.replace(linkRegex, (match, _g1, _g2, email, offset) => {
    // Texto plano previo al match
    if (lastIndex < offset) {
      nodes.push(text.slice(lastIndex, offset));
    }

    // Determinar href
    let href = match;
    if (email) {
      href = `mailto:${match}`;
    } else if (/^www\./i.test(match)) {
      href = `https://${match}`;
    }

    nodes.push(
      <a
        key={`${match}-${offset}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ wordBreak: "break-all" }}
      >
        {match}
      </a>
    );

    lastIndex = offset + match.length;
    return match;
  });

  // Resto del texto
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes;
}

export default function Chat({
  nombre,
  chatid,
  iduser,
  eventid,
  anonimo = "false",
  message_highlighted = "",
}) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loadingMore, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef(null);

  // Ref para el contenedor del picker
  const emojiPickerRef = useRef(null);

  const path = iduser
    ? `/events/${eventid}/private/${chatid}/messages`
    : `/events/${eventid}/public/messages`;

  /* ---------------- carga inicial + suscripción ---------------- */
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

  /* ----------------- paginar hacia arriba ---------------- */
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

  /* ----------------- enviar mensaje ---------------------- */
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

  /* --- función para manejar clic en un emoji ------------- */
  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  /* --- efecto para detectar clic fuera del picker -------- */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    // Limpia el listener al desmontar o al cambiar showEmojiPicker
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  /* --------------------- render -------------------------- */
  return (
    <Flex direction="column" h="100vh" p="md" gap="sm">
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
                <Group justify="space-between" mb={4}>
                  <Text size="xs" fw={600}>
                    {m.name}
                  </Text>
                  <Text size="xs" c={mine ? "white" : "dimmed"}>
                    {time}
                  </Text>
                </Group>
                <Text
                  size="sm"
                  lh={1.4}
                  style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {renderWithLinks(m.text)}
                </Text>
              </Paper>
            );

            return (
              <Flex key={m.key} justify={align} gap="xs" w="100%">
                {/* Avatar a la izquierda/derecha según autor */}
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

      {/* formulario de envío */}
      <form onSubmit={send}>
        <Flex gap="xs">
          {/* Botón para mostrar/ocultar el picker */}
          <ActionIcon
            variant="subtle"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
          >
            <Text>😀</Text>
          </ActionIcon>

          {/* Picker, dentro de un contenedor con ref */}
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              style={{ position: "absolute", bottom: "60px" }}
            >
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}

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
