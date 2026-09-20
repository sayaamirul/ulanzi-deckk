import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/domain/actions/types';
import { ActionExecutor } from '../../src/actions/executor';

const createExecutorWithFakes = () => {
  const obs = {
    calls: [] as Action[],
    execute: async (action: Extract<Action, { type: `obs.${string}` }>) => {
      obs.calls.push(action);
    },
  };
  const system = {
    launchCalls: [] as Array<{ executable: string; args: string[] }>,
    openCalls: [] as string[],
    shortcutCalls: [] as string[],
    shellCalls: [] as string[],
    launch: async (executable: string, args: string[]) => { system.launchCalls.push({ executable, args }); },
    open: async (target: string) => { system.openCalls.push(target); },
    shortcut: async (accelerator: string) => { system.shortcutCalls.push(accelerator); },
    shell: async (command: string) => { system.shellCalls.push(command); },
  };
  const executor = new ActionExecutor(obs, system);
  return { executor, fakes: { obs, system } };
};

describe('action executor', () => {
  it('routes OBS actions to the OBS adapter', async () => {
    const { executor, fakes } = createExecutorWithFakes();

    await executor.execute({ type: 'obs.record.toggle' });

    expect(fakes.obs.calls).toContainEqual({ type: 'obs.record.toggle' });
  });

  it('rejects an empty shell command before spawning a process', async () => {
    const { executor, fakes } = createExecutorWithFakes();

    await expect(executor.execute({ type: 'system.shell', command: '  ' })).rejects.toThrow(/empty/i);
    expect(fakes.system.shellCalls).toHaveLength(0);
  });

  it('routes page actions to the navigation callback', async () => {
    const calls: Action[] = [];
    const { executor } = createExecutorWithFakes();
    executor.setPageNavigator(async (action) => { calls.push(action); });

    await executor.execute({ type: 'page.goto', pageId: 'starting-soon' });

    expect(calls).toEqual([{ type: 'page.goto', pageId: 'starting-soon' }]);
  });
});
