"use client";

import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/questions/StepGuard";
import { Hora } from "@/components/questions/Hora";

export default function Page() {
  const router = useRouter();
  return (
    <StepGuard needs={["date"]}>
      <Hora onNext={() => router.push("/crear/lugar")} />
    </StepGuard>
  );
}
