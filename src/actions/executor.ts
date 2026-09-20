import type { Action } from '../domain/actions/types';

export type ObsAction = Extract<Action, { type: `obs.${string}` }>;
export type SystemAction = Extract<Action, { type: `system.${string}` }>;
export type PageAction = Extract<Action, { type: `page.${string}` }>;

export type ObsActionPort = { execute(action: ObsAction): Promise<void> };
export type SystemActionPort = {
  launch(executable: string, args: string[]): Promise<void>;
  open(target: string): Promise<void>;
  shortcut(accelerator: string): Promise<void>;
  shell(command: string): Promise<void>;
};

export type ActionResult = { action: Action; ok: boolean; error?: string };
export type ActionResultListener = (result: ActionResult) => void;
export type PageNavigator = (action: PageAction) => Promise<void>;

export class ActionExecutor {
  private navigator: PageNavigator = async () => undefined;
  private readonly listeners = new Set<ActionResultListener>();

  constructor(private readonly obs: ObsActionPort, private readonly system: SystemActionPort) {}

  setPageNavigator(navigator: PageNavigator): void {
    this.navigator = navigator;
  }

  onResult(listener: ActionResultListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async execute(action: Action): Promise<void> {
    try {
      await this.dispatch(action);
      this.emit({ action, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ action, ok: false, error: message });
      throw error;
    }
  }

  private async dispatch(action: Action): Promise<void> {
    if (action.type.startsWith('obs.')) {
      await this.obs.execute(action as ObsAction);
      return;
    }

    if (action.type.startsWith('system.')) {
      const systemAction = action as SystemAction;
      switch (systemAction.type) {
        case 'system.launch':
          await this.system.launch(systemAction.executable, systemAction.args);
          return;
        case 'system.open':
          await this.system.open(systemAction.target);
          return;
        case 'system.shortcut':
          await this.system.shortcut(systemAction.accelerator);
          return;
        case 'system.shell':
          if (!systemAction.command.trim()) throw new Error('shell command cannot be empty');
          await this.system.shell(systemAction.command);
          return;
      }
    }

    if (action.type.startsWith('page.')) {
      await this.navigator(action as PageAction);
      return;
    }

    throw new Error(`Unsupported action: ${action.type}`);
  }

  private emit(result: ActionResult): void {
    for (const listener of this.listeners) listener(result);
  }
}
