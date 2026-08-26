"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const id = z.uuid();

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await requireUser();
  if (!id.safeParse(notificationId).success) return;

  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("recipient_user_id", user.id);

  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();

  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/", "layout");
}
