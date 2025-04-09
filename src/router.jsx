/* eslint-disable react-refresh/only-export-components */
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import AdminEvents from './pages/AdminEvents';
import AdminMessages from './pages/AdminMessages';

export const router = createBrowserRouter([
  { path: '/',          element: <ChatPage /> },
  { path: '/admin',     element: <AdminEvents /> },
  { path: '/admin/:id', element: <AdminMessages /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
