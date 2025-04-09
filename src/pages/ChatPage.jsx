import Chat from "../components/Chat";

export default function ChatPage() {
  const params = Object.fromEntries(
    new URLSearchParams(location.search).entries()
  );
  return <Chat {...params} />;
}
