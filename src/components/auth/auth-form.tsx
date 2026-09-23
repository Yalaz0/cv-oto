"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from "@/modules/auth/actions";
import {
  type AuthState,
  emailSchema,
  passwordSchema,
} from "@/modules/auth/schemas";

type Mode = "sign-in" | "sign-up" | "reset-password" | "update-password";
type Fields = { email: string; password: string; displayName: string };
const titles: Record<Mode, string> = {
  "sign-in": "Tekrar hoş geldiniz",
  "sign-up": "Hesabınızı oluşturun",
  "reset-password": "Parolanızı yenileyin",
  "update-password": "Yeni parolanızı belirleyin",
};

export function AuthForm({
  mode,
  configured,
}: {
  mode: Mode;
  configured: boolean;
}) {
  const [state, setState] = useState<AuthState>({});
  const isReset = mode === "reset-password";
  const isUpdate = mode === "update-password";
  const schema = z.object({
    email: isUpdate ? z.string() : emailSchema,
    password: isReset ? z.string() : passwordSchema,
    displayName:
      mode === "sign-up"
        ? z.string().trim().min(1, "Adınızı girin.").max(150)
        : z.string(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", displayName: "" },
  });
  async function submit(values: Fields) {
    setState({});
    const result =
      mode === "sign-in"
        ? await signIn(values)
        : mode === "sign-up"
          ? await signUp(values)
          : isReset
            ? await requestPasswordReset(values.email)
            : await updatePassword(values.password);
    setState(result);
  }
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">{titles[mode]}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Doğrulanmış deneyimlerinizden başvurunuza özel bir CV hazırlayın.
      </p>
      {!configured && (
        <p role="alert" className="mt-6 rounded-lg border p-4 text-sm">
          Bağlantı şu anda kullanılamıyor. Lütfen daha sonra yeniden deneyin.
        </p>
      )}
      <form
        className="mt-8 space-y-5"
        onSubmit={handleSubmit(submit)}
        noValidate
      >
        {mode === "sign-up" && (
          <div className="space-y-2">
            <Label htmlFor="displayName">Adınız</Label>
            <Input
              id="displayName"
              autoComplete="name"
              className="h-11"
              aria-invalid={!!errors.displayName}
              aria-describedby={errors.displayName ? "name-error" : undefined}
              {...register("displayName")}
            />
            {errors.displayName && (
              <p id="name-error" className="text-sm text-destructive">
                {errors.displayName.message}
              </p>
            )}
          </div>
        )}
        {!isUpdate && (
          <div className="space-y-2">
            <Label htmlFor="email">E-posta adresiniz</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className="h-11"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>
        )}
        {!isReset && (
          <div className="space-y-2">
            <Label htmlFor="password">
              {isUpdate ? "Yeni parola" : "Parola"}
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              className="h-11"
              aria-invalid={!!errors.password}
              aria-describedby={
                errors.password ? "password-error" : "password-hint"
              }
              {...register("password")}
            />
            <p id="password-hint" className="text-xs text-muted-foreground">
              En az 8 karakter.
            </p>
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
        )}
        {state.error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {state.error}
          </p>
        )}
        {state.success && (
          <output className="block rounded-lg bg-accent p-3 text-sm">
            {state.success}
          </output>
        )}
        <Button
          className="h-11 w-full"
          disabled={isSubmitting || !configured}
          type="submit"
        >
          {isSubmitting ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <ArrowRight />
          )}
          {isReset
            ? "Yenileme bağlantısı gönder"
            : isUpdate
              ? "Parolayı güncelle"
              : mode === "sign-up"
                ? "Hesap oluştur"
                : "Giriş yap"}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
        {mode === "sign-in" ? (
          <>
            <Link
              href="/sign-up"
              className="text-primary underline underline-offset-4"
            >
              Hesap oluştur
            </Link>
            <Link
              href="/reset-password"
              className="text-muted-foreground underline underline-offset-4"
            >
              Parolamı unuttum
            </Link>
          </>
        ) : (
          <Link
            href="/sign-in"
            className="text-primary underline underline-offset-4"
          >
            Girişe dön
          </Link>
        )}
      </div>
    </div>
  );
}
