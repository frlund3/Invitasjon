import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await login(password);
    if (!ok) {
      setError(true);
      setShaking(true);
      setPassword('');
      setTimeout(() => setShaking(false), 500);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--app-bg)',
    }}>
      <div style={{
        background: 'var(--sidebar-bg)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '40px 48px',
        minWidth: '340px',
        textAlign: 'center',
        animation: shaking ? 'shake 0.4s ease' : 'none',
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
            Invitasjons Editor
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Konfirmasjon 2026
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            placeholder="Passord"
            autoFocus
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: `1px solid ${error ? '#ff6b6b' : 'var(--border)'}`,
              borderRadius: '6px',
              color: 'var(--text-primary)',
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: 'inherit',
              marginBottom: '12px',
              outline: 'none',
              transition: 'border-color .2s',
            }}
          />
          {error && (
            <div style={{ fontSize: '11px', color: '#ff6b6b', marginBottom: '10px' }}>
              Feil passord
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', fontSize: '13px', padding: '10px' }}
          >
            Logg inn
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
