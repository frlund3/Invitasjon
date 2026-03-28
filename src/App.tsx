import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import Editor from './components/Editor';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--app-bg)', color: 'var(--text-muted)',
        fontSize: '12px', letterSpacing: '2px',
      }}>
        LASTER...
      </div>
    );
  }

  if (!isAuthenticated) return <LoginScreen />;

  return <Editor />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
