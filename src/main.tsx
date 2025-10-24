import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const logs: string[] = [];

function log(message: string) {
  console.log(message);
  logs.push(message);
}

function showDiagnostics(error?: any) {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <h1 style="color: ${error ? 'red' : 'blue'};">Hefer Projects - Diagnostic Page</h1>
        ${error ? `<h2 style="color: red;">Error Detected</h2>` : '<h2 style="color: green;">Loading...</h2>'}

        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Environment Variables:</h3>
          <p><strong>VITE_SUPABASE_URL:</strong> ${import.meta.env.VITE_SUPABASE_URL || '<span style="color: red;">MISSING</span>'}</p>
          <p><strong>VITE_SUPABASE_ANON_KEY:</strong> ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '<span style="color: green;">Present</span>' : '<span style="color: red;">MISSING</span>'}</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3>Console Logs:</h3>
          <pre style="white-space: pre-wrap;">${logs.join('\n')}</pre>
        </div>

        ${error ? `
          <div style="background: #ffe6e6; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid red;">
            <h3>Error Details:</h3>
            <pre style="white-space: pre-wrap; color: red;">${error.toString()}\n\n${error.stack || ''}</pre>
          </div>
        ` : ''}

        <div style="background: #e6f3ff; padding: 20px; margin: 20px 0; border-radius: 8px; border: 2px solid blue;">
          <h3>Next Steps:</h3>
          <ol>
            <li>Verify environment variables are set in Vercel</li>
            <li>Ensure variables start with VITE_ prefix</li>
            <li>Redeploy without build cache</li>
            <li>Check browser console (F12) for additional errors</li>
          </ol>
        </div>
      </div>
    `;
  }
}

log('Main.tsx loaded');
log('Environment: ' + import.meta.env.MODE);

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  log('Root element found');
  log('Supabase URL: ' + (import.meta.env.VITE_SUPABASE_URL ? 'present' : 'MISSING'));
  log('Supabase Key: ' + (import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'MISSING'));

  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    log('WARNING: Environment variables missing!');
    showDiagnostics();
  } else {
    log('Creating React root...');
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    log('React app rendered successfully');
  }
} catch (error) {
  log('ERROR: ' + error);
  console.error('Failed to mount React app:', error);
  showDiagnostics(error);
}
