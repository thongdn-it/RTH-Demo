"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <TriangleAlert className="size-9 text-destructive" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Đã xảy ra lỗi</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Không tải được dữ liệu. Vui lòng thử lại; nếu vẫn lỗi, liên hệ quản trị viên.
      </p>
      <Button onClick={reset} className="mt-6 h-11">
        Thử lại
      </Button>
    </div>
  );
}
