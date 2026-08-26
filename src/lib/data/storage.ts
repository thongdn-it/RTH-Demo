import "server-only";

import { createClient } from "@/lib/supabase/server";

const BUCKET = "submissions";
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * The bucket is private, so a file is reachable only through a short-lived
 * signed URL — and only for someone whose RLS grant lets them read the object.
 */
export async function signSubmissionFile(
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  return data?.signedUrl ?? null;
}

export function fileNameFromPath(storagePath: string): string {
  const last = storagePath.split("/").pop() ?? storagePath;
  // Strip the uuid prefix we add on upload.
  return last.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  );
}
