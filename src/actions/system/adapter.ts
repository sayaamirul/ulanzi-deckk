import { shell } from 'electron';
import { existsSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { SystemActionPort } from '../executor';

type ProcessRunner = (command: string, args: string[]) => Promise<void>;

const runAndWait: ProcessRunner = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'ignore' });
  child.once('error', reject);
  child.once('close', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
});

const runDetached = (command: string, args: string[]): Promise<void> => new Promise((resolve, reject) => {
  const child: ChildProcess = spawn(command, args, { detached: true, stdio: 'ignore' });
  child.once('error', reject);
  child.unref();
  resolve();
});

const commandAvailable = (command: string): boolean => {
  const path = process.env.PATH ?? '';
  return path.split(delimiter).some((directory) => existsSync(join(directory, command)));
};

const shortcutParts = (accelerator: string): { modifiers: string[]; key: string } => {
  const parts = accelerator.split('+').map((part) => part.trim().toLowerCase()).filter(Boolean);
  const key = parts.pop();
  if (!key) throw new Error('shortcut cannot be empty');
  return { modifiers: parts, key };
};

export class LinuxSystemActionAdapter implements SystemActionPort {
  async launch(executable: string, args: string[]): Promise<void> {
    if (!executable.trim()) throw new Error('executable cannot be empty');
    await runDetached(executable, args);
  }

  async open(target: string): Promise<void> {
    if (!target.trim()) throw new Error('target cannot be empty');
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) {
      await shell.openExternal(target);
      return;
    }
    const error = await shell.openPath(target);
    if (error) throw new Error(error);
  }

  async shortcut(accelerator: string): Promise<void> {
    const { modifiers, key } = shortcutParts(accelerator);
    if (process.env.WAYLAND_DISPLAY) {
      if (!commandAvailable('wtype')) throw new Error('wtype is required for Wayland shortcuts');
      const args = modifiers.flatMap((modifier) => ['-M', modifier]);
      args.push('-k', key);
      args.push(...modifiers.flatMap((modifier) => ['-m', modifier]));
      await runAndWait('wtype', args);
      return;
    }
    if (!commandAvailable('xdotool')) throw new Error('xdotool is required for X11 shortcuts');
    await runAndWait('xdotool', ['key', '--clearmodifiers', accelerator.toLowerCase()]);
  }

  async shell(command: string): Promise<void> {
    if (!command.trim()) throw new Error('shell command cannot be empty');
    await runAndWait('/bin/sh', ['-lc', command]);
  }
}
