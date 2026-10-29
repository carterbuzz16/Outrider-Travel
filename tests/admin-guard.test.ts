/*
 * The admin role check: who counts as an admin (lib/admin-role.ts), and that
 * every admin server action and route handler asks on its own, not only the
 * page or layout around it. The second half reads the source, so a new admin
 * action that forgets the check fails here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { viewerFrom, type RoleClient } from "@/lib/admin-role";

function client(user: { id: string } | null, role: string | null, error: unknown = null): RoleClient {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: role === null ? null : { role }, error }),
        }),
      }),
    }),
  };
}

test("only a signed-in user whose own row says admin is an admin", async () => {
  assert.deepEqual(await viewerFrom(client({ id: "u1" }, "admin")), { userId: "u1", isAdmin: true });
  assert.deepEqual(await viewerFrom(client({ id: "u1" }, "customer")), { userId: "u1", isAdmin: false });
  assert.deepEqual(await viewerFrom(client({ id: "u1" }, null)), { userId: "u1", isAdmin: false });
  assert.deepEqual(await viewerFrom(client({ id: "u1" }, "admin", { message: "boom" })), { userId: "u1", isAdmin: false });
  assert.deepEqual(await viewerFrom(client(null, "admin")), { userId: null, isAdmin: false });
});

function files(dir: string, match: (name: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path, match) : match(name) ? [path] : [];
  });
}

/** Each exported function's body, from its declaration to the next top-level export. */
function exportedFunctions(source: string): { name: string; body: string }[] {
  const re = /^export (?:async )?function (\w+)\s*\(/gm;
  const starts = [...source.matchAll(re)];
  return starts.map((m, i) => ({
    name: m[1],
    body: source.slice(m.index!, i + 1 < starts.length ? starts[i + 1].index : source.length),
  }));
}

const ROOT = join(__dirname, "..");

test("every admin server action and route handler checks the role itself", () => {
  const targets = files(join(ROOT, "app/admin"), (n) => n === "actions.ts" || n === "route.ts");
  assert.ok(targets.length >= 5, "found the admin actions and routes");
  for (const file of targets) {
    for (const fn of exportedFunctions(readFileSync(file, "utf8"))) {
      assert.match(fn.body, /await (requireAdmin|getAdminUserId)\(\)/, `${file.replace(ROOT, "")}: ${fn.name} has no role check`);
    }
  }
});

test("every ambassador portal action and route decides who is asking from the session", () => {
  const targets = [
    ...files(join(ROOT, "app/(ambassador)"), (n) => n === "actions.ts" || n === "route.ts"),
    ...files(join(ROOT, "app/api/ambassador"), (n) => n === "route.ts"),
  ];
  assert.ok(targets.length >= 3);
  for (const file of targets) {
    const source = readFileSync(file, "utf8");
    for (const fn of exportedFunctions(source)) {
      assert.match(fn.body, /getPortalAccess\(\)|ambassadorOrBack\(\)/, `${file.replace(ROOT, "")}: ${fn.name} has no session check`);
      // None of them may read an ambassador code or id from the request.
      assert.doesNotMatch(fn.body, /formData\.get\("(code|ambassador|user_id)"\)|searchParams\.get\("(code|ambassador)"\)/);
    }
  }
});
