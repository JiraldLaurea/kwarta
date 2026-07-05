import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex gap-2 justify-center items-center">
          <div className="w-fit">
            <LogoMark size={40} />
          </div>
          <h1 className="text-4xl font-semibold">Kwarta</h1>
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-5 px-5 py-8 sm:gap-10 sm:py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <div className="mb-0 flex items-center gap-2 sm:mb-8">
            <LogoMark size={40} />
            <span className="text-4xl font-semibold">Kwarta</span>
          </div>
          <h1 className="hidden max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:block md:text-5xl">
            A precise budget tracker for clearer everyday money decisions.
          </h1>
          <p className="mt-5 hidden max-w-xl text-base leading-7 text-muted-foreground sm:block">
            Manage income, expenses, categories, and budget limits in a focused
            product workspace designed for repeat use.
          </p>
        </section>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-3xl font-semibold leading-9">
              {mode === "login" ? "Sign in" : "Create account"}
            </CardTitle>
            <p className="text-base leading-6 text-muted-foreground">
              {mode === "login"
                ? "Welcome back! Let's sign in to your account."
                : "Create an account to start tracking your money."}
            </p>
          </CardHeader>
          <CardContent>
            <Button
              className="mt-4 w-full"
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
              <p className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-destructive">
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
              <Button className="w-full" type="submit">
                {mode === "login" ? "Sign in" : "Create account"}
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
