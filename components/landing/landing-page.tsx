import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Palette,
  PieChart,
  ShieldCheck,
  Smartphone,
  Tags,
  TrendingUp,
  WalletMinimal,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/reveal";
import { ThemeToggle } from "@/components/landing/theme-toggle";

const ACCOUNT_LOGOS = [
  "bdo",
  "bpi",
  "gcash",
  "gotyme",
  "maribank",
  "maya",
  "unionbank",
] as const;

const FEATURES = [
  {
    icon: WalletMinimal,
    title: "Track every peso",
    description:
      "Log income and expenses in seconds and always know where your money went.",
  },
  {
    icon: Tags,
    title: "Categories & budgets",
    description:
      "Organize spending into custom categories and set monthly limits that keep you on track.",
  },
  {
    icon: PieChart,
    title: "All your accounts",
    description:
      "Cash, banks, and e-wallets in one place — with transfers between them handled cleanly.",
  },
  {
    icon: BarChart3,
    title: "Reports that guide you",
    description:
      "Financial health, 6-month trends, and budget vs. actual — insights, not just numbers.",
  },
  {
    icon: WifiOff,
    title: "Works offline",
    description:
      "Add and edit anywhere. Kwarta keeps working with no signal and syncs when you reconnect.",
  },
  {
    icon: Palette,
    title: "Make it yours",
    description:
      "Light, dark, or system, four accent colors, and home layouts that fit how you work.",
  },
] as const;

const FAQS = [
  {
    question: "Is Kwarta free to use?",
    answer:
      "Yes. Create an account and start tracking your money right away — no card required.",
  },
  {
    question: "Does it really work offline?",
    answer:
      "Kwarta is a Progressive Web App. Once opened, it keeps working without a connection and syncs your changes automatically when you're back online.",
  },
  {
    question: "Can I install it on my phone?",
    answer:
      "Absolutely. Open Kwarta in your mobile browser and add it to your home screen for a full-screen, app-like experience.",
  },
  {
    question: "Is my financial data private?",
    answer:
      "Your workspace is tied to your own account. Only you can see your income, expenses, and budgets.",
  },
] as const;

function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 ${className ?? ""}`}
      aria-label="Kwarta home"
    >
      <Image
        aria-hidden
        className="shrink-0 rounded-md bg-black p-[2px] dark:invert"
        height={28}
        src="/icons/icon-192.png"
        alt=""
        width={28}
        unoptimized
      />
      <span className="text-lg font-semibold tracking-tight">Kwarta</span>
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Logo className="justify-self-start" />
          <nav className="hidden items-center gap-8 justify-self-center text-sm font-medium text-muted-foreground md:flex">
            <a className="transition-colors hover:text-foreground" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-foreground" href="#reports">
              Reports
            </a>
            <a className="transition-colors hover:text-foreground" href="#faq">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2 justify-self-end">
            <ThemeToggle />
            <Button asChild size="sm" className="group">
              <Link href="/app">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center">
            <div className="h-72 w-[46rem] max-w-full rounded-full bg-accent/10 blur-3xl" />
          </div>
          <div className="mx-auto w-full max-w-6xl px-5 pb-8 pt-16 text-center sm:pt-24">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Free · Works offline · Installs like an app
              </span>
            </Reveal>
            <Reveal
              as="h1"
              delay={80}
              className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl"
            >
              Clearer everyday money decisions.
            </Reveal>
            <Reveal
              as="p"
              delay={160}
              className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              Kwarta is a precise, focused budget tracker for your income,
              expenses, categories, and limits — built for repeat, everyday use.
            </Reveal>
            <Reveal
              delay={240}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button asChild size="default" className="group w-full sm:w-auto">
                <Link href="/app">
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                size="default"
                className="w-full sm:w-auto"
              >
                <a href="#features">See what&apos;s inside</a>
              </Button>
            </Reveal>
            <Reveal as="p" delay={320} className="mt-4 text-xs text-muted-foreground">
              No credit card required.
            </Reveal>
          </div>

          {/* App preview */}
          <Reveal
            delay={200}
            className="mx-auto w-full max-w-4xl px-5 pb-16 sm:pb-24"
          >
            <AppPreview />
          </Reveal>
        </section>

        {/* Trust strip */}
        <section className="border-y border-border bg-card/40">
          <Reveal className="mx-auto w-full max-w-6xl px-5 py-10">
            <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Built for the accounts you already use
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
              {ACCOUNT_LOGOS.map((logo) => (
                <Image
                  key={logo}
                  src={`/account-logos/${logo}.svg`}
                  alt={logo}
                  width={92}
                  height={28}
                  className="h-6 w-auto opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0 dark:opacity-70"
                />
              ))}
            </div>
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything you need to stay on budget
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Powerful where it matters, simple everywhere else. Kwarta keeps the
              focus on the numbers that change your decisions.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={(index % 3) * 90}>
                <div className="group h-full rounded-xl border border-border bg-card p-6 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_34px_rgba(0,0,0,0.06)]">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-muted text-accent-muted-foreground transition-transform duration-300 group-hover:scale-105">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Reports showcase */}
        <section id="reports" className="border-y border-border bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 sm:py-24 lg:grid-cols-2">
            <Reveal>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-accent-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                Reports
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Insights that tell you what to do next
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Kwarta turns your transactions into a clear read on your finances —
                so you spot overspending early and see your progress over time.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Financial health at a glance — savings rate, daily average, projected spend",
                  "6-month trends for income, expenses, and net",
                  "Budget vs. actual with over-limit categories flagged",
                  "This period compared with the last",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent-muted-foreground">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <ReportsPreview />
            </Reveal>
          </div>
        </section>

        {/* PWA callout */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-24">
          <Reveal className="grid items-center gap-10 rounded-2xl border border-border bg-card p-8 sm:p-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-muted text-accent-muted-foreground">
                <Smartphone className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Install Kwarta on your phone
              </h2>
              <p className="mt-3 max-w-lg text-base leading-7 text-muted-foreground">
                Add it to your home screen for a full-screen, offline-ready app —
                no app store, no download, no waiting.
              </p>
              <div className="mt-6">
                <Button asChild className="group">
                  <Link href="/app">
                    Open Kwarta
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
            <ul className="space-y-4">
              {[
                { icon: WifiOff, label: "Works with no connection" },
                { icon: ShieldCheck, label: "Private to your account" },
                { icon: Palette, label: "Themes and layouts you control" },
              ].map((item) => (
                <li
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background p-4 text-sm font-medium transition-colors hover:bg-[hsl(var(--hover-surface))]"
                >
                  <item.icon className="h-5 w-5 text-accent-muted-foreground" />
                  {item.label}
                </li>
              ))}
            </ul>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto w-full max-w-3xl px-5 pb-20 sm:pb-24">
          <Reveal className="text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal
            delay={80}
            className="mt-10 divide-y divide-border rounded-xl border border-border bg-card"
          >
            {FAQS.map((faq) => (
              <details key={faq.question} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform duration-200 group-open:rotate-45">
                    <Plus />
                  </span>
                </summary>
                <p className="pb-5 text-sm leading-6 text-muted-foreground">
                  {faq.answer}
                </p>
              </details>
            ))}
          </Reveal>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-20 sm:pb-24">
          <Reveal className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
            <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Take control of your money today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base leading-7 opacity-80">
              Start tracking in minutes. It&apos;s free, it&apos;s fast, and it
              works wherever you are.
            </p>
            <div className="mt-8">
              <Button asChild variant="secondary" size="default" className="group">
                <Link href="/app">
                  Get started free
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-5 py-8 sm:grid sm:grid-cols-3 sm:gap-0">
          <Logo className="sm:justify-self-start" />
          <nav className="flex items-center gap-6 text-sm text-muted-foreground sm:justify-self-center">
            <a className="transition-colors hover:text-foreground" href="#features">
              Features
            </a>
            <a className="transition-colors hover:text-foreground" href="#reports">
              Reports
            </a>
            <a className="transition-colors hover:text-foreground" href="#faq">
              FAQ
            </a>
          </nav>
          <p className="text-xs text-muted-foreground sm:justify-self-end">
            © 2026 Kwarta. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Plus() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Decorative previews — built from the same design tokens as the app  */
/* ------------------------------------------------------------------ */

function AppPreview() {
  const rows = [
    { name: "Food & dining", spent: 4200, limit: 6000, color: "#F97316" },
    { name: "Transport", spent: 1850, limit: 2500, color: "#2563EB" },
    { name: "Bills & utilities", spent: 3100, limit: 3000, color: "#DC2626" },
    { name: "Savings", spent: 5000, limit: 5000, color: "#16A34A" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] sm:p-4">
      <div className="rounded-xl border border-border bg-background p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              This month
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              ₱14,150{" "}
              <span className="text-sm font-normal text-muted-foreground">
                of ₱16,500
              </span>
            </p>
          </div>
          <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-medium text-accent-muted-foreground">
            86% used
          </span>
        </div>

        <div className="mt-6 space-y-4">
          {rows.map((row) => {
            const pct = Math.min(100, Math.round((row.spent / row.limit) * 100));
            const over = row.spent > row.limit;
            return (
              <div key={row.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    {row.name}
                  </span>
                  <span
                    className={
                      over
                        ? "font-medium text-red-600"
                        : "tabular-nums text-muted-foreground"
                    }
                  >
                    {pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: over ? "#DC2626" : row.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReportsPreview() {
  const bars = [40, 62, 48, 74, 58, 88];
  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.2)] sm:p-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Savings rate", value: "24%", tone: "text-green-600" },
          { label: "Avg / day", value: "₱472" },
          { label: "Projected", value: "₱14.6k" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border p-3">
            <p className="truncate text-[11px] font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p
              className={`mt-1 text-base font-semibold ${stat.tone ?? ""}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">6-month trend</p>
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <TrendingUp className="h-3.5 w-3.5" />
            +12%
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
