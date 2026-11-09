/**
 * Document Engine Supabase Service.
 * Persists immutable document versions, snapshots, checksums, and business branding templates.
 */

import { supabase } from '@/lib/supabase';
import type { DocumentVersion, DocumentTemplate } from '@/lib/database.types';

export interface RegisterDocumentVersionParams {
  businessId: string;
  documentType:
    'commercial_bill' | 'revised_bill' | 'khate_utara' | 'purchase_order' | 'poster';
  referenceId?: string | null;
  documentNumber: string;
  versionNumber: number;
  isRevised: boolean;
  checksum: string;
  renderingSnapshot: Record<string, unknown>;
  fileSizeBytes?: number;
  storagePath?: string | null;
}

export async function registerDocumentVersion(
  params: RegisterDocumentVersionParams,
): Promise<{ versionId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.rpc('register_document_version', {
      p_business_id: params.businessId,
      p_document_type: params.documentType,
      p_reference_id: params.referenceId ?? null,
      p_document_number: params.documentNumber,
      p_version_number: params.versionNumber,
      p_is_revised: params.isRevised,
      p_checksum: params.checksum,
      p_rendering_snapshot: params.renderingSnapshot,
      p_file_size_bytes: params.fileSizeBytes ?? 0,
      p_storage_path: params.storagePath ?? null,
    });

    if (error) {
      return { versionId: null, error: error.message };
    }

    return { versionId: data, error: null };
  } catch (err) {
    return {
      versionId: null,
      error: err instanceof Error ? err.message : 'Failed to register document version',
    };
  }
}

export async function fetchDocumentVersions(
  businessId: string,
  documentNumber: string,
): Promise<{ data: DocumentVersion[]; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('document_versions')
      .select('*')
      .eq('business_id', businessId)
      .eq('document_number', documentNumber)
      .order('version_number', { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Failed to fetch document versions',
    };
  }
}

export async function fetchDocumentTemplate(
  businessId: string,
  documentType: 'bill' | 'khate_utara' | 'purchase_order' | 'poster',
): Promise<{ data: DocumentTemplate | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('business_id', businessId)
      .eq('document_type', documentType)
      .eq('is_default', true)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to fetch document template',
    };
  }
}

export async function upsertDocumentTemplate(
  businessId: string,
  template: Partial<DocumentTemplate> & {
    document_type: 'bill' | 'khate_utara' | 'purchase_order' | 'poster';
    template_name: string;
  },
): Promise<{ data: DocumentTemplate | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .upsert(
        {
          business_id: businessId,
          document_type: template.document_type,
          template_name: template.template_name,
          firm_name: template.firm_name ?? null,
          firm_tagline: template.firm_tagline ?? null,
          address: template.address ?? null,
          phone: template.phone ?? null,
          email: template.email ?? null,
          gstin: template.gstin ?? null,
          upi_id: template.upi_id ?? null,
          bank_name: template.bank_name ?? null,
          bank_account_no: template.bank_account_no ?? null,
          bank_ifsc: template.bank_ifsc ?? null,
          logo_url: template.logo_url ?? null,
          footer_text: template.footer_text ?? null,
          disclaimer: template.disclaimer ?? null,
          default_language: template.default_language ?? 'mr',
          is_default: template.is_default ?? true,
        },
        { onConflict: 'business_id,document_type,template_name' },
      )
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data || null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Failed to save document template',
    };
  }
}
