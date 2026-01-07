import type { Adapter } from "../adapter/interface.ts";
import type { Action } from "../types.ts";

export type ExecuteError = {
  action: Action;
  message: string;
};

export type ExecuteResult = {
  ok: boolean;
  error?: ExecuteError;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const executeActions = async (
  adapter: Adapter,
  actions: Action[],
): Promise<ExecuteResult> => {
  for (const action of actions) {
    try {
      await adapter.performAction(action);
    } catch (error) {
      return {
        ok: false,
        error: {
          action,
          message: toErrorMessage(error),
        },
      };
    }
  }
  return { ok: true };
};
