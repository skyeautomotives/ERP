import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.roleName !== "Admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { email, fullName, roleId, password } = await request.json();

  if (!email || !fullName || !roleId || !password) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user." },
      { status: 400 },
    );
  }

  const { error: profileError } = await admin.from("user_profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role_id: roleId,
    is_active: true,
    created_by: currentUser.id,
  });

  if (profileError) {
    // Roll back the orphaned auth user so we never end up with an account that can
    // log in but has no profile/role (would break every RLS check for that user).
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ id: created.user.id });
}
