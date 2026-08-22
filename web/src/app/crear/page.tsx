"use client";

import { StepGuard } from "@/components/questions/StepGuard";
import { Reveal } from "@/components/Reveal";

export default function Page() {
  return (
    <StepGuard needs={["date", "time", "place"]}>
      <Reveal />
    </StepGuard>
  );
}
