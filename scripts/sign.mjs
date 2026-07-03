import env from "node:process";
import { createClient } from "@supabase/supabase-js";
const supa = createClient(env.env.SUPABASE_URL, env.env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await supa.storage.from("process-dossiers").createSignedUrl("bbde48cb-cce6-4b79-8132-954a325f89d3/e12d074f-34d6-456a-b984-759d6ac25571/dossier_v5.zip", 600);
if (error) throw error;
console.log(data.signedUrl);
