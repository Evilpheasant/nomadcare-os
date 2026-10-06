import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ALLOWED_EMAIL = "duncan@nomadcare.org";

/** Every page and server action calls this: signed-in AND the one allowed address. */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.email?.toLowerCase() !== ALLOWED_EMAIL) {
    redirect("/login");
  }
  return { supabase, user };
}
