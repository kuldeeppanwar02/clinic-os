import "server-only";

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
  supabaseServiceRoleKey:
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  supabaseDatabaseUrl:
    process.env.SUPABASE_DATABASE_URL?.trim() ?? "",
  supabaseStorageBucket:
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ?? "prescriptions",
  staffAllowedEmails:
    process.env.STAFF_ALLOWED_EMAILS?.split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean) ?? [],
  staffSessionSecret: (() => {
    const secret = process.env.STAFF_SESSION_SECRET?.trim() ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!secret) {
      throw new Error(
        "❌ CRITICAL ERROR: STAFF_SESSION_SECRET is missing! " +
        "Without this, your admin login is completely insecure."
      );
    }
    return secret;
  })(),
  masterEmail: "panwarkuldeep256@gmail.com",

  // Per-clinic doctor config
  doctors: {
    ortho: {
      pin: process.env.DOCTOR_PIN_ORTHO?.trim() ?? "",
      name: process.env.DOCTOR_NAME_ORTHO?.trim() ?? "Dr. Kuldeep Panwar",
    },
    surgery: {
      pin: process.env.DOCTOR_PIN_SURGERY?.trim() ?? "",
      name: process.env.DOCTOR_NAME_SURGERY?.trim() ?? "Dr. M L Didel",
    },
    medicine: {
      pin: process.env.DOCTOR_PIN_MEDICINE?.trim() ?? "",
      name: process.env.DOCTOR_NAME_MEDICINE?.trim() ?? "Dr. Rajesh Bochaliya",
    },
    urology: {
      pin: process.env.DOCTOR_PIN_UROLOGY?.trim() ?? "",
      name: process.env.DOCTOR_NAME_UROLOGY?.trim() ?? "Dr. Nishkarsh Mehta",
    },
    anaesthesia: {
      pin: process.env.DOCTOR_PIN_ANAESTHESIA?.trim() ?? "",
      name: process.env.DOCTOR_NAME_ANAESTHESIA?.trim() ?? "Dr. Pankaj Saini",
    },
  },
};

export function hasSupabaseServerConfig() {
  return Boolean(
    serverEnv.supabaseUrl &&
      serverEnv.supabaseServiceRoleKey &&
      serverEnv.supabaseDatabaseUrl,
  );
}
