"use client";

import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/questions/StepGuard";
import { Lugar } from "@/components/questions/Lugar";

export default function Page() {
  const router = useRouter();
  return (
    <StepGuard needs={["date", "time"]}>
      <Lugar onNext={() => router.push("/crear")} />
    </StepGuard>
  );
}
