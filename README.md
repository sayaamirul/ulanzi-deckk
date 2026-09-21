# Ulanzi DecKK

Linux-first desktop control software for the Ulanzi D200H stream controller.

## Current status

The project is in active v1 development. The profile engine, D200H HID protocol layer, OBS WebSocket adapter, streaming-focused editor, reconnect logic, and deterministic test harness are implemented. Real-device verification depends on the D200H being visible to the host environment.

## Platform support

Ulanzi DecKK has currently only been tested on [Omarchy Linux](https://omarchy.org/), an Arch-based Linux distribution. Other Linux distributions, Windows, and macOS are not currently verified.

## Features

- 13-key D200H profile editor with pages and one-level shortcut folders.
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

Ulanzi DecKK connects to OBS through OBS WebSocket 5 on the local machine.

1. Open OBS Studio.
2. Open **Tools → WebSocket Server Settings**.
3. Enable **Enable WebSocket server**.
4. Leave the server port at `4455`, which is the app's default endpoint: `ws://127.0.0.1:4455`.
5. For the current app version, disable **Enable Authentication**. The **Connect OBS** button does not yet provide a password field.
6. In Ulanzi DecKK, click the cable/connect icon in the workspace actions card. The status changes to **OBS connected** when the handshake succeeds.

Once connected, OBS scene names are loaded into the action editor. If the connection fails, check that OBS is running, the WebSocket server is enabled, the port matches, and authentication is disabled. The app must be restarted or disconnected/reconnected after changing OBS WebSocket settings.

## Shortcut folders

Create a folder under the current top-level page in the **Page Groups** sidebar. Assign one slot to **Page · Open folder**, choose the folder, and save the profile. Open that folder on the D200H, configure its slots with shortcuts, and assign one slot to **Page · Back** to return to the parent page. Version one supports one folder level; a folder cannot contain another folder. A folder with active links cannot be deleted until those links are changed.

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
