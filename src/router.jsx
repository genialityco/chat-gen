/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AdminEvents from './pages/AdminEvents';
import AdminMessages from './pages/AdminMessages';
import WhatsAppBulkSender from './components/WhatsAppBulkSender';

// ⚠️ Si tu app está en un subpath (p. ej. /embed), ponlo aquí:
const BASENAME = "/"; // o '/embed'

export const router = createBrowserRouter(
  [
    { path: "/", element: <ChatPage /> },
    { path: "/admin", element: <AdminEvents /> },
    { path: "/admin/:id", element: <AdminMessages /> },
    { path: "/admin/send-whatsapp", element: <WhatsAppBulkSender /> },
    // 👇 Catch-all: evita el 404 "Unexpected Application Error"
    { path: "*", element: <ChatPage /> },
  ],
  { basename: BASENAME }
);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
