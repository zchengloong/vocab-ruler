import Link from "next/link";

import { LogoMark } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="card max-w-md p-9 text-center">
        <LogoMark className="mx-auto h-12 w-12 text-ink" />
        <p className="mt-6 font-display text-2xl tracking-tight">这一页没量到</p>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          结果可能已过期（服务端保留 30 天），或者链接不完整。
        </p>
        <div className="mt-7 flex justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            回到首页
          </Link>
          <Link href="/history" className="btn btn-outline">
            我的历史
          </Link>
        </div>
      </div>
    </div>
  );
}
