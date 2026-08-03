export type OptimisticProposal<State, Value, Reason extends string> =
  | { ok: true; state: State; value: Value }
  | { ok: false; reason: Reason };

export type OptimisticResult<Value, Reason extends string> =
  | { success: true; value: Value; attempts: number }
  | { success: false; reason: Reason | "conflict"; attempts: number };

/**
 * Apply one small state mutation with a bounded compare-and-swap retry loop.
 *
 * Callers provide the storage-specific load and commit operations. A commit
 * must return false when the state changed after it was loaded. Keeping the
 * retry mechanism independent from D1 makes the conflict behaviour directly
 * runtime-testable without a production or development database.
 */
export async function applyOptimisticMutation<
  State,
  Value,
  Reason extends string,
>(options: {
  load: () => Promise<State>;
  propose: (
    current: State,
  ) => OptimisticProposal<State, Value, Reason>;
  commit: (current: State, next: State) => Promise<boolean>;
  maxAttempts?: number;
}): Promise<OptimisticResult<Value, Reason>> {
  const maxAttempts = Math.max(1, Math.min(5, options.maxAttempts ?? 3));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const current = await options.load();
    const proposal = options.propose(current);

    if (!proposal.ok) {
      return {
        success: false,
        reason: proposal.reason,
        attempts: attempt,
      };
    }

    if (await options.commit(current, proposal.state)) {
      return {
        success: true,
        value: proposal.value,
        attempts: attempt,
      };
    }
  }

  return {
    success: false,
    reason: "conflict",
    attempts: maxAttempts,
  };
}
