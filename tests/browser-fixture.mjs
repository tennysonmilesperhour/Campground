// Test-only Supabase protocol adapter over the real migration and Postgres RLS.
// Binds only to loopback; never included in the application build.
import { createServer } from "node:http";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { library } from "../src/lib/library.js";
const db = new PGlite();
await db.exec(
  `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key default gen_random_uuid(),raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`,
);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/20260907165533_shared_campground.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const accounts = [];
for (const [name, email] of [
  ["Alice", "alice@camp.test"],
  ["Bo", "bo@camp.test"],
]) {
  const id = (
    await db.query(
      "insert into auth.users(raw_user_meta_data) values ($1) returning id",
      [{ display_name: name }],
    )
  ).rows[0].id;
  const jwt = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url")}.local-test-only`;
  accounts.push({
    id,
    email,
    user_metadata: { display_name: name },
    aud: "authenticated",
    role: "authenticated",
    access_token: jwt,
  });
}
async function as(user, sql, params = []) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${user ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user?.id || "",
    ]);
    return tx.query(sql, params);
  });
}
async function rpc(user, name, args) {
  return (
    await as(
      user,
      `select public.camp_${name}(${args.map((_, i) => "$" + (i + 1)).join(",")}) as result`,
      args,
    )
  ).rows[0].result;
}
const travelers = [
  ["Wayfinder", "Accessible maps", ["maps", "accessibility"], 1],
  ["Ember", "Community tools", ["react", "community"], 0],
  ["Moss", "Field notes", ["documentation", "gardens"], 2],
];
for (let i = 0; i < travelers.length; i++) {
  const [name, current_project, tags, sprite_variant] = travelers[i],
    user = accounts[i % 2];
  const agent = await rpc(user, "save_agent", [
    null,
    {
      name,
      current_project,
      tags,
      sprite_variant,
      description: "Building slowly, sharing what helps along the way.",
    },
  ]);
  await rpc(user, "move_agent", [agent, 310 + i * 135, 360]);
  await rpc(user, "save_skill", [
    agent,
    null,
    { ...library[i], visibility: "public" },
  ]);
}
const allowedTables = new Set([
  "camp_agents",
  "camp_skills",
  "camp_trades",
  "camp_reports",
]);
const rpcArgs = {
  save_agent: ["p_agent", "p_data"],
  collect_guide: ["p_guide", "p_receiver"],
  move_agent: ["p_agent", "p_x", "p_y"],
  save_skill: ["p_agent", "p_skill", "p_data"],
  collect_skill: ["p_skill", "p_receiver"],
  archive_skill: ["p_skill"],
  report_skill: ["p_skill", "p_reason"],
};
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer,range,accept-profile,content-profile",
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url, "http://127.0.0.1:54325");
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : {};
    let user = accounts.find(
      (a) => req.headers.authorization === `Bearer ${a.access_token}`,
    );
    if (url.pathname === "/auth/v1/token") {
      user = accounts.find(
        (a) => a.email === payload.email || a.id === payload.refresh_token,
      );
      if (
        !user ||
        (!payload.refresh_token && payload.password !== "camp-test-password")
      )
        throw new Error("Invalid login credentials");
      res.end(
        JSON.stringify({
          access_token: user.access_token,
          token_type: "bearer",
          expires_in: 86400,
          refresh_token: user.id,
          user,
        }),
      );
      return;
    }
    if (url.pathname === "/auth/v1/user") {
      res.end(JSON.stringify(user || null));
      return;
    }
    if (url.pathname === "/auth/v1/logout") {
      res.end("{}");
      return;
    }
    if (url.pathname.startsWith("/rest/v1/rpc/camp_")) {
      const name = url.pathname.slice("/rest/v1/rpc/camp_".length);
      if (!rpcArgs[name]) throw new Error("Unknown function");
      const result = await rpc(
        user,
        name,
        rpcArgs[name].map((k) => payload[k]),
      );
      res.end(JSON.stringify(result));
      return;
    }
    const table = url.pathname.replace("/rest/v1/", "");
    if (!allowedTables.has(table)) throw new Error("Unknown endpoint");
    if (req.method !== "GET") throw new Error("Read only");
    const params = [],
      where = [];
    for (const [key, value] of url.searchParams) {
      if (
        ["archived", "user_id", "visibility", "agent_id", "id"].includes(key) &&
        value.startsWith("eq.")
      ) {
        params.push(value.slice(3));
        where.push(`${key}=$${params.length}`);
      }
    }
    const order =
      url.searchParams.get("order") === "created_at.asc" ? "asc" : "desc";
    const result = await as(
      user,
      `select * from public.${table} ${where.length ? "where " + where.join(" and ") : ""} order by created_at ${order} limit 500`,
      params,
    );
    res.end(JSON.stringify(result.rows));
  } catch (e) {
    console.log(req.method, req.url, e.message);
    res.writeHead(400);
    res.end(
      JSON.stringify({ message: e.message, error_description: e.message }),
    );
  }
}).listen(54325, "127.0.0.1", () =>
  console.log(
    "Local fixture ready. Test sign-in: alice@camp.test or bo@camp.test / camp-test-password",
  ),
);
