import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    R2_ACCOUNT_ID: Boolean(process.env.R2_ACCOUNT_ID),
    R2_ACCESS_KEY_ID: Boolean(process.env.R2_ACCESS_KEY_ID),
    R2_SECRET_ACCESS_KEY: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    R2_ENDPOINT: Boolean(process.env.R2_ENDPOINT),
    R2_BUCKET_NAME: Boolean(process.env.R2_BUCKET_NAME),
    R2_PUBLIC_URL: Boolean(process.env.R2_PUBLIC_URL),
    NEXT_PUBLIC_R2_PUBLIC_URL: Boolean(process.env.NEXT_PUBLIC_R2_PUBLIC_URL),
  });
}
