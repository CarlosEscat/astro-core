"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBirthAnswers, type BirthAnswers } from "@/hooks/useBirthAnswers";

/**
 * Deep-linking to a step with nothing in storage sends you back to the start
 * (spec decision 5).
 *
 * Waits for `ready`: sessionStorage does not exist during SSR or on the very
 * first client render, so guarding before then would bounce everyone — including
 * people who answered the earlier questions a second ago.
 *
 * `replace`, not `push`, so the bounce does not land in the history stack and
 * turn the back gesture into a loop.
 */
export function StepGuard({ needs, children }: {
  needs: (keyof BirthAnswers)[];
  children: React.ReactNode;
}) {
  const { answers, ready } = useBirthAnswers();
  const router = useRouter();
  const missing = ready && needs.some((k) => answers[k] === undefined);

  useEffect(() => {
    if (missing) router.replace("/crear/nombre");
  }, [missing, router]);

  if (!ready || missing) return null;
  return <>{children}</>;
}
