// components/MessageBubble.jsx
import React from "react";
import { Paper, Group, Text, Badge, Button, Tooltip, ActionIcon } from "@mantine/core";
import { IconCornerUpLeft, IconRepeat } from "@tabler/icons-react";

const linkRegex =
  /((https?:\/\/|www\.)[^\s<>"'()]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;

function renderWithLinks(text = "") {
  const nodes = [];
  let lastIndex = 0;

  text.replace(linkRegex, (match, _g1, _g2, email, offset) => {
    if (lastIndex < offset) nodes.push(text.slice(lastIndex, offset));

    let href = match;
    if (email) href = `mailto:${match}`;
    else if (/^www\./i.test(match)) href = `https://${match}`;

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

export default function MessageBubble({
  m,
  isQuestion,
  time,
  bg,
  liked,
  likeCount,
  isLiveQuestionsCard,
  showReplyAction,
  onReply,
  onToggleLike,
  showViewReplies,
  viewRepliesCount,
  onViewReplies,
  hideReplyQuote,
  message_highlighted,
}) {
  return (
    <Paper
      radius={12}
      p={isQuestion ? "md" : "sm"}
      mt="xs"
      w={isLiveQuestionsCard ? "100%" : "fit-content"}
      bg={bg}
      c="black"
      shadow="xs"
      withBorder
      style={{
        whiteSpace: "normal",
        maxWidth: isLiveQuestionsCard ? "100%" : "min(760px, 92%)",
        ...(!isQuestion ? { minWidth: "clamp(240px, 50%, 560px)" } : {}),
        borderColor: isQuestion
          ? "var(--mantine-color-blue-6)"
          : "var(--mantine-color-gray-4)",
        borderLeft: isQuestion ? "6px solid var(--mantine-color-blue-6)" : undefined,
      }}
    >
      <Group justify="space-between" mb={8} align="center">
        <Group gap={8} align="center">
          {isQuestion && (
            <Badge variant="filled" color="blue" size="sm">
              PREGUNTA
            </Badge>
          )}
          <Text size="xs" fw={600} c="dimmed">
            {m.name}
          </Text>
        </Group>

        <Group gap={6} align="center">
          {showReplyAction && (
            <Tooltip label="Responder" withArrow>
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => onReply?.(m)}
                aria-label="Responder"
              >
                <IconCornerUpLeft size={16} />
              </ActionIcon>
            </Tooltip>
          )}

          <Text size="xs" c="dimmed">
            {time}
          </Text>
        </Group>
      </Group>

      {/* ✅ cita del mensaje respondido */}
      {!hideReplyQuote && m?.replyTo?.key && (
        <Paper
          radius={10}
          p="xs"
          mb="xs"
          withBorder
          bg={isQuestion ? "blue.1" : "gray.1"}
          style={{ borderLeft: "4px solid var(--mantine-color-blue-6)" }}
        >
          <Text size="xs" fw={700} c="dimmed">
            {m.replyTo.name}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
            {m.replyTo.text}
          </Text>
        </Paper>
      )}

      <Text
        size={isQuestion ? "md" : "sm"}
        lh={isQuestion ? 1.5 : 1.4}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          ...(message_highlighted &&
          typeof m.text === "string" &&
          m.text.includes(message_highlighted)
            ? { fontWeight: 600, filter: "brightness(1.03)" }
            : {}),
        }}
      >
        {renderWithLinks(m.text)}
      </Text>

      {isQuestion && (
        <Group justify="flex-end" mt="xs" gap="xs" align="center">
          <Button
            variant={liked ? "filled" : "subtle"}
            size="xs"
            onClick={() => onToggleLike?.(m)}
            rightSection={<IconRepeat size={20} />}
            aria-label="Me interesa"
          >
            Me interesa
          </Button>
          <Text size="xs" c="dimmed">
            {likeCount}
          </Text>
        </Group>
      )}

      {showViewReplies && viewRepliesCount > 0 && (
        <Group justify="flex-end" mt="xs">
          <Button size="xs" variant="light" onClick={onViewReplies}>
            Ver respuestas ({viewRepliesCount})
          </Button>
        </Group>
      )}
    </Paper>
  );
}
