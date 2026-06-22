import type { ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn, statusTone, titleize } from "@/lib/format";

export function Badge({ value, className }: { value: string; className?: string }) {
  const tone = statusTone(value);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "green" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        tone === "blue" && "border-sky-200 bg-sky-50 text-sky-700",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-800",
        tone === "red" && "border-rose-200 bg-rose-50 text-rose-700",
        tone === "zinc" && "border-zinc-200 bg-zinc-50 text-zinc-700",
        className,
      )}
    >
      {titleize(value)}
    </span>
  );
}

export function Card({
  children,
  className,
  ...props
}: Readonly<ComponentPropsWithoutRef<"section">>) {
  return (
    <section className={cn("rounded-lg border border-zinc-200 bg-white p-5 shadow-sm", className)} {...props}>
      {children}
    </section>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: Readonly<{ href: string; children: React.ReactNode; variant?: "primary" | "secondary" }>) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition",
        variant === "primary" && "bg-slate-950 text-white hover:bg-slate-800",
        variant === "secondary" && "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50",
      )}
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: Readonly<{
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 gap-2">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  helper,
}: Readonly<{ label: string; value: string | number; helper: string }>) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: Readonly<{ title: string; description: string }>) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600">{description}</p>
    </div>
  );
}

export function Field({
  label,
  value,
}: Readonly<{ label: string; value?: string | number | null }>) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-950">{value || "Not set"}</dd>
    </div>
  );
}

export function TextInput({
  label,
  type = "text",
  ...props
}: Readonly<{ label: string } & Omit<ComponentPropsWithoutRef<"input">, "className">>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <input
        type={type}
        {...props}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

export function TextArea({
  label,
  rows = 4,
  ...props
}: Readonly<{ label: string } & Omit<ComponentPropsWithoutRef<"textarea">, "className">>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <textarea
        rows={rows}
        {...props}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition placeholder:text-zinc-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

export function SelectField({
  label,
  options,
  ...props
}: Readonly<{ label: string; options: string[] } & Omit<ComponentPropsWithoutRef<"select">, "className">>) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      <select
        {...props}
        className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}
