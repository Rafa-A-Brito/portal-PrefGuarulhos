// Os testes HTTP legados continuam isolados do banco. A implementação real
// dos novos controles é exercitada em authSecurity.integration.test.js.
export async function mockLoginSecurity(t) {
    const { loginAccounts } = await import("../src/services/loginAccountService.js");
    const { loginAccesses } = await import("../src/services/loginAccessService.js");
    for (const [target, key, fn] of [[loginAccounts, "begin", async () => ({ retryAfter: 0 })],
        [loginAccounts, "finish", async () => 0], [loginAccesses, "record", async () => null]]) {
        const original = target[key]; target[key] = fn; t.after(() => { target[key] = original; });
    }
}
