import type { AppSnapshot } from '../../main/runtime';

type Props = Pick<AppSnapshot, 'device' | 'obs'>;

type ConnectionStatusProps = Props & { className?: string };

export const ConnectionStatus = ({ device, obs, className }: ConnectionStatusProps) => (
  <div className={`connection-status${className ? ` ${className}` : ''}`} aria-label="Connection status">
    <span className={`status-pill ${device.status === 'connected' ? 'is-online' : ''}`}>
      Device: {device.status}
    </span>
    <span className={`status-pill ${obs.connected ? 'is-online' : ''}`}>
      OBS: {obs.connected ? 'connected' : 'disconnected'}
    </span>
  </div>
);
