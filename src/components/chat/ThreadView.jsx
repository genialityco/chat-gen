// components/ThreadView.jsx
import { useCallback, useEffect } from "react";
import {
  ActionIcon,
  Avatar,
  Flex,
  Group,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  rem,
} from "@mantine/core";
import { IconArrowLeft, IconSend } from "@tabler/icons-react";
import dayjs from "dayjs";
import MessageBubble from "./MessageBubble";
import { getInitials, getLikeCount, isLikedByUser } from "./utils";

export default function ThreadView({
  selectedThread,
  myName,
  userKey,
  onBack,
  threadText,
  setThreadText,
  onSendThread,
  threadViewportRef,
  message_highlighted,
  onToggleLike,
}) {
  const scrollThreadToBottom = useCallback(
    (behavior = "auto") => {
      const el = threadViewportRef?.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    [threadViewportRef]
  );

  // ✅ al entrar / cuando llegan replies, mantener abajo
  useEffect(() => {
    if (!selectedThread) return;
    const id = requestAnimationFrame(() => scrollThreadToBottom("auto"));
    return () => cancelAnimationFrame(id);
  }, [
    selectedThread?.question?.key,
    selectedThread?.replies?.length,
    scrollThreadToBottom,
    selectedThread,
  ]);

  if (!selectedThread) {
    return (
      <Text size="sm" c="dimmed">
        No se encontró el hilo.
      </Text>
    );
  }

  const q = selectedThread.question;
  const timeQ = typeof q.ts === "number" ? dayjs(q.ts).format("HH:mm") : "";
  const likeCount = getLikeCount(q);
  const liked = isLikedByUser(q, userKey);

  return (
    <>
      <Group justify="space-between" align="center">
        <Group gap="xs" align="center">
          <ActionIcon
            variant="subtle"
            onClick={onBack}
            aria-label="Volver"
            title="Volver"
          >
            <IconArrowLeft size={18} />
          </ActionIcon>
          <Text fw={600}>Respuestas</Text>
        </Group>
      </Group>

      {/* Pregunta */}
      <MessageBubble
        m={q}
        isQuestion
        time={timeQ}
        bg="blue.0"
        liked={liked}
        likeCount={likeCount}
        isLiveQuestionsCard={false}
        showReplyAction={false}
        showViewReplies={false}
        viewRepliesCount={0}
        onViewReplies={null}
        hideReplyQuote
        message_highlighted={message_highlighted}
        onToggleLike={onToggleLike}
      />

      {/* Mensajes del hilo */}
      <ScrollArea flex="1" offsetScrollbars viewportRef={threadViewportRef}>
        <Stack
          gap="xs"
          pr="sm"
          style={{
            minHeight: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          {selectedThread.replies.length === 0 ? (
            <Text size="sm" c="dimmed">
              Aún no hay respuestas.
            </Text>
          ) : (
            selectedThread.replies.map((r) => {
              const mineR = r.name === myName;
              const timeR =
                typeof r.ts === "number" ? dayjs(r.ts).format("HH:mm") : "";
              const justifyR = mineR ? "flex-end" : "flex-start";
              const bgR = mineR ? "white" : "gray.0";

              return (
                <Flex key={r.key} justify={justifyR} gap="xs" w="100%">
                  {!mineR && (
                    <Avatar radius="xl" size="md" color="gray">
                      {getInitials(r.name)}
                    </Avatar>
                  )}

                  <MessageBubble
                    m={r}
                    isQuestion={false}
                    time={timeR}
                    bg={bgR}
                    liked={false}
                    likeCount={0}
                    isLiveQuestionsCard={false}
                    showReplyAction={false}
                    showViewReplies={false}
                    viewRepliesCount={0}
                    onViewReplies={null}
                    hideReplyQuote
                    message_highlighted={message_highlighted}
                  />

                  {mineR && (
                    <Avatar radius="xl" size="md" color="blue">
                      {getInitials(r.name)}
                    </Avatar>
                  )}
                </Flex>
              );
            })
          )}
        </Stack>
      </ScrollArea>

      {/* Input del hilo */}
      <form onSubmit={onSendThread}>
        <Flex gap="xs" align="center">
          <TextInput
            flex="1"
            placeholder="Escribe una respuesta…"
            value={threadText}
            onChange={(e) => setThreadText(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) onSendThread(e);
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
    </>
  );
}
