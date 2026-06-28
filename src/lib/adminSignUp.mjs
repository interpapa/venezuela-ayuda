const MIN_PASSWORD = 12;
const LOGIN_LIMIT = { p_limit: 8, p_window_sec: 900, p_lockout_sec: 900 };

function emailOf(form) {
  return String(form.get("email") || "").trim().toLowerCase();
}

function lockedMsg(seconds) {
  return `Demasiados intentos fallidos. Intenta de nuevo en ${Math.ceil(seconds / 60)} min.`;
}

// Lógica extraída para inyección de dependencias y pruebas automatizadas
export async function _adminSignUpLogic(form, deps) {
  if (!deps.isSupabaseConfigured()) return { error: "Servicio no disponible." };
  const email = emailOf(form);
  const password = String(form.get("password") || "");
  if (!email || password.length < MIN_PASSWORD)
    return { error: `Usa una contraseña de al menos ${MIN_PASSWORD} caracteres.` };

  const svc = deps.getServerSupabase();
  const key = await deps.clientKey("login");
  const { data: lockedFor } = await svc.rpc("login_guard", { p_key: key });
  if (typeof lockedFor === "number" && lockedFor > 0) return { error: lockedMsg(lockedFor) };

  const GENERIC = "No se pudo crear la cuenta. Verifica los datos o contacta a un administrador.";

  if (!(await deps.isEmailAdmin(email))) {
    await svc.rpc("login_record_failure", { p_key: key, ...LOGIN_LIMIT });
    
    // DUMMY HASH: Ejecutamos una verificación de coste fijo (bcrypt) contra 
    // la base de datos simulando un login de un correo que no existe. 
    // Esto iguala el coste de red y CPU para cerrar el oráculo de tiempo.
    const auth = await deps.getAuthClient();
    await auth.auth.signInWithPassword({ email: "dummy-timing@example.com", password: "dummy-password-123!" });
    
    return { error: GENERIC };
  }

  const { error: createErr } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr && !/already|registered|exists/i.test(createErr.message)) {
    deps.logWarn("admin_signup_create_failed", { scope: "admin.adminSignUp" }, createErr);
    return { error: GENERIC };
  }

  const auth = await deps.getAuthClient();
  const { error: signErr } = await auth.auth.signInWithPassword({ email, password });
  if (signErr) {
    if (!createErr) deps.logError("admin_signup_signin_failed", signErr, { scope: "admin.adminSignUp" });
    return {
      error: createErr
        ? "Ese correo ya tiene una cuenta. Usa Iniciar sesión."
        : GENERIC,
    };
  }
  await svc.rpc("login_clear", { p_key: key });
  deps.redirect("/admin");
  return { error: undefined }; // Tipado de Next.js
}
