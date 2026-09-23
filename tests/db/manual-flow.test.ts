import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, it } from "vitest";
import { demoJobs, demoResume } from "../../src/modules/demo/fixtures";
import { createMasterDocument } from "../../src/modules/profile/json-resume";
import { fromProfile } from "../../src/modules/template/from-profile";

it("enforces readiness, idempotency, source ownership and revision conflicts", async () => {
  const db = new Client({
    connectionString:
      process.env.TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  });
  await db.connect();
  const owner = randomUUID(),
    other = randomUUID(),
    profileId = randomUUID(),
    requestId = randomUUID();
  async function asUser(user: string, sql: string, values: unknown[]) {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
        user,
      ]);
      const result = await db.query(sql, values);
      await db.query("commit");
      return result;
    } catch (error) {
      await db.query("rollback");
      throw error;
    }
  }
  try {
    for (const id of [owner, other])
      await db.query("insert into auth.users(id,email) values($1,$2)", [
        id,
        `${id}@example.test`,
      ]);
    const job = demoJobs[0];
    const create = () =>
      asUser(owner, "select public.create_application($1,$2,$3,$4,$5) as id", [
        job.companyName,
        job.jobTitle,
        job.jobDescription,
        job.locale,
        requestId,
      ]);
    await expect(create()).rejects.toMatchObject({
      message: "PROFILE_REQUIRED",
    });
    const pending = createMasterDocument(demoResume, "tr-TR", "needs_review");
    await asUser(owner, "select public.save_master_resume($1,0,$2::jsonb)", [
      profileId,
      JSON.stringify(pending),
    ]);
    await expect(create()).rejects.toMatchObject({
      message: "VERIFIED_PROFILE_REQUIRED",
    });
    const profile = createMasterDocument(demoResume, "tr-TR", "verified");
    await asUser(owner, "select public.save_master_resume($1,1,$2::jsonb)", [
      profileId,
      JSON.stringify(profile),
    ]);
    const applicationId = (await create()).rows[0].id;
    expect((await create()).rows[0].id).toBe(applicationId);
    const selectedClaimIds = Object.keys(profile.registry);
    const document = {
      schemaVersion: "1.0",
      templateId: "mehmet-yalaz-v1",
      origin: "user",
      selectedClaimIds,
      pageLimit: 2,
      cv: fromProfile(profile, selectedClaimIds),
    };
    const save = (user: string, revision: number, doc = document) =>
      asUser(user, "select public.save_manual_cv($1,$2,$3::jsonb) as result", [
        applicationId,
        revision,
        JSON.stringify(doc),
      ]);
    expect((await save(owner, 0)).rows[0].result.revision).toBe(1);
    await expect(save(owner, 0)).rejects.toMatchObject({ code: "PT409" });
    await expect(save(other, 1)).rejects.toMatchObject({ code: "PT404" });
    await expect(
      save(owner, 1, { ...document, selectedClaimIds: [randomUUID()] }),
    ).rejects.toMatchObject({ message: "UNVERIFIED_SOURCE" });
    expect((await save(owner, 1)).rows[0].result.revision).toBe(2);
  } finally {
    await db.query("delete from auth.users where id=any($1::uuid[])", [
      [owner, other],
    ]);
    await db.end();
  }
});
