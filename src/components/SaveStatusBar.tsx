import { SaveStatus } from '../hooks/useAutosave';

interface Props {
  status: SaveStatus;
}

export default function SaveStatusBar({ status }: Props) {
  if (status === 'idle') return null;

  const configs: Record<Exclude<SaveStatus, 'idle'>, { text: string; color: string }> = {
    saving: { text: 'Lagrer...', color: 'var(--text-muted)' },
    saved: { text: 'Lagret ✓', color: '#6bffaa' },
    error: { text: 'Lagringsfeil', color: '#ff6b6b' },
  };

  const cfg = configs[status];

  return (
    <div style={{
      padding: '4px 18px',
      background: '#0e0e1a',
      borderBottom: '1px solid var(--border)',
      fontSize: '10px',
      letterSpacing: '0.5px',
      color: cfg.color,
      flexShrink: 0,
      transition: 'color .3s',
    }}>
      {cfg.text}
    </div>
  );
}
