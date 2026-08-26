import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <FileQuestion className="size-9 text-muted-foreground" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">Không tìm thấy nội dung</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty">
        Trang bạn tìm không tồn tại, hoặc không thuộc phạm vi tài khoản của bạn.
      </p>
      <Button asChild className="mt-6 h-11">
        <Link href="/">Về trang chủ</Link>
      </Button>
    </div>
  );
}
