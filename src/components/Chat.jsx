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
  Badge,
} from "@mantine/core";
import { IconSend, IconThumbUp } from "@tabler/icons-react";
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
  runTransaction,
} from "firebase/database";
import { db } from "../lib/firebase";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

import EmojiPicker from "emoji-picker-react";

const PAGE = 40;
const getInitials = (name = "") => name.slice(0, 2).toUpperCase();

const linkRegex =
  /((https?:\/\/|www\.)[^\s<>"'()]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function renderWithLinks(text = "") {
  const nodes = [];
  let lastIndex = 0;

  text.replace(linkRegex, (match, _g1, _g2, email, offset) => {
    if (lastIndex < offset) {
      nodes.push(text.slice(lastIndex, offset));
    }

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

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

const getSearchParam = (key) => {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get(key) || "";
  } catch {
    return "";
  }
};

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
  const [asQuestion, setAsQuestion] = useState(false);
  const bottomRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const view = (getSearchParam("view") || "").toLowerCase();
  const isQuestionsView = view === "questions";

  const path = iduser
    ? `/events/${eventid}/private/${chatid}/messages`
    : `/events/${eventid}/public/messages`;

  // identificador para likes (si no tienes iduser real, usará el nombre)
  const userKey = iduser || nombre || "anon";

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

    const isQ = isQuestionsView || asQuestion;

    const payload = {
      text: value,
      name: anonimo === "true" ? "Anónimo" : nombre,
      ts: serverTimestamp(),
      type: isQ ? "question" : "message",
      ...(isQ
        ? {
            highlighted: true,
            likesCount: 0, // 🔹 contador numérico inicializado en 0
            likes: {}, // 🔹 mapa de usuarios que han dado like
          }
        : {}),
    };

    push(ref(db, path), payload);
    setText("");
  };

  /* --- forzar modo pregunta cuando estás en view=questions ---- */
  useEffect(() => {
    if (isQuestionsView) setAsQuestion(true);
  }, [isQuestionsView]);

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

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  /* --- helpers de likes --------------------------------- */
  // si existe likesCount lo usamos; si no, contamos las claves de likes
  const getLikeCount = (m) =>
    typeof m.likesCount === "number"
      ? m.likesCount
      : Object.keys(m.likes || {}).length;

  const isLikedByMe = (m) => !!(m.likes && userKey && m.likes[userKey]);

  const toggleLike = async (m) => {
    if (!userKey) return;
    const msgRef = ref(db, `${path}/${m.key}`);

    await runTransaction(msgRef, (current) => {
      if (!current) return current;

      const likes = current.likes || {};
      const already = !!likes[userKey];
      const newLikes = { ...likes };

      if (already) {
        delete newLikes[userKey];
      } else {
        newLikes[userKey] = true;
      }

      const currentCount =
        typeof current.likesCount === "number"
          ? current.likesCount
          : Object.keys(likes).length;

      const newCount = currentCount + (already ? -1 : 1);

      return {
        ...current,
        likes: newLikes,
        likesCount: newCount < 0 ? 0 : newCount,
      };
    });
  };

  /* --- lista derivada para vista ------------------------- */
  const { displayed } = useMemo(() => {
    const norm = (messages || []).map((m) => ({
      ...m,
      type: m.type || "message",
    }));

    const qs = norm.filter((m) => m.type === "question");

    if (isQuestionsView) {
      // ordenar preguntas por likes desc y luego por ts desc
      const sorted = [...qs].sort((a, b) => {
        const la = getLikeCount(a);
        const lb = getLikeCount(b);
        if (lb !== la) return lb - la;

        const ta = typeof a.ts === "number" ? a.ts : 0;
        const tb = typeof b.ts === "number" ? b.ts : 0;
        return tb - ta;
      });

      return { displayed: sorted };
    }

    return { displayed: norm };
  }, [messages, isQuestionsView]);

  /* --------------------- render -------------------------- */
  return (
    <Flex direction="column" h="100vh" p="md" gap="sm">
      {/* lista de mensajes */}
      <ScrollArea flex="1" offsetScrollbars onScrollPositionChange={onScroll}>
        <Stack gap="md" pr="sm">
          {loadingMore && <Loader size="xs" mx="auto" my="xs" />}

          {displayed.map((m) => {
            const mine =
              m.name === nombre || (anonimo === "true" && m.name === "Anónimo");
            const time = m.ts ? dayjs(m.ts).format("HH:mm") : "";
            const isQuestion = (m.type || "message") === "question";

            // REGLA DE ALINEACIÓN:
            // - En view=questions: preguntas izq/der según mine
            // - En chat en vivo: preguntas centradas
            // - Mensajes normales: izq/der según mine
            let justify;
            if (isQuestionsView && isQuestion) {
              justify = mine ? "flex-end" : "flex-start";
            } else if (!isQuestionsView && isQuestion) {
              justify = "center";
            } else {
              justify = mine ? "flex-end" : "flex-start";
            }

            // Paleta más suave y limpia
            const bg = isQuestion ? "blue.0" : mine ? "white" : "gray.0";

            const likeCount = isQuestion ? getLikeCount(m) : 0;
            const liked = isQuestion ? isLikedByMe(m) : false;

            const bubble = (
              <Paper
                radius={12}
                p={isQuestion ? "md" : "sm"}
                mt="xs"
                w="fit-content"
                bg={bg}
                c="black"
                shadow="xs"
                withBorder
                style={{
                  whiteSpace: "normal",
                  maxWidth: "min(760px, 92%)",
                  borderColor: isQuestion ? "#1da10fff" : "#021222ff",
                }}
              >
                <Group justify="space-between" mb={isQuestion ? 8 : 4}>
                  <Text size={isQuestion ? "sm" : "xs"} fw={600} c="dimmed">
                    {m.name}
                  </Text>
                  <Text size={isQuestion ? "sm" : "xs"} c="dimmed">
                    {time}
                  </Text>
                </Group>

                <Text
                  size={isQuestion ? "md" : "sm"}
                  lh={isQuestion ? 1.5 : 1.4}
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    ...(m.text?.includes(message_highlighted)
                      ? { fontWeight: 600, filter: "brightness(1.03)" }
                      : {}),
                  }}
                >
                  {renderWithLinks(m.text)}
                </Text>

                {isQuestion && (
                  <Group justify="space-between" mt="xs" align="center">
                    <Badge
                      variant="light"
                      color="blue"
                      size="sm"
                      leftSection={
                        <Text size="xs" c="blue" fw={700}>
                          ?
                        </Text>
                      }
                    >
                      PREGUNTA
                    </Badge>

                    <Group gap={4} align="center">
                      <ActionIcon
                        variant={liked ? "filled" : "subtle"}
                        size="sm"
                        onClick={() => toggleLike(m)}
                      >
                        <IconThumbUp size={14} />
                      </ActionIcon>
                      <Text size="xs" c="dimmed">
                        {likeCount}
                      </Text>
                    </Group>
                  </Group>
                )}
              </Paper>
            );

            return (
              <Flex key={m.key} justify={justify} gap="xs" w="100%">
                {/* avatar solo en mensajes normales */}
                {!isQuestion && !mine && (
                  <Avatar radius="xl" size="md" color="gray">
                    {getInitials(m.name)}
                  </Avatar>
                )}

                {bubble}

                {!isQuestion && mine && (
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
        <Flex gap="xs" align="center">
          <ActionIcon
            variant="subtle"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title="Emojis"
          >
            <Text>😀</Text>
          </ActionIcon>

          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              style={{ position: "absolute", bottom: "60px", zIndex: 10 }}
            >
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}

          <TextInput
            flex="1"
            placeholder={
              isQuestionsView || asQuestion
                ? "Escribe tu pregunta…"
                : "Escribe un mensaje…"
            }
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) send(e);
            }}
          />

          <ActionIcon
            type="submit"
            size={rem(36)}
            variant="filled"
            title="Enviar"
          >
            <IconSend size={18} />
          </ActionIcon>
        </Flex>
      </form>
    </Flex>
  );
}
