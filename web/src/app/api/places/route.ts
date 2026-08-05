import { NextRequest, NextResponse } from "next/server";
import { searchPlaces } from "@core/places";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json(searchPlaces(q));
}
