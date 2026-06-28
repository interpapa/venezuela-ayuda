"use client";

import { useState } from "react";
import { addAdmin, removeAdmin, setRole } from "@/app/admin/actions";
import { fullDate } from "@/lib/format";
import type { AdminRow } from "@/lib/admin";

export default function AdminManager({
  admins,
  currentEmail,
}: {
  admins: AdminRow[];
  currentEmail: string;
}) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setPending(true);
    setError(null);
    try {
      const res = await fn();
      if (res.ok) {
        location.reload();
      } else {
        setError(res.error ?? "No se pudo completar la acción.");
        setPending(false);
      }
    } catch {
      setError("No se pudo completar la acción.");
      setPending(false);
    }
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    run(() => addAdmin(clean));
  }

  const ROLES = [
    { key: "super_admin", label: "Super Admin", color: "violet" },
    { key: "admin", label: "Admin", color: "blue" },
    { key: "reviewer", label: "Revisor", color: "emerald" },
    { key: "moderator", label: "Moderador", color: "amber" },
  ];

  return (
    <div className="space-y-5">
      <form
        onSubmit={onAdd}
        className="rounded-2xl border border-[#e6ecf2] bg-white p-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#14212e]">
            Agregar usuario (Otorga rol Admin)
          </span>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="correo@ejemplo.com"
              className="min-w-0 flex-1 rounded-xl border border-[#e6ecf2] px-3.5 py-3 text-base text-[#14212e] outline-none transition focus:border-[#2563a8]"
            />
            <button
              type="submit"
              disabled={pending}
              style={{ backgroundColor: "#2563a8" }}
              className="shrink-0 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Agregar
            </button>
          </div>
        </label>
        {error && (
          <p className="mt-2.5 text-sm font-medium text-red-600">{error}</p>
        )}
      </form>

      <ul className="space-y-2">
        {admins.map((admin) => {
          const isMe = admin.email === currentEmail;
          return (
            <li
              key={admin.email}
              className="flex flex-col gap-3 rounded-2xl border border-[#e6ecf2] bg-white p-4 sm:flex-row sm:items-start"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#14212e]">
                  <span className="truncate">{admin.email}</span>
                  {isMe && (
                    <span className="text-xs font-normal text-[#8190a0]">(tú)</span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ROLES.map((r) => {
                    const hasRole = admin.roles.includes(r.key);
                    const disabled = pending || (isMe && r.key === "super_admin");
                    return (
                      <button
                        key={r.key}
                        type="button"
                        disabled={disabled}
                        onClick={() => run(() => setRole(admin.email, r.key, !hasRole))}
                        className={`rounded-lg border px-2 py-1 text-xs font-medium transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                          hasRole
                            ? `border-${r.color}-200 bg-${r.color}-100 text-${r.color}-800`
                            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        {hasRole ? `✓ ${r.label}` : `+ ${r.label}`}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-[#8190a0]">
                  Agregado {fullDate(admin.created_at)}
                  {admin.added_by ? ` · por ${admin.added_by}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={pending || isMe}
                onClick={() => run(() => removeAdmin(admin.email))}
                className="mt-3 shrink-0 self-start rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0"
              >
                Remover todos
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
