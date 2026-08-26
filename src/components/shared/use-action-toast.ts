"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/types";

/**
 * Fires once per successful action result. The ref guard survives StrictMode's
 * double-invoked effects, which would otherwise toast twice in development.
 */
export function useActionToast(
  state: ActionState,
  message: string,
  onSuccess?: () => void,
) {
  const handled = useRef<ActionState | null>(null);

  useEffect(() => {
    if (!state.ok || handled.current === state) return;
    handled.current = state;
    toast.success(message);
    onSuccess?.();
  }, [state, message, onSuccess]);
}
