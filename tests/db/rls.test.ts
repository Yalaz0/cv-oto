import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ownerA = randomUUID();
const ownerB = randomUUID();
const resumeId = randomUUID();
let database: Client;

const document = {
  schemaVersion: "1.0",
  resume: {
    basics: { name: "Test User" },
    work: [],
    education: [],
    skills: [],
  },
  registry: {
    basics: { section: "basics", status: "verified", text: "Test User" },
  },
  itemMetadata: {},
};

async function asUser<T>(
  userId: string,
  callback: (client: Client) => Promise<T>,
) {
  await database.query("begin");
  try {
    await database.query("set local role authenticated");
    await database.query(
      "select set_config('request.jwt.claim.sub', $1, true)",
      [userId],
    );
    const result = await callback(database);
    await database.query("commit");
    return result;
  } catch (error) {
    await database.query("rollback");
    throw error;
  }
}

async function createAuthUser(id: string, email: string) {
  await database.query(
    `insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values ($1, 'authenticated', 'authenticated', $2, 'not-used', now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Test User"}', now(), now())`,
    [id, email],
  );
}

describe("Supabase RLS and optimistic concurrency", () => {
  beforeAll(async () => {
    database = new Client({ connectionString: databaseUrl });
    await database.connect();
    await createAuthUser(ownerA, `owner-a-${ownerA}@example.test`);
    await createAuthUser(ownerB, `owner-b-${ownerB}@example.test`);
  });

  afterAll(async () => {
    if (database) {
      await database.query(
        "delete from auth.users where id = any($1::uuid[])",
        [[ownerA, ownerB]],
      );
      await database.end();
    }
  });

  it("creates a profile through the auth trigger and isolates profiles", async () => {
    const own = await asUser(ownerA, (client) =>
      client.query("select user_id from public.user_profiles"),
    );
    const other = await asUser(ownerB, (client) =>
      client.query("select user_id from public.user_profiles"),
    );
    expect(own.rows).toEqual([{ user_id: ownerA }]);
    expect(other.rows).toEqual([{ user_id: ownerB }]);
  });

  it("uses an owner-bound RPC to create immutable master snapshots", async () => {
    const created = await asUser(ownerA, (client) =>
      client.query(
        "select public.save_master_resume($1, 0, $2::jsonb) as result",
        [resumeId, JSON.stringify(document)],
      ),
    );
    expect(created.rows[0].result.version).toBe(1);
    const snapshots = await asUser(ownerA, (client) =>
      client.query(
        "select version from public.master_resume_versions where master_resume_id = $1",
        [resumeId],
      ),
    );
    expect(snapshots.rows).toEqual([{ version: 1 }]);
  });

  it("creates an application from the active verified profile version", async () => {
    const created = await asUser(ownerA, (client) =>
      client.query(
        "select public.create_application($1, $2, $3, $4, $5) as id",
        ["Example", "Analyst", "A".repeat(200), "tr-TR", randomUUID()],
      ),
    );
    expect(created.rows[0].id).toMatch(/[0-9a-f-]{36}/);
  });

  it("blocks cross-user reads, direct writes, and stale revision overwrites", async () => {
    const inaccessible = await asUser(ownerB, (client) =>
      client.query("select id from public.master_resumes where id = $1", [
        resumeId,
      ]),
    );
    expect(inaccessible.rows).toEqual([]);
    await expect(
      asUser(ownerB, (client) =>
        client.query("select public.save_master_resume($1, 1, $2::jsonb)", [
          resumeId,
          JSON.stringify(document),
        ]),
      ),
    ).rejects.toMatchObject({ code: "PT404" });
    const updated = await asUser(ownerA, (client) =>
      client.query(
        "select public.save_master_resume($1, 1, $2::jsonb) as result",
        [resumeId, JSON.stringify(document)],
      ),
    );
    expect(updated.rows[0].result.version).toBe(2);
    await expect(
      asUser(ownerA, (client) =>
        client.query("select public.save_master_resume($1, 1, $2::jsonb)", [
          resumeId,
          JSON.stringify(document),
        ]),
      ),
    ).rejects.toMatchObject({ code: "PT409" });
    await expect(
      asUser(ownerA, (client) =>
        client.query(
          "insert into public.master_resumes (id, user_id, document) values ($1, $2, $3::jsonb)",
          [randomUUID(), ownerA, JSON.stringify(document)],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("does not expose credentials or allow snapshot mutations to browser roles", async () => {
    await expect(
      asUser(ownerA, (client) =>
        client.query("select * from public.ai_credentials"),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      asUser(ownerA, (client) =>
        client.query(
          "update public.master_resume_versions set document = '{}'::jsonb where master_resume_id = $1",
          [resumeId],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});
