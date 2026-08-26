import { redirect } from "next/navigation";

import { HOME_PATH, requireUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await requireUser();
  redirect(HOME_PATH[user.role]);
}
