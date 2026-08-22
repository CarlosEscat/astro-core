"use client";

import { useRouter } from "next/navigation";
import { Cuando } from "@/components/questions/Cuando";

// Guards nothing: the name is skippable, so there is no earlier answer that
// must exist before this question can be asked.
export default function Page() {
  const router = useRouter();
  return <Cuando onNext={() => router.push("/crear/donde")} />;
}
