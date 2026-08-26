function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Thiếu biến môi trường ${name}. Sao chép .env.example thành .env.local và điền thông tin dự án Supabase.`,
    );
  }
  return value;
}

/**
 * Read at call time rather than at module scope so that a missing value fails
 * on the request that needs it, not while the module graph is being built.
 */
export function supabaseUrl(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  );
}

export function supabaseAnonKey(): string {
  return required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
