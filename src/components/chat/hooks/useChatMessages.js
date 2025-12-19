// hooks/useChatMessages.js
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ref,
  push,
  get,
  query,
  limitToLast,
  orderByKey,
  endBefore,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  runTransaction,
} from "firebase/database";

export function useChatMessages({
  db,
  path,
  myName,
  userKey,
  pageSize = 40,
  isQuestionsView,
  viewportRef,
}) {
  const [messages, setMessages] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  // ✅ bandera para auto-scroll “post render”
  const shouldAutoScrollRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = viewportRef?.current;
    if (!el) return true;
    const threshold = 160; // px
    const distance = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return distance < threshold;
  }, [viewportRef]);

  useEffect(() => {
    let unsubAdd, unsubRemove, unsubChange;

    const firstLoad = async () => {
      const snap = await get(query(ref(db, path), limitToLast(pageSize)));
      const arr = [];
      snap.forEach((s) => arr.push({ key: s.key, ...s.val() }));
      setMessages(arr);

      if (!isQuestionsView) shouldAutoScrollRef.current = true;

      const msgRef = ref(db, path);

      unsubAdd = onChildAdded(msgRef, (s) => {
        const incoming = { key: s.key, ...s.val() };
        const fromMe = incoming?.name === myName;
        const stick = fromMe || isNearBottom();
        shouldAutoScrollRef.current = stick;

        setMessages((prev) =>
          prev.find((m) => m.key === s.key) ? prev : [...prev, incoming]
        );
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
  }, [db, path, myName, isNearBottom, isQuestionsView, pageSize]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !messages.length) return;
    setLoadingMore(true);

    const el = viewportRef?.current;
    const prevScrollHeight = el?.scrollHeight || 0;
    const prevScrollTop = el?.scrollTop || 0;

    const firstKey = messages[0].key;
    const snap = await get(
      query(
        ref(db, path),
        orderByKey(),
        endBefore(firstKey),
        limitToLast(pageSize)
      )
    );

    const arr = [];
    snap.forEach((s) => arr.push({ key: s.key, ...s.val() }));

    setMessages((prev) => [...arr, ...prev]);

    requestAnimationFrame(() => {
      const el2 = viewportRef?.current;
      if (!el2) return;
      const newScrollHeight = el2.scrollHeight;
      el2.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
    });

    setLoadingMore(false);
  }, [db, path, pageSize, loadingMore, messages, viewportRef]);

  const sendMessage = useCallback(
    (payload) => push(ref(db, path), payload),
    [db, path]
  );

  const toggleLike = useCallback(
    async (m) => {
      if (!userKey) return;
      const msgRef = ref(db, `${path}/${m.key}`);

      await runTransaction(msgRef, (current) => {
        if (!current) return current;

        const likes = current.likes || {};
        const already = !!likes[userKey];
        const newLikes = { ...likes };

        if (already) delete newLikes[userKey];
        else newLikes[userKey] = true;

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
    },
    [db, path, userKey]
  );

  return {
    messages,
    loadingMore,
    loadMore,
    sendMessage,
    toggleLike,
    shouldAutoScrollRef,
  };
}
