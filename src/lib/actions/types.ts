export type ActionState = {
  error: string | null;
  /** Bumped on success so client forms can react to a completed submit. */
  ok?: boolean;
};

export const IDLE: ActionState = { error: null };

export function failure(error: string): ActionState {
  return { error };
}

export function success(): ActionState {
  return { error: null, ok: true };
}
