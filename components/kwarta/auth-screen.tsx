import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LuArrowRight as ArrowRight, LuCheck as Check } from "react-icons/lu";
import { authSchema, type AuthFormValues } from "@/lib/schema";
import type { AuthMode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FieldError,
  GoogleLogo,
  LogoMark,
} from "@/components/kwarta/shared";

const AUTH_HIGHLIGHTS = [
  "Track income, expenses, and budgets in seconds",
  "Works offline and installs like an app",
  "Reports that turn your numbers into decisions",
] as const;

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex gap-2 justify-center items-center">
          <div className="w-fit">
            <LogoMark size={40} />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight">Kwarta</h1>
        </div>
        <p className="mt-2 inline-flex items-center justify-center gap-2 text-sm leading-5 text-muted-foreground">
          <span
            className="h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-foreground"
            aria-hidden
          />
        </p>
      </div>
    </main>
  );
}

export function AuthScreen({
  error,
  mode,
  onEmailSubmit,
  onModeChange,
  onGoogleLogin,
}: {
  error: string | null;
  mode: AuthMode;
  onEmailSubmit: (values: AuthFormValues) => void | Promise<void>;
  onModeChange: (mode: AuthMode) => void;
  onGoogleLogin: () => void;
}) {
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative glow, echoing the landing hero */}
      <div className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center">
        <div className="h-72 w-[46rem] max-w-full rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-5 px-5 py-8 sm:gap-10 sm:py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <div className="mb-0 flex items-center gap-2 sm:mb-8">
            <LogoMark size={40} />
            <span className="text-4xl font-semibold tracking-tight">
              Kwarta
            </span>
          </div>
          <span className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Free · Works offline · Installs like an app
          </span>
          <h1 className="mt-6 hidden max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:block md:text-5xl">
            A precise budget tracker for clearer everyday money decisions.
          </h1>
          <p className="mt-5 hidden max-w-xl text-base leading-7 text-muted-foreground sm:block">
            Manage income, expenses, categories, and budget limits in a focused
            product workspace designed for repeat use.
          </p>
          <ul className="mt-8 hidden space-y-3 sm:block">
            {AUTH_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-muted text-accent-muted-foreground">
                  <Check className="h-3 w-3" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <Card className="bg-card shadow-[0_24px_60px_-24px_rgba(0,0,0,0.2)]">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-3xl font-semibold leading-9 tracking-tight">
              {mode === "login" ? "Sign in" : "Create account"}
            </CardTitle>
            <p className="text-base leading-6 text-muted-foreground">
              {mode === "login"
                ? "Welcome back! Let's sign in to your account."
                : "Create an account to start tracking your money."}
            </p>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button
              className="w-full"
              type="button"
              variant="secondary"
              onClick={onGoogleLogin}
            >
              <GoogleLogo className="h-5 w-5" />
              {mode === "login"
                ? "Sign in with Google"
                : "Sign up with Google"}
            </Button>
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-sm leading-5 text-muted-foreground">
                or
              </span>
              <div className="flex-1 border-t border-border" />
            </div>
            {error && (
              <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm leading-5 text-destructive">
                {error}
              </p>
            )}
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onEmailSubmit)}
            >
              <FieldError message={form.formState.errors.email?.message}>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </FieldError>
              <FieldError message={form.formState.errors.password?.message}>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                />
              </FieldError>
              <Button className="group w-full" type="submit">
                {mode === "login" ? "Sign in" : "Create account"}
                <ArrowRight className="h-4 w-4 transition-transform duration-200 md:group-hover:translate-x-0.5" />
              </Button>
            </form>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted-foreground">
                {mode === "login"
                  ? "Don't have an account?"
                  : "Already registered?"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onModeChange(mode === "login" ? "register" : "login")
                }
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
