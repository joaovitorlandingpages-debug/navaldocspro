export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string
          id: string
          module: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          id?: string
          module: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          id?: string
          module?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          created_at: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          process_id: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          onboarding_status: string | null
          onboarding_step: number | null
          phone: string | null
          plan: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          onboarding_status?: string | null
          onboarding_step?: number | null
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          onboarding_status?: string | null
          onboarding_step?: number | null
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          cir_number: string | null
          company_id: string | null
          created_at: string
          expiry_date: string | null
          id: string
          name: string
          role: string | null
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          cir_number?: string | null
          company_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name: string
          role?: string | null
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          cir_number?: string | null
          company_id?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          name?: string
          role?: string | null
          updated_at?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crew_members_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_signatures: {
        Row: {
          company_id: string
          document_id: string | null
          id: string
          ip_address: string | null
          is_valid: boolean | null
          signature_data: string | null
          signature_type: string
          signed_at: string | null
          signer_name: string
          signer_role: string | null
          user_agent: string | null
          user_id: string | null
          verification_hash: string | null
        }
        Insert: {
          company_id: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          signature_data?: string | null
          signature_type: string
          signed_at?: string | null
          signer_name: string
          signer_role?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_hash?: string | null
        }
        Update: {
          company_id?: string
          document_id?: string | null
          id?: string
          ip_address?: string | null
          is_valid?: boolean | null
          signature_data?: string | null
          signature_type?: string
          signed_at?: string | null
          signer_name?: string
          signer_role?: string | null
          user_agent?: string | null
          user_id?: string | null
          verification_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "generated_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_audit_logs: {
        Row: {
          action: string
          company_id: string
          created_at: string | null
          details: Json | null
          document_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string | null
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_fields: {
        Row: {
          alignment: string | null
          created_at: string
          field_label: string
          field_name: string
          field_options: Json | null
          field_type: string
          font_size: number | null
          height: number | null
          id: string
          is_mandatory: boolean | null
          page_number: number | null
          position_x: number | null
          position_y: number | null
          required: boolean | null
          source_field: string | null
          source_type: string
          template_id: string | null
          width: number | null
        }
        Insert: {
          alignment?: string | null
          created_at?: string
          field_label: string
          field_name: string
          field_options?: Json | null
          field_type?: string
          font_size?: number | null
          height?: number | null
          id?: string
          is_mandatory?: boolean | null
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          required?: boolean | null
          source_field?: string | null
          source_type?: string
          template_id?: string | null
          width?: number | null
        }
        Update: {
          alignment?: string | null
          created_at?: string
          field_label?: string
          field_name?: string
          field_options?: Json | null
          field_type?: string
          font_size?: number | null
          height?: number | null
          id?: string
          is_mandatory?: boolean | null
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          required?: boolean | null
          source_field?: string | null
          source_type?: string
          template_id?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          category: string | null
          category_id: string | null
          company_id: string | null
          created_at: string
          description: string | null
          document_type_io: string | null
          fields_config: Json | null
          file_type: string | null
          id: string
          is_active: boolean | null
          name: string
          ocr_enabled: boolean | null
          process_type: string | null
          template_file_url: string | null
          updated_at: string
          version: number | null
          version_notes: string | null
        }
        Insert: {
          category?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_type_io?: string | null
          fields_config?: Json | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          ocr_enabled?: boolean | null
          process_type?: string | null
          template_file_url?: string | null
          updated_at?: string
          version?: number | null
          version_notes?: string | null
        }
        Update: {
          category?: string | null
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_type_io?: string | null
          fields_config?: Json | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          ocr_enabled?: boolean | null
          process_type?: string | null
          template_file_url?: string | null
          updated_at?: string
          version?: number | null
          version_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          document_type: string
          expiry_date: string | null
          extracted_data: Json | null
          file_url: string | null
          id: string
          issue_date: string | null
          process_id: string | null
          status: string
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          document_type: string
          expiry_date?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          process_id?: string | null
          status?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          document_type?: string
          expiry_date?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          process_id?: string | null
          status?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string | null
          expiry_date: string | null
          generated_by: string | null
          generated_file_url: string | null
          id: string
          issue_date: string | null
          metadata: Json | null
          name: string
          process_id: string | null
          qr_code_url: string | null
          signature_status: string | null
          signed_file_url: string | null
          status: string
          template_id: string | null
          updated_at: string
          verification_code: string | null
          vessel_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          expiry_date?: string | null
          generated_by?: string | null
          generated_file_url?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          name: string
          process_id?: string | null
          qr_code_url?: string | null
          signature_status?: string | null
          signed_file_url?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          verification_code?: string | null
          vessel_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          expiry_date?: string | null
          generated_by?: string | null
          generated_file_url?: string | null
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          name?: string
          process_id?: string | null
          qr_code_url?: string | null
          signature_status?: string | null
          signed_file_url?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          verification_code?: string | null
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_jobs: {
        Row: {
          company_id: string | null
          confidence_by_field: Json | null
          confidence_score: number | null
          created_at: string
          document_type: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          processing_time: number | null
          provider_used: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          uploaded_file_id: string | null
        }
        Insert: {
          company_id?: string | null
          confidence_by_field?: Json | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          processing_time?: number | null
          provider_used?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_file_id?: string | null
        }
        Update: {
          company_id?: string | null
          confidence_by_field?: Json | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          processing_time?: number | null
          provider_used?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          uploaded_file_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_jobs_uploaded_file_id_fkey"
            columns: ["uploaded_file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_usage: {
        Row: {
          company_id: string | null
          created_at: string | null
          estimated_cost: number | null
          failed_jobs: number | null
          id: string
          month: number
          successful_jobs: number | null
          total_jobs: number | null
          year: number
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          failed_jobs?: number | null
          id?: string
          month: number
          successful_jobs?: number | null
          total_jobs?: number | null
          year: number
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          estimated_cost?: number | null
          failed_jobs?: number | null
          id?: string
          month?: number
          successful_jobs?: number | null
          total_jobs?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "ocr_usage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_logs: {
        Row: {
          company_id: string | null
          created_at: string
          event_type: string | null
          id: string
          message: string | null
          payload: Json | null
          status: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          status?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string | null
          id?: string
          message?: string | null
          payload?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          company_id: string | null
          created_at: string
          id: string
          mercado_pago_payment_id: string | null
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          company_id?: string | null
          created_at?: string
          id?: string
          mercado_pago_payment_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string | null
          created_at?: string
          id?: string
          mercado_pago_payment_id?: string | null
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          billing_cycle: string
          created_at: string
          customer_limit: number | null
          description: string | null
          document_limit: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          mercado_pago_plan_id: string | null
          name: string
          ocr_limit: number | null
          price: number
          slug: string | null
          updated_at: string
          user_limit: number | null
        }
        Insert: {
          billing_cycle?: string
          created_at?: string
          customer_limit?: number | null
          description?: string | null
          document_limit?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          mercado_pago_plan_id?: string | null
          name: string
          ocr_limit?: number | null
          price: number
          slug?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Update: {
          billing_cycle?: string
          created_at?: string
          customer_limit?: number | null
          description?: string | null
          document_limit?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          mercado_pago_plan_id?: string | null
          name?: string
          ocr_limit?: number | null
          price?: number
          slug?: string | null
          updated_at?: string
          user_limit?: number | null
        }
        Relationships: []
      }
      process_automation_state: {
        Row: {
          checklist_status: Json | null
          data_completeness: Json | null
          id: string
          is_ready_for_generation: boolean | null
          last_analyzed_at: string | null
          next_suggested_steps: string[] | null
          pending_items: string[] | null
          process_id: string
          updated_at: string | null
        }
        Insert: {
          checklist_status?: Json | null
          data_completeness?: Json | null
          id?: string
          is_ready_for_generation?: boolean | null
          last_analyzed_at?: string | null
          next_suggested_steps?: string[] | null
          pending_items?: string[] | null
          process_id: string
          updated_at?: string | null
        }
        Update: {
          checklist_status?: Json | null
          data_completeness?: Json | null
          id?: string
          is_ready_for_generation?: boolean | null
          last_analyzed_at?: string | null
          next_suggested_steps?: string[] | null
          pending_items?: string[] | null
          process_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_automation_state_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_comments: {
        Row: {
          company_id: string | null
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          process_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_comments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      process_document_packages: {
        Row: {
          conditional_rule: Json | null
          created_at: string
          document_role: string | null
          id: string
          is_mandatory: boolean | null
          order_index: number | null
          process_type_id: string | null
          template_id: string | null
        }
        Insert: {
          conditional_rule?: Json | null
          created_at?: string
          document_role?: string | null
          id?: string
          is_mandatory?: boolean | null
          order_index?: number | null
          process_type_id?: string | null
          template_id?: string | null
        }
        Update: {
          conditional_rule?: Json | null
          created_at?: string
          document_role?: string | null
          id?: string
          is_mandatory?: boolean | null
          order_index?: number | null
          process_type_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_document_packages_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_document_packages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_type_requirements: {
        Row: {
          created_at: string | null
          id: string
          is_mandatory: boolean | null
          process_type: string
          template_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          process_type: string
          template_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_mandatory?: boolean | null
          process_type?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_type_requirements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_types: {
        Row: {
          automation_rules: Json | null
          category: string | null
          created_at: string
          description: string | null
          estimated_days: number | null
          icon: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          automation_rules?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          automation_rules?: Json | null
          category?: string | null
          created_at?: string
          description?: string | null
          estimated_days?: number | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      processes: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          draft_data: Json | null
          due_date: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_draft: boolean | null
          notes: string | null
          priority: string
          process_type: string
          process_type_id: string | null
          protocol_at: string | null
          protocol_number: string | null
          status: string
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          draft_data?: Json | null
          due_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_draft?: boolean | null
          notes?: string | null
          priority?: string
          process_type: string
          process_type_id?: string | null
          protocol_at?: string | null
          protocol_number?: string | null
          status?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          draft_data?: Json | null
          due_date?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_draft?: boolean | null
          notes?: string | null
          priority?: string
          process_type?: string
          process_type_id?: string | null
          protocol_at?: string | null
          protocol_number?: string | null
          status?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          company_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          mercado_pago_customer_id: string | null
          mercado_pago_subscription_id: string | null
          metadata: Json | null
          plan_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercado_pago_customer_id?: string | null
          mercado_pago_subscription_id?: string | null
          metadata?: Json | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          mercado_pago_customer_id?: string | null
          mercado_pago_subscription_id?: string | null
          metadata?: Json | null
          plan_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health: {
        Row: {
          created_at: string | null
          id: string
          last_check: string | null
          latency_ms: number | null
          module_name: string
          status: string
          updated_at: string | null
          uptime_percentage: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          module_name: string
          status?: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          module_name?: string
          status?: string
          updated_at?: string | null
          uptime_percentage?: number | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
          module: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          module: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          module?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string
          id: string
          priority: string
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          priority?: string
          status?: string
          title: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          priority?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          customer_id: string | null
          expiry_date: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          issue_date: string | null
          metadata: Json | null
          process_id: string | null
          status: string
          updated_at: string
          uploaded_by: string | null
          vessel_id: string | null
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          expiry_date?: string | null
          extracted_data?: Json | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          process_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          vessel_id?: string | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          expiry_date?: string | null
          extracted_data?: Json | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          issue_date?: string | null
          metadata?: Json | null
          process_id?: string | null
          status?: string
          updated_at?: string
          uploaded_by?: string | null
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessel_engines: {
        Row: {
          brand: string | null
          created_at: string
          engine_type: string | null
          id: string
          model: string | null
          power: string | null
          serial_number: string | null
          updated_at: string
          vessel_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          engine_type?: string | null
          id?: string
          model?: string | null
          power?: string | null
          serial_number?: string | null
          updated_at?: string
          vessel_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          engine_type?: string | null
          id?: string
          model?: string | null
          power?: string | null
          serial_number?: string | null
          updated_at?: string
          vessel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessel_engines_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      vessels: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          customer_id: string
          engine: string | null
          id: string
          name: string
          notes: string | null
          registration_number: string | null
          updated_at: string
          vessel_type: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          customer_id: string
          engine?: string | null
          id?: string
          name: string
          notes?: string | null
          registration_number?: string | null
          updated_at?: string
          vessel_type?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string
          engine?: string | null
          id?: string
          name?: string
          notes?: string | null
          registration_number?: string | null
          updated_at?: string
          vessel_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vessels_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vessels_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin_master: { Args: never; Returns: boolean }
      log_system_event: {
        Args: {
          p_company_id?: string
          p_event_type: string
          p_message: string
          p_metadata?: Json
          p_module: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
