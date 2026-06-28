import { test } from "node:test";
import assert from "node:assert/strict";
import { _adminSignUpLogic } from "../src/lib/adminSignUp.mjs";

test("adminSignUp: rama no autorizada ejecuta Dummy Hash", async () => {
  let dummyHashCalled = false;
  let dummyHashEmail = null;

  // Creamos dependencias simuladas (stubs) en lugar de usar mocks de módulos
  const deps = {
    isSupabaseConfigured: () => true,
    clientKey: async () => "login:127.0.0.1",
    getServerSupabase: () => ({
      rpc: async () => ({ data: null }),
      auth: { admin: { createUser: async () => ({ error: null }) } }
    }),
    getAuthClient: async () => ({
      auth: {
        signInWithPassword: async (args) => {
          dummyHashCalled = true;
          dummyHashEmail = args.email;
          return { error: { message: "Invalid credentials" } };
        }
      }
    }),
    isEmailAdmin: async () => false, // No es admin, dispara rama no autorizada
    redirect: () => {}
  };

  const formData = new Map([
    ["email", "hacker@example.com"],
    ["password", "SuperSecret123!"]
  ]);
  const origGet = formData.get.bind(formData);
  formData.get = (key) => origGet(key) || null;
  
  const result = await _adminSignUpLogic(formData, deps);

  assert.equal(result.error, "No se pudo crear la cuenta. Verifica los datos o contacta a un administrador.");
  assert.ok(dummyHashCalled, "El Dummy Hash no fue ejecutado");
  assert.equal(dummyHashEmail, "dummy-timing@example.com", "El correo usado para el Dummy Hash no es el esperado");
});
