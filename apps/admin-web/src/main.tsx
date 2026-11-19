import { createRoot } from 'react-dom/client';
import App from '../../citizen-web/src/App';
import '../../citizen-web/src/index.css';
if (location.pathname === '/')
    history.replaceState({}, '', '/admin');
createRoot(document.getElementById('root')!).render(<App />);
