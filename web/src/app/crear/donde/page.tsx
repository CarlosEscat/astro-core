"use client";

import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/questions/StepGuard";
import { Donde } from "@/components/questions/Donde";

export default function Page() {
  const router = useRouter();
  return (
    <StepGuard needs={["date"]}>
      <Donde onNext={() => router.push("/crear")} />
    </StepGuard>
  );
}
