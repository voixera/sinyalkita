import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.hostname !== "sinyalkita.site") {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.hostname = "www.sinyalkita.site";
  url.protocol = "https";

  return NextResponse.redirect(url, 308);
}
