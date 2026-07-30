const url = "https://iottmceddzkdamkmypyl.supabase.co";
const key = "sb_publishable_fKz4JJDv0-jz5997V_55-g_PIX6BoD1";

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function main() {
  const couples = await fetch(`${url}/rest/v1/couples?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  }).then((r) => r.json());

  if (!couples[0]) {
    console.log("FAIL: no couple room");
    return;
  }
  const cid = couples[0].id;
  const stamp = Date.now();

  const r1 = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      couple_id: cid,
      slot: "a",
      nickname: `verify-${stamp}-1`,
      goal_kg: 5,
    }),
  });
  const t1 = await r1.text();
  console.log("insert1", r1.status);

  const r2 = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      couple_id: cid,
      slot: "a",
      nickname: `verify-${stamp}-2`,
      goal_kg: 5,
    }),
  });
  const t2 = await r2.text();
  console.log("insert2", r2.status);

  // cleanup
  await fetch(`${url}/rest/v1/profiles?nickname=like.verify-${stamp}*`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (r1.status === 201 && r2.status === 201) {
    console.log("OK: multi same-avatar works");
  } else {
    console.log("FAIL", t1, t2);
  }
}

main().catch(console.error);
