"use client";

import { useRouter } from "next/navigation";
import { Nombre } from "@/components/questions/Nombre";

export default function Page() {
  const router = useRouter();
  return <Nombre onNext={() => router.push("/crear/cuando")} />;
}
