import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/vazirmatn';
import './claude/styles/app.css';
import './claude/styles/reference.css';
import App from './claude/App';
import { applyPrefs, loadPrefs } from './claude/state/session';
import { initNativeApp } from './native/capacitor';

applyPrefs(loadPrefs());
void initNativeApp();
createRoot(document.getElementById('root')!).render(<BrowserRouter><App/></BrowserRouter>);
