import env from "node:process";
import { createClient } from "@supabase/supabase-js";
import JSZip from "jszip";
import { jsPDF } from "jspdf";

const url = env.env.SUPABASE_URL;
const key = env.env.SUPABASE_SERVICE_ROLE_KEY;
const supa = createClient(url, key, { auth: { persistSession: false } });

const processId = "e12d074f-34d6-456a-b984-759d6ac25571";
const companyId = "bbde48cb-cce6-4b79-8132-954a325f89d3";

const { data: existing } = await supa.from("process_dossiers").select("version").eq("process_id", processId).order("version", { ascending: false }).limit(1).maybeSingle();
const nextVersion = (existing?.version || 0) + 1;

const { data: dossier } = await supa.from("process_dossiers").insert({ process_id: processId, company_id: companyId, status: "generating", version: nextVersion }).select().single();
console.log("DOSSIER_ID:", dossier.id, "v", nextVersion);

const { data: proc } = await supa.from("processes").select("*, customer:customers!processes_customer_id_fkey(*), vessel:vessels!processes_vessel_id_fkey(*)").eq("id", processId).single();
const { data: generatedDocs = [] } = await supa.from("generated_documents").select("*").eq("process_id", processId);
const { data: signatures = [] } = await supa.from("signature_requests").select("*").eq("process_id", processId);

const zip = new JSZip();
const manifest = { generated_at: new Date().toISOString(), process_id: processId, version: nextVersion, client: proc.customer?.name, vessel: proc.vessel?.name, contents: [] };

const cover = new jsPDF("p","mm","a4");
cover.setFontSize(18); cover.text("Dossiê do Processo Naval", 20, 25);
cover.setFontSize(11);
cover.text(`Processo: ${proc.process_type||processId}`, 20, 40);
cover.text(`Protocolo: ${proc.protocol_number||"—"}`, 20, 48);
cover.text(`Cliente: ${proc.customer?.name||"—"}`, 20, 56);
cover.text(`Embarcação: ${proc.vessel?.name||"—"}`, 20, 64);
cover.text(`Versão: v${nextVersion}`, 20, 72);
cover.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 20, 80);
cover.text(`Documentos: ${generatedDocs.length}`, 20, 92);
cover.text(`Assinaturas: ${signatures.length}`, 20, 100);
zip.file("00_capa.pdf", cover.output("arraybuffer"));
manifest.contents.push({ path: "00_capa.pdf", type: "cover" });

const add = async (bucket, path, zipPath, type) => {
  if (!path) return;
  const { data, error } = await supa.storage.from(bucket).download(path);
  if (error || !data) { console.warn("MISS", bucket, path, error?.message); return; }
  zip.file(zipPath, await data.arrayBuffer());
  manifest.contents.push({ path: zipPath, type, source: `${bucket}/${path}` });
};

let idx=1;
for (const d of generatedDocs) {
  const p = d.generated_file_url || d.file_url;
  if (!p) continue;
  const name = (d.name || d.document_type || `doc_${idx}`).replace(/[^\w.\-]+/g,"_");
  await add("generated-documents", p, `03_Documentos/${String(idx).padStart(2,"0")}_${name}.pdf`, "generated_document");
  idx++;
}
let sIdx=1;
for (const s of signatures) {
  if (s.final_signed_pdf_url) await add("signed-documents", s.final_signed_pdf_url, `05_Assinaturas/${String(sIdx).padStart(2,"0")}_assinado.pdf`, "signed_pdf");
  if (s.evidence_certificate_url) await add("signed-documents", s.evidence_certificate_url, `05_Assinaturas/${String(sIdx).padStart(2,"0")}_certificado.pdf`, "certificate");
  sIdx++;
}

zip.file("01_Cliente/info.json", JSON.stringify(proc.customer,null,2));
zip.file("02_Embarcacao/info.json", JSON.stringify(proc.vessel,null,2));
zip.file("manifest.json", JSON.stringify(manifest,null,2));

const zipBuf = await zip.generateAsync({ type: "nodebuffer" });
const zipPath = `${companyId}/${processId}/dossier_v${nextVersion}.zip`;
const { error: upErr } = await supa.storage.from("process-dossiers").upload(zipPath, zipBuf, { contentType: "application/zip", upsert: true });
if (upErr) throw upErr;

await supa.from("process_dossiers").update({
  status: "generated", file_url: zipPath,
  metadata: { generated_at: new Date().toISOString(), bucket: "process-dossiers", zip_path: zipPath, zip_size: zipBuf.length, document_count: generatedDocs.length, signature_count: signatures.length, manifest_entries: manifest.contents.length, client_name: proc.customer?.name, vessel_name: proc.vessel?.name }
}).eq("id", dossier.id);

console.log("OK zip_path=", zipPath, "size=", zipBuf.length, "entries=", manifest.contents.length);
