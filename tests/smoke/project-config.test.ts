import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('project configuration', () => {
  it('declares the Linux-first desktop app scripts', () => {
    const packagePath = resolve(process.cwd(), 'package.json');

    expect(existsSync(packagePath)).toBe(true);

    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      dev: expect.any(String),
      build: expect.any(String),
      typecheck: expect.any(String),
      test: expect.any(String),
      'dist:linux': expect.any(String),
    });
  });
});
