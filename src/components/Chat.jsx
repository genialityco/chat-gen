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
import { IconSend, IconX } from "@tabler/icons-react";
import dayjs from "dayjs";
import { serverTimestamp } from "firebase/database";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import EmojiPicker from "emoji-picker-react";

import { db } from "../lib/firebase";
import { useChatMessages } from "./chat/hooks/useChatMessages.js";

import ThreadView from "./chat/ThreadView.jsx";
import MessageBubble from "./chat/MessageBubble";
import {
  getInitials,
  getLikeCount,
  getSearchParam,
  PAGE,
  buildChatView,
  isLikedByUser,
} from "./chat/utils.js";

export default function Chat({
  nombre,
  chatid,
  iduser,
  eventid,
  anonimo = "false",
  message_highlighted = "",
}) {
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [asQuestion, setAsQuestion] = useState(false);

  // ✅ reply (respuesta tipo whatsapp)
  const [replyTo, setReplyTo] = useState(null);

  // ✅ “ventana” del hilo dentro de Preguntas
  const [selectedQuestionKey, setSelectedQuestionKey] = useState(null);
  const [threadText, setThreadText] = useState("");

  const emojiPickerRef = useRef(null);

  // ✅ ScrollArea viewport refs
  const viewportRef = useRef(null);
  const threadViewportRef = useRef(null);

  const view = (getSearchParam("view") || "").toLowerCase();
  const isQuestionsView = view === "questions";

  const path = iduser
    ? `/events/${eventid}/private/${chatid}/messages`
    : `/events/${eventid}/public/messages`;

  const userKey = iduser || nombre || "anon";
  const myName = anonimo === "true" ? "Anónimo" : nombre;

  const scrollToBottom = useCallback((behavior = "smooth") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const {
    messages,
    loadingMore,
    loadMore,
    sendMessage,
    toggleLike,
    shouldAutoScrollRef,
  } = useChatMessages({
    db,
    path,
    myName,
    userKey,
    pageSize: PAGE,
    isQuestionsView,
    viewportRef,
  });

  // ✅ Auto-scroll después del render si aplica
  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      shouldAutoScrollRef.current = false;
      requestAnimationFrame(() => scrollToBottom("smooth"));
    }
  }, [messages.length, scrollToBottom, shouldAutoScrollRef]);

  const onScroll = ({ y }) => y === 0 && loadMore();

  /* --- forzar modo pregunta cuando estás en view=questions ---- */
  useEffect(() => {
    if (isQuestionsView) setAsQuestion(true);
  }, [isQuestionsView]);

  /* --- emoji picker: click afuera ------------------------------------ */
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    }

    if (showEmojiPicker)
      document.addEventListener("mousedown", handleClickOutside);
    else document.removeEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiData) => setText((prev) => prev + emojiData.emoji);

  /* ----------------- responder ---------------------- */
  const selectReply = useCallback((m) => {
    const isQ = (m.type || "message") === "question";
    const threadKey = isQ ? m.key : m.threadKey || null;

    setReplyTo({
      key: m.key,
      name: m.name || "",
      text: typeof m.text === "string" ? m.text.slice(0, 300) : "",
      threadKey,
      omitQuote: isQ,
    });
  }, []);

  /* ----------------- enviar mensaje (chat principal) ---------------------- */
  const send = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;

    const isThreadReply = !!replyTo?.threadKey;
    const isQ = (isQuestionsView || asQuestion) && !isThreadReply;

    const payload = {
      text: value,
      name: myName,
      ts: serverTimestamp(),
      type: isQ ? "question" : "message",

      ...(replyTo?.key && !replyTo?.omitQuote
        ? {
            replyTo: {
              key: replyTo.key,
              name: replyTo.name,
              text: replyTo.text,
            },
          }
        : {}),

      ...(replyTo?.threadKey ? { threadKey: replyTo.threadKey } : {}),

      ...(isQ ? { highlighted: true, likesCount: 0, likes: {} } : {}),
    };

    shouldAutoScrollRef.current = true;
    sendMessage(payload);

    setText("");
    setShowEmojiPicker(false);
    setReplyTo(null);
  };

  /* ----------------- enviar mensaje dentro del hilo ---------------------- */
  const sendThread = (e) => {
    e.preventDefault();
    const value = threadText.trim();
    if (!value || !selectedQuestionKey) return;

    const payload = {
      text: value,
      name: myName,
      ts: serverTimestamp(),
      type: "message",
      threadKey: selectedQuestionKey,
    };

    sendMessage(payload);
    setThreadText("");

    requestAnimationFrame(() => {
      const el = threadViewportRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  };

  const { mode, displayed, threadsForQuestionsView } = useMemo(
    () => buildChatView(messages, isQuestionsView),
    [messages, isQuestionsView]
  );

  const selectedThread = useMemo(() => {
    if (!selectedQuestionKey) return null;
    return (
      threadsForQuestionsView.find(
        (t) => t.question?.key === selectedQuestionKey
      ) || null
    );
  }, [threadsForQuestionsView, selectedQuestionKey]);

  const inThreadView = isQuestionsView && !!selectedQuestionKey;

  return (
    <Flex direction="column" h="100vh" p="md" gap="sm">
      {/* ✅ VISTA HILO */}
      {inThreadView ? (
        <ThreadView
          selectedThread={selectedThread}
          myName={myName}
          userKey={userKey}
          threadText={threadText}
          setThreadText={setThreadText}
          onSendThread={sendThread}
          onBack={() => {
            setSelectedQuestionKey(null);
            setThreadText("");
          }}
          threadViewportRef={threadViewportRef}
          message_highlighted={message_highlighted}
          onToggleLike={toggleLike}
        />
      ) : (
        <>
          {/* lista de mensajes */}
          <ScrollArea
            flex="1"
            offsetScrollbars
            onScrollPositionChange={onScroll}
            viewportRef={viewportRef}
          >
            <Stack gap="md" pr="sm">
              {loadingMore && <Loader size="xs" mx="auto" my="xs" />}

              {/* ✅ TAB PREGUNTAS */}
              {mode === "questions_list" &&
                displayed.map(({ question: q, replies }) => {
                  const timeQ =
                    typeof q.ts === "number" ? dayjs(q.ts).format("HH:mm") : "";
                  const likeCount = getLikeCount(q);
                  const liked = isLikedByUser(q, userKey);

                  return (
                    <Flex
                      key={q.key}
                      justify={q.name === myName ? "flex-end" : "flex-start"}
                      gap="xs"
                      w="100%"
                    >
                      <MessageBubble
                        m={q}
                        isQuestion
                        time={timeQ}
                        bg="blue.0"
                        liked={liked}
                        likeCount={likeCount}
                        isLiveQuestionsCard={false}
                        showReplyAction={false}
                        onReply={selectReply}
                        onToggleLike={toggleLike}
                        showViewReplies={replies.length > 0}
                        viewRepliesCount={replies.length}
                        onViewReplies={() => {
                          setSelectedQuestionKey(q.key);
                          setThreadText("");
                          setReplyTo(null);
                        }}
                        hideReplyQuote={false}
                        message_highlighted={message_highlighted}
                      />
                    </Flex>
                  );
                })}

              {/* ✅ CHAT EN VIVO */}
              {mode === "flat" &&
                displayed.map((m) => {
                  const mine = m.name === myName;
                  const isQuestion = (m.type || "message") === "question";
                  const time =
                    typeof m.ts === "number" ? dayjs(m.ts).format("HH:mm") : "";

                  const isLiveQuestionsCard = !isQuestionsView && isQuestion;

                  let justify;
                  if (isQuestionsView && isQuestion)
                    justify = mine ? "flex-end" : "flex-start";
                  else if (!isQuestionsView && isQuestion) justify = "center";
                  else justify = mine ? "flex-end" : "flex-start";

                  const bg = isQuestion ? "blue.0" : mine ? "white" : "gray.0";
                  const likeCount = isQuestion ? getLikeCount(m) : 0;
                  const liked = isQuestion ? isLikedByUser(m, userKey) : false;

                  return (
                    <Flex key={m.key} justify={justify} gap="xs" w="100%">
                      {!isQuestion && !mine && (
                        <Avatar radius="xl" size="md" color="gray">
                          {getInitials(m.name)}
                        </Avatar>
                      )}

                      <MessageBubble
                        m={m}
                        isQuestion={isQuestion}
                        time={time}
                        bg={bg}
                        liked={liked}
                        likeCount={likeCount}
                        isLiveQuestionsCard={isLiveQuestionsCard}
                        showReplyAction={!isQuestionsView}
                        onReply={selectReply}
                        onToggleLike={toggleLike}
                        showViewReplies={false}
                        viewRepliesCount={0}
                        onViewReplies={null}
                        hideReplyQuote={false}
                        message_highlighted={message_highlighted}
                      />

                      {!isQuestion && mine && (
                        <Avatar radius="xl" size="md" color="blue">
                          {getInitials(m.name)}
                        </Avatar>
                      )}
                    </Flex>
                  );
                })}
            </Stack>
          </ScrollArea>

          {/* formulario envío */}
          <form onSubmit={send}>
            <Stack gap="xs">
              {/* preview reply */}
              {replyTo && (
                <Paper
                  radius={12}
                  p="sm"
                  withBorder
                  bg="blue.0"
                  style={{
                    borderLeft: "6px solid var(--mantine-color-blue-6)",
                  }}
                >
                  <Group justify="space-between" align="center" mb={4}>
                    <Text size="xs" fw={700} c="dimmed">
                      Respondiendo a {replyTo.name}
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      size="sm"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancelar respuesta"
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Group>
                  <Text
                    size="xs"
                    c="dimmed"
                    lineClamp={2}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {replyTo.text}
                  </Text>
                </Paper>
              )}

              <Flex gap="xs" align="center" style={{ position: "relative" }}>
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
            </Stack>
          </form>
        </>
      )}
    </Flex>
  );
}
