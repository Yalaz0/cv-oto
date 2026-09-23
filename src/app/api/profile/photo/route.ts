import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const { data, error } = await client.storage
    .from("profile-photos")
    .download(`${user.id}/profile.jpg`);
  if (error || !data) return new Response(null, { status: 404 });
  return new Response(data, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "Content-Type": "image/jpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
