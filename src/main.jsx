import React from 'react';
import ReactDOM from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import AppRouter from './router';
import '@mantine/core/styles.css';
import { loginAnon } from './lib/firebase';

loginAnon().then(() =>
  ReactDOM.createRoot(document.getElementById('root')).render(
    <MantineProvider>
      <AppRouter />
    </MantineProvider>,
  ),
);
