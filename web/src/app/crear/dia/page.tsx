"use client";

import { useRouter } from "next/navigation";
import { Dia } from "@/components/questions/Dia";

// Guards nothing: the name is skippable, so there is no earlier answer that
// must exist before this question can be asked.
export default function Page() {
  const router = useRouter();
  return <Dia onNext={() => router.push("/crear/hora")} />;
}
