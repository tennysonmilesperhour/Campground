import { supabase, table } from "./supabase";
export async function rpc(name, args) {
  if (!supabase) throw new Error("The camp connection is not configured yet.");
  const { data, error } = await supabase.rpc(`camp_${name}`, args);
  if (error) throw new Error(error.message);
  return data;
}
async function allRows(name) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await table(name)
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: name === "agents" })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500)
      return [...new Map(rows.map((row) => [row.id, row])).values()];
  }
}
export async function loadCamp() {
  if (!supabase)
    throw new Error(
      "The camp connection is not configured yet. You can still read the field guides below.",
    );
  try {
    const [agents, skills, trades] = await Promise.all([
      allRows("agents"),
      allRows("skills"),
      table("trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (trades.error) throw trades.error;
    return { agents, skills, trades: trades.data };
  } catch {
    throw new Error(
      "The camp connection is resting. Please try again in a moment. Your saved work is safe.",
    );
  }
}
