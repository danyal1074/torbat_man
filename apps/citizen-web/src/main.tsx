import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/vazirmatn';
import './claude/styles/app.css';
import App from './claude/App';
import { applyPrefs, loadPrefs } from './claude/state/session';

applyPrefs(loadPrefs());
createRoot(document.getElementById('root')!).render(<BrowserRouter><App/></BrowserRouter>);
