"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import { ArrowRight } from "@/components/icons";

const links = [
  { href: "/method", label: "测试原理" },
  { href: "/history", label: "历史" },
  { href: "/wordbook", label: "生词本" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-paper/80 backdrop-blur-xl">
      <div className="container-page flex h-[68px] items-center justify-between gap-4">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="主导航">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors sm:px-3 ${
                  active
                    ? "bg-white/60 text-ink shadow-[0_1px_0_rgba(255,255,255,.8)_inset]"
                    : "text-ink-soft hover:bg-white/40 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/#test"
            className="btn btn-primary ml-1 hidden px-4 py-2.5 text-[13px] sm:inline-flex"
          >
            开始测试
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
