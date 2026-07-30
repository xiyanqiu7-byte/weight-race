const url = "https://iottmceddzkdamkmypyl.supabase.co";
const key = "sb_publishable_fKz4JJDv0-jz5997V_55-g_PIX6BoD1";

fetch(`${url}/rest/v1/profiles?nickname=like.migrate-test*`, {
  method: "DELETE",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
}).then(async (r) => {
  console.log("cleanup", r.status, await r.text());
});
