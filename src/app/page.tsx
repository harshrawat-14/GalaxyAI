import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** Root redirect only — the real Dashboard/Canvas pages land in build order step 5. */
export default async function RootPage() {
  const { userId } = await auth();
  redirect(userId ? "/dashboard" : "/sign-in");
}
