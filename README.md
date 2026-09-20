# Ulanzi D200H OBS

Linux-first desktop control software for the Ulanzi D200H stream controller.

## Current status

The project is in active v1 development. The profile engine, D200H HID protocol layer, OBS WebSocket adapter, streaming-focused editor, reconnect logic, and deterministic test harness are implemented. Real-device verification depends on the D200H being visible to the host environment.

## Features

- 13-key D200H profile editor with pages.
- OBS scene, source, stream, recording, replay-buffer, mute, and transition actions.
- App launches, URLs/files, shortcuts, shell commands, and page navigation.
- Device and OBS connection state with reconnect handling.
- Local versioned JSON profiles and image assets.
- Linux desktop packaging target with AppImage.

## Development

Requirements: Node.js 22 or newer, npm, Linux, and optionally a connected D200H and OBS Studio.

```bash
npm install
npm run typecheck
npx vitest run
npm run dev
```

Check whether the host can see the device:

```bash
node scripts/list-d200h.mjs
```

## OBS setup

Enable the OBS WebSocket server in OBS Studio. The app defaults to `ws://127.0.0.1:4455`; the password is configured through the app connection flow.

## Linux device permissions

Install the supplied udev rule and reconnect the controller:

```bash
sudo cp udev/99-ulanzi-d200h.rules /etc/udev/rules.d/
sudo udevadm control --reload-rules
sudo udevadm trigger
sudo usermod -aG plugdev "$USER"
```

Log out and in after changing group membership. See [docs/linux-install.md](docs/linux-install.md) for troubleshooting and packaging.

## Packaging

```bash
npm run dist:linux
```

The AppImage is written to `dist/`.

This is an unofficial project and is not affiliated with Ulanzi.
