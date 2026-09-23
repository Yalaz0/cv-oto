import { AuthForm } from "@/components/auth/auth-form";
export default function Page() {
  return (
    <AuthForm
      mode="sign-in"
      configured={
        !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    />
  );
}
