import { SaveStatus } from '../hooks/useAutosave';

interface Props {
  status: SaveStatus;
  projectId?: string;
}

export default function SaveStatusBar({ status, projectId }: Props) {
  const configs: Record<Exclude<SaveStatus, 'idle'>, { text: string; color: string }> = {
    saving: { text: 'Lagrer...', color: 'var(--text-muted)' },
    saved: { text: 'Lagret ✓', color: '#6bffaa' },
    error: { text: 'Lagringsfeil', color: '#ff6b6b' },
  };

  const projectLabel = projectId && projectId !== 'default' ? projectId : null;

  if (status === 'idle' && !projectLabel) return null;

  return (
    <div style={{
      padding: '4px 18px',
      background: '#0e0e1a',
      borderBottom: '1px solid var(--border)',
      fontSize: '10px',
      letterSpacing: '0.5px',
      color: 'var(--text-muted)',
      flexShrink: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <span style={{ color: '#a0a0c0', fontWeight: 500 }}>
        {projectLabel ? `📁 ${projectLabel}` : ''}
      </span>
      {status !== 'idle' && (
        <span style={{ color: configs[status].color, transition: 'color .3s' }}>
          {configs[status].text}
        </span>
      )}
    </div>
  );
}
