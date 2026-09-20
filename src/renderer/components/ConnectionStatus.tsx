import type { AppSnapshot } from '../../main/runtime';

type Props = Pick<AppSnapshot, 'device' | 'obs'>;

export const ConnectionStatus = ({ device, obs }: Props) => (
  <div className="connection-status" aria-label="Connection status">
    <span className={`status-pill ${device.status === 'connected' ? 'is-online' : ''}`}>
      Device: {device.status}
    </span>
    <span className={`status-pill ${obs.connected ? 'is-online' : ''}`}>
      OBS: {obs.connected ? 'connected' : 'disconnected'}
    </span>
  </div>
);
