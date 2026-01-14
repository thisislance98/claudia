import ReactDOM from 'react-dom/client';
import App from './App';
import { NotificationProvider } from './components/NotificationContainer';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <NotificationProvider>
        <App />
    </NotificationProvider>
);
