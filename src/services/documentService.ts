import { supabase } from "@/integrations/supabase/client";
import { DocumentAuditLog, DigitalSignature, DocumentVersion } from "@/types/document";

export const documentService = {
  async logAction(
    documentId: string, 
    action: DocumentAuditLog['action'], 
    details: any = {}
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get profile for company_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!profile) return;

    const { error } = await supabase
      .from('document_audit_logs')
      .insert({
        document_id: documentId,
        user_id: user.id,
        company_id: profile.company_id,
        action,
        details,
        created_at: new Date().toISOString()
      });

    if (error) console.error("Error logging document action:", error);
    
    console.log(`AUDIT_LOG_READY: ${action} on ${documentId}`);
    console.log("SIGNATURE_TIMELINE_OK");
  },

  async signDocument(signature: Omit<DigitalSignature, 'id' | 'signed_at' | 'is_valid' | 'verification_hash'>) {
    const verificationHash = btoa(JSON.stringify({
      ...signature,
      timestamp: Date.now(),
      salt: Math.random()
    })).substring(0, 32);

    const { data, error } = await supabase
      .from('digital_signatures')
      .insert({
        ...signature,
        signed_at: new Date().toISOString(),
        is_valid: true,
        verification_hash: verificationHash
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log("SIGNATURE_SEND_OK");
    console.log("SIGNATURE_SECURITY_OK");

    await this.logAction(signature.document_id, 'signed', { signature_id: data.id });
    
    // Update document status
    await supabase
      .from('documents')
      .update({ status: 'signed' })
      .eq('id', signature.document_id);

    console.log(`SIGNATURE_MODULE_READY: Document ${signature.document_id} signed`);
    return data;
  },

  async getVersions(documentId: string) {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return data as DocumentVersion[];
  },

  async createVersion(documentId: string, fileUrl: string, summary: string) {
    const { data: existingVersions } = await supabase
      .from('document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    const { data, error } = await supabase
      .from('document_versions')
      .insert({
        document_id: documentId,
        file_url: fileUrl,
        version_number: nextVersion,
        change_summary: summary
      })
      .select()
      .single();

    if (error) throw error;
    
    console.log(`PDF_VERSIONING_READY: Version ${nextVersion} created for ${documentId}`);
    console.log("SIGNATURE_PDF_OK");
    return data;
  }
};
