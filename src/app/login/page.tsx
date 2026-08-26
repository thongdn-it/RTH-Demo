import type { Metadata } from "next";
import { GraduationCap } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/app/login/login-form";
import { DemoAccounts } from "@/app/login/demo-accounts";

export const metadata: Metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <GraduationCap className="size-9 text-primary" aria-hidden />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">RTH Lớp học</h1>
          <p className="mt-1 text-sm text-muted-foreground text-pretty">
            Đăng nhập bằng tài khoản do nhà trường cấp.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập</CardTitle>
            <CardDescription>Dành cho học sinh, giáo viên và phụ huynh.</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm next={typeof next === "string" ? next : undefined} />
          </CardContent>
        </Card>

        <DemoAccounts />
      </div>
    </div>
  );
}
