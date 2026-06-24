"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  Home,
  MessageSquareText,
  PackagePlus,
  Settings,
  Ship,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { cn } from "@/lib/format";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/shipments", label: "Shipments", icon: Ship },
  { href: "/shipments/new", label: "Create Shipment", icon: PackagePlus },
  { href: "/feedback", label: "Client Feedback", icon: MessageSquareText },
  { href: "/admin", label: "Admin", icon: Settings },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/shipments") {
    return pathname === "/shipments" || (pathname.startsWith("/shipments/") && pathname !== "/shipments/new");
  }

  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/line/share") || pathname === "/login";

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-zinc-200 bg-white p-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white">
            <ClipboardCheck className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-base font-semibold">HarborBridge</span>
            <span className="text-xs text-zinc-500">Shipping Collaboration MVP</span>
          </span>
        </Link>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive ? "bg-slate-950 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-slate-950",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-sky-100 bg-sky-50 p-4">
          <FileText className="h-5 w-5 text-sky-700" />
          <p className="mt-3 text-sm font-semibold text-slate-950">Secure workspace</p>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Internal shipment tools are protected by Supabase email/password auth.
          </p>
          <LogoutButton />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="font-semibold">
            HarborBridge
          </Link>
          <Link href="/shipments" className="text-sm font-medium text-sky-700">
            Shipments
          </Link>
        </div>
      </header>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
