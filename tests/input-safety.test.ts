import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { api, createVerifiedUser, createAdmin } from "./helpers";

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === "storage") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const SRC_DIR = path.join(process.cwd(), "src");

describe("Static XSS/injection safeguards", () => {
  it("never uses dangerouslySetInnerHTML anywhere in the app", () => {
    const offenders = walk(SRC_DIR).filter((f) => readFileSync(f, "utf8").includes("dangerouslySetInnerHTML"));
    expect(offenders).toEqual([]);
  });

  it("never uses unparameterized raw SQL ($queryRawUnsafe / $executeRawUnsafe)", () => {
    const offenders = walk(SRC_DIR).filter((f) => {
      const content = readFileSync(f, "utf8");
      return content.includes("$queryRawUnsafe") || content.includes("$executeRawUnsafe");
    });
    expect(offenders).toEqual([]);
  });
});

describe("Live injection/XSS-payload handling", () => {
  it("accepts SQL-metacharacter-laden input as inert data, not as a query fragment", async () => {
    const email = `test-inj-${Date.now()}@example.test`;
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Robert'); DROP TABLE User;--",
        email,
        password: "InjectPass123!",
        confirmPassword: "InjectPass123!",
        country: "Testland' OR '1'='1",
      }),
    });
    // Should be treated as an ordinary (if oddly-named) registration, not error or corrupt state.
    expect(res.status).toBe(200);
  });

  it("admin user search tolerates special characters without erroring", async () => {
    const { cookie } = await createAdmin(["SUPPORT_ADMIN"]);
    const payloads = ["%", "_", "' OR '1'='1", "<script>alert(1)</script>", "'; DROP TABLE User; --"];
    for (const q of payloads) {
      const res = await api(`/api/admin/users?q=${encodeURIComponent(q)}`, { cookie });
      expect(res.status).toBe(200);
    }
  });

  it("a stored script payload is returned as inert JSON, never executed server-side", async () => {
    const payload = "<img src=x onerror=alert(1)>";
    const { cookie } = await createVerifiedUser();

    const ticketRes = await api("/api/support/tickets", {
      method: "POST",
      cookie,
      body: JSON.stringify({ subject: payload, message: payload }),
    });
    expect(ticketRes.status).toBe(201);
    const { ticket } = await ticketRes.json();
    // Stored and echoed back verbatim as data — JSON is not HTML, so this is safe;
    // the browser-rendering layer (React) is what must escape it, verified statically above.
    expect(ticket.subject).toBe(payload);
  });
});
