import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
let db, alice, bob, aliceAgent, bobAgent, privateSkill, sharedSkill;
const migration = new URL(
  "../supabase/migrations/20260907165533_shared_campground.sql",
  import.meta.url,
);
export async function createTestDatabase() {
  const instance = new PGlite();
  await instance.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(),raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
  );
  await instance.exec(await readFile(migration, "utf8"));
  return instance;
}
async function as(user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    await tx.query(`select set_config('request.jwt.claim.sub',$1,true)`, [
      user || "",
    ]);
    return tx.query(sql, params);
  });
}
const call = async (user, func, args) =>
  (
    await as(
      user,
      `select public.camp_${func}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as value`,
      args,
    )
  ).rows[0].value;
before(async () => {
  db = await createTestDatabase();
  alice = (
    await db.query(
      `insert into auth.users(raw_user_meta_data) values ('{"display_name":"Alice"}') returning id`,
    )
  ).rows[0].id;
  bob = (
    await db.query(
      `insert into auth.users(raw_user_meta_data) values ('{"display_name":"Bo"}') returning id`,
    )
  ).rows[0].id;
  aliceAgent = await call(alice, "save_agent", [
    null,
    {
      name: "Wayfinder",
      current_project: "Accessible maps",
      tags: ["maps"],
      sprite_variant: 1,
    },
  ]);
  bobAgent = await call(bob, "save_agent", [
    null,
    {
      name: "Ember",
      current_project: "Community tools",
      tags: ["react"],
      sprite_variant: 0,
    },
  ]);
  privateSkill = await call(alice, "save_skill", [
    aliceAgent,
    null,
    {
      title: "Private notes",
      body: "Keep this private",
      description: "Notes",
      type: "doc",
      visibility: "private",
    },
  ]);
  sharedSkill = await call(alice, "save_skill", [
    aliceAgent,
    null,
    {
      title: "Careful review",
      body: "Read the intent first",
      description: "A review prompt",
      type: "prompt",
      visibility: "public",
    },
  ]);
});
after(async () => db?.close());
test("visitors can see travelers and public resources only", async () => {
  assert.equal(
    (await as(null, "select * from public.camp_agents")).rows.length,
    2,
  );
  assert.equal(
    (await as(null, "select * from public.camp_skills")).rows.length,
    1,
  );
  assert.equal(
    (
      await as(bob, "select * from public.camp_skills where id=$1", [
        privateSkill,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (await as(alice, "select * from public.camp_skills")).rows.length,
    2,
  );
});
test("ownership cannot be changed or bypassed through direct table writes", async () => {
  await assert.rejects(
    as(bob, "update public.camp_agents set user_id=$1 where id=$2", [
      bob,
      aliceAgent,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    call(bob, "move_agent", [aliceAgent, 300, 300]),
    /only move your own/,
  );
  await assert.rejects(
    call(bob, "save_agent", [
      aliceAgent,
      { name: "Intruder", current_project: "Nope" },
    ]),
    /not available/,
  );
  await assert.rejects(
    call(bob, "save_skill", [
      aliceAgent,
      null,
      { title: "Nope", body: "Nope", type: "doc" },
    ]),
    /own active agents/,
  );
  await assert.rejects(
    call(null, "save_agent", [null, { name: "Nope", current_project: "Nope" }]),
    /permission denied/,
  );
});
test("private resources cannot be collected by other users or injected into another pack", async () => {
  await assert.rejects(
    call(bob, "collect_skill", [privateSkill, bobAgent]),
    /not available/,
  );
  await assert.rejects(
    call(alice, "collect_skill", [sharedSkill, bobAgent]),
    /own active agents/,
  );
  assert.equal(
    (await db.query("select * from public.camp_trades")).rows.length,
    0,
  );
});
test("collection atomically creates a credited private snapshot and one receipt", async () => {
  const copy = await call(bob, "collect_skill", [sharedSkill, bobAgent]);
  const resource = (
    await as(bob, "select * from public.camp_skills where id=$1", [copy])
  ).rows[0];
  assert.equal(resource.body, "Read the intent first");
  assert.equal(resource.author_name, "Alice");
  assert.equal(resource.visibility, "private");
  assert.equal(resource.source_skill_id, sharedSkill);
  assert.equal(
    (await as(null, "select * from public.camp_skills where id=$1", [copy]))
      .rows.length,
    0,
  );
  assert.equal(
    (await as(alice, "select * from public.camp_trades")).rows.length,
    1,
  );
  assert.equal(
    (await as(bob, "select * from public.camp_trades")).rows.length,
    1,
  );
  assert.equal(await call(bob, "collect_skill", [sharedSkill, bobAgent]), copy);
  assert.equal(
    (await db.query("select * from public.camp_trades")).rows.length,
    1,
  );
  await call(alice, "save_skill", [
    aliceAgent,
    sharedSkill,
    {
      title: "Revised",
      description: "New version",
      body: "Changed original",
      type: "prompt",
      visibility: "private",
    },
  ]);
  assert.equal(
    (await as(bob, "select body from public.camp_skills where id=$1", [copy]))
      .rows[0].body,
    "Read the intent first",
  );
  await call(alice, "archive_skill", [sharedSkill]);
  assert.equal(
    (await as(bob, "select * from public.camp_skills where id=$1", [copy])).rows
      .length,
    1,
  );
});
test("failed receipt insertion rolls the copied resource back", async () => {
  const fresh = await call(alice, "save_skill", [
    aliceAgent,
    null,
    {
      title: "Atomic",
      description: "Test",
      body: "Atomic body",
      type: "doc",
      visibility: "public",
    },
  ]);
  await db.exec(
    `create function camp_private.fail_receipt() returns trigger language plpgsql as $$begin raise exception 'simulated receipt failure'; end$$; create trigger test_fail before insert on public.camp_trades for each row execute function camp_private.fail_receipt();`,
  );
  await assert.rejects(
    call(bob, "collect_skill", [fresh, bobAgent]),
    /simulated receipt failure/,
  );
  assert.equal(
    (
      await as(
        bob,
        "select * from public.camp_skills where source_skill_id=$1",
        [fresh],
      )
    ).rows.length,
    0,
  );
  await db.exec(
    "drop trigger test_fail on public.camp_trades; drop function camp_private.fail_receipt()",
  );
});
test("validation rejects blank resources, invalid tags, and positions outside the clearing", async () => {
  await assert.rejects(
    call(alice, "save_skill", [
      aliceAgent,
      null,
      { title: " ", description: "Test", body: "body", type: "doc" },
    ]),
    /check constraint/,
  );
  await assert.rejects(
    call(alice, "move_agent", [aliceAgent, 0, 300]),
    /check constraint/,
  );
  await assert.rejects(
    call(alice, "save_agent", [
      aliceAgent,
      {
        name: "Wayfinder",
        current_project: "Maps",
        tags: ["1", "2", "3", "4", "5", "6"],
      },
    ]),
    /check constraint/,
  );
});
test("reports are private and cannot hide resources without steward review", async () => {
  const fresh = await call(alice, "save_skill", [
    aliceAgent,
    null,
    {
      title: "Reportable",
      description: "Test",
      body: "A public resource",
      type: "doc",
      visibility: "public",
    },
  ]);
  await call(bob, "report_skill", [fresh, "Please review the attribution."]);
  assert.equal(
    (await as(bob, "select * from public.camp_reports")).rows.length,
    1,
  );
  assert.equal(
    (await as(alice, "select * from public.camp_reports")).rows.length,
    0,
  );
  assert.equal(
    (await as(null, "select * from public.camp_reports")).rows.length,
    0,
  );
  await assert.rejects(
    as(bob, "update public.camp_skills set hidden=true where id=$1", [fresh]),
    /permission denied/,
  );
});

test("field guides retain canonical attribution and cannot be duplicated", async () => {
  const first = await call(alice, "collect_guide", [
    "guide-review",
    aliceAgent,
  ]);
  const again = await call(alice, "collect_guide", [
    "guide-review",
    aliceAgent,
  ]);
  assert.equal(first, again);
  assert.equal(
    (
      await as(
        alice,
        "select author_name from public.camp_skills where id=$1",
        [first],
      )
    ).rows[0].author_name,
    "Campground field guides",
  );
  await assert.rejects(
    call(bob, "collect_guide", ["guide-review", aliceAgent]),
    /own active agents/,
  );
});
