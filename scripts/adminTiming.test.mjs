import { test } from "node:test";
import assert from "node:assert/strict";
import { _adminSignUpLogic } from "../src/lib/adminSignUp.mjs";

test("adminSignUp: simetría criptográfica entre ramas autorizadas y no autorizadas", async () => {
  // Counters for symmetric execution
  let createCalledCount = 0;
  let signInCalledCount = 0;

  const resetCounters = () => {
    createCalledCount = 0;
    signInCalledCount = 0;
  };

  const createDeps = (isAdmin) => ({
    isSupabaseConfigured: () => true,
    clientKey: async () => "login:127.0.0.1",
    getServerSupabase: () => ({
      rpc: async () => ({ data: null }),
      auth: { 
        admin: { 
          createUser: async () => {
            createCalledCount++;
            return { error: null };
          } 
        } 
      }
    }),
    getAuthClient: async () => ({
      auth: {
        signInWithPassword: async (args) => {
          signInCalledCount++;
          return { error: { message: "Invalid credentials" } };
        }
      }
    }),
    isEmailAdmin: async () => isAdmin,
    redirect: () => {},
    logWarn: () => {},
    logError: () => {}
  });

  const formData = new Map([
    ["email", "hacker@example.com"],
    ["password", "SuperSecret123!"]
  ]);
  const origGet = formData.get.bind(formData);
  formData.get = (key) => origGet(key) || null;

  // CASO 1: Rama no autorizada (Hacker intentando registrarse o enumerar)
  resetCounters();
  let result = await _adminSignUpLogic(formData, createDeps(false));
  assert.equal(result.error, "No se pudo crear la cuenta. Verifica los datos o contacta a un administrador.");
  assert.equal(createCalledCount, 1, "La rama no autorizada debe llamar a createUser exactamente 1 vez (Dummy)");
  assert.equal(signInCalledCount, 1, "La rama no autorizada debe llamar a signInWithPassword exactamente 1 vez (Dummy)");

  // CASO 2: Rama autorizada (Admin real intentando registrarse pero falla el sign-in)
  resetCounters();
  result = await _adminSignUpLogic(formData, createDeps(true));
  assert.equal(result.error, "No se pudo crear la cuenta. Verifica los datos o contacta a un administrador.");
  assert.equal(createCalledCount, 1, "La rama autorizada debe llamar a createUser exactamente 1 vez (Real)");
  assert.equal(signInCalledCount, 1, "La rama autorizada debe llamar a signInWithPassword exactamente 1 vez (Real)");
});
