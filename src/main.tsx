import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/500.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Frontend root element was not found');
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
