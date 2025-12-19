// utils/chatUtils.js
export const PAGE = 40;

export const getInitials = (name = "") => name.slice(0, 2).toUpperCase();

export const getSearchParam = (key) => {
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get(key) || "";
  } catch {
    return "";
  }
};

export const tsNum = (ts) =>
  typeof ts === "number" ? ts : Number.MAX_SAFE_INTEGER;

export const getLikeCount = (m) =>
  typeof m?.likesCount === "number"
    ? m.likesCount
    : Object.keys(m?.likes || {}).length;

export const isLikedByUser = (m, userKey) =>
  !!(m?.likes && userKey && m.likes[userKey]);

export const buildChatView = (messages = [], isQuestionsView = false) => {
  const norm = (messages || []).map((m) => ({
    ...m,
    type: m.type || "message",
  }));

  // ✅ Chat en vivo: NO mostrar mensajes de hilo
  if (!isQuestionsView) {
    const visible = norm.filter((m) => !m.threadKey);
    return { mode: "flat", displayed: visible, threadsForQuestionsView: [] };
  }

  // ✅ Tab preguntas: lista de preguntas + conteo de respuestas
  const qs = norm.filter((m) => m.type === "question");

  const sortedQuestions = [...qs].sort((a, b) => {
    const la = getLikeCount(a);
    const lb = getLikeCount(b);
    if (lb !== la) return lb - la;
    return tsNum(a.ts) - tsNum(b.ts); // (igual que tu lógica actual)
  });

  const threads = sortedQuestions.map((q) => {
    const replies = norm
      .filter((m) => m.key !== q.key && m.threadKey === q.key)
      .sort((a, b) => tsNum(a.ts) - tsNum(b.ts));
    return { question: q, replies };
  });

  return {
    mode: "questions_list",
    displayed: threads,
    threadsForQuestionsView: threads,
  };
};
