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
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          module: string
          resource_id: string | null
          resource_type: string | null
          source_ip: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          resource_id?: string | null
          resource_type?: string | null
          source_ip?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          module?: string
          resource_id?: string | null
          resource_type?: string | null
          source_ip?: string | null
          user_agent?: string | null
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
      ai_copilot_interactions: {
        Row: {
          company_id: string
          context_data: Json | null
          created_at: string | null
          id: string
          process_id: string | null
          prompt: string
          rating: number | null
          response: string
          user_id: string
        }
        Insert: {
          company_id: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          process_id?: string | null
          prompt: string
          rating?: number | null
          response: string
          user_id: string
        }
        Update: {
          company_id?: string
          context_data?: Json | null
          created_at?: string | null
          id?: string
          process_id?: string | null
          prompt?: string
          rating?: number | null
          response?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_copilot_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_interactions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_copilot_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_jobs_queue: {
        Row: {
          attempts: number | null
          company_id: string
          created_at: string | null
          error: string | null
          id: string
          max_attempts: number | null
          payload: Json
          priority: number | null
          processed_at: string | null
          result: Json | null
          status: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          company_id: string
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          payload?: Json
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          status?: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          company_id?: string
          created_at?: string | null
          error?: string | null
          id?: string
          max_attempts?: number | null
          payload?: Json
          priority?: number | null
          processed_at?: string | null
          result?: Json | null
          status?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_queue_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_jobs_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_configs: {
        Row: {
          id: string
          is_active: boolean | null
          model_name: string
          module_key: string
          parameters: Json | null
          provider: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          model_name: string
          module_key: string
          parameters?: Json | null
          provider: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          model_name?: string
          module_key?: string
          parameters?: Json | null
          provider?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ai_usage_stats: {
        Row: {
          company_id: string
          estimated_cost: number | null
          id: string
          metadata: Json | null
          module: string
          recorded_at: string | null
          request_count: number | null
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          company_id: string
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          module: string
          recorded_at?: string | null
          request_count?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          company_id?: string
          estimated_cost?: number | null
          id?: string
          metadata?: Json | null
          module?: string
          recorded_at?: string | null
          request_count?: number | null
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_stats_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      anti_error_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string | null
          error_type: string
          id: string
          is_prevented: boolean | null
          metadata: Json | null
          process_id: string | null
          severity: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          error_type: string
          id?: string
          is_prevented?: boolean | null
          metadata?: Json | null
          process_id?: string | null
          severity?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          error_type?: string
          id?: string
          is_prevented?: boolean | null
          metadata?: Json | null
          process_id?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anti_error_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anti_error_logs_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          metadata: Json | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          metadata?: Json | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          description: string
          event_type: string
          id: string
          metadata: Json | null
          process_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          description: string
          event_type: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          description?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_logs_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_statistics: {
        Row: {
          company_id: string | null
          failed_executions: number | null
          id: string
          last_updated: string | null
          module_name: string
          successful_executions: number | null
          time_saved_seconds: number | null
          total_executions: number | null
        }
        Insert: {
          company_id?: string | null
          failed_executions?: number | null
          id?: string
          last_updated?: string | null
          module_name: string
          successful_executions?: number | null
          time_saved_seconds?: number | null
          total_executions?: number | null
        }
        Update: {
          company_id?: string | null
          failed_executions?: number | null
          id?: string
          last_updated?: string | null
          module_name?: string
          successful_executions?: number | null
          time_saved_seconds?: number | null
          total_executions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_statistics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          company_id: string
          created_at: string | null
          created_by: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          name: string
          size_bytes: number | null
          status: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          size_bytes?: number | null
          status?: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          size_bytes?: number | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_access: {
        Row: {
          access_token: string
          allowed_actions: Json
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          last_access_at: string | null
          process_id: string
          status: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          allowed_actions?: Json
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          last_access_at?: string | null
          process_id: string
          status?: string
          token_expires_at?: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          allowed_actions?: Json
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          last_access_at?: string | null
          process_id?: string
          status?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_access_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_access_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_activity_logs: {
        Row: {
          access_id: string | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          message: string | null
          metadata: Json
          process_id: string
          user_agent: string | null
        }
        Insert: {
          access_id?: string | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          message?: string | null
          metadata?: Json
          process_id: string
          user_agent?: string | null
        }
        Update: {
          access_id?: string | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          message?: string | null
          metadata?: Json
          process_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_activity_logs_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "client_portal_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_activity_logs_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_messages: {
        Row: {
          access_id: string | null
          company_id: string
          created_at: string
          id: string
          message: string
          process_id: string
          read_at: string | null
          sender: string
          sender_user_id: string | null
        }
        Insert: {
          access_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          message: string
          process_id: string
          read_at?: string | null
          sender: string
          sender_user_id?: string | null
        }
        Update: {
          access_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          message?: string
          process_id?: string
          read_at?: string | null
          sender?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_messages_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "client_portal_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_messages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_due_date: string | null
          billing_monthly_amount: number | null
          billing_notes: string | null
          billing_payment_method: string | null
          billing_status: string
          brand_primary_color: string | null
          brand_secondary_color: string | null
          cnpj: string | null
          contact_address: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_website: string | null
          contact_whatsapp: string | null
          created_at: string
          created_by: string | null
          document_template_map: Json
          email: string | null
          id: string
          is_active: boolean | null
          is_demo: boolean | null
          is_pilot: boolean | null
          last_access_at: string | null
          logo_primary_url: string | null
          logo_secondary_url: string | null
          logo_url: string | null
          name: string
          onboarding_status: string | null
          onboarding_step: number | null
          pdf_footer_text: string | null
          pdf_template: string
          phone: string | null
          pilot_feedback_score: number | null
          plan: string | null
          plan_id: string | null
          procurador_cpf: string | null
          procurador_crea: string | null
          procurador_email: string | null
          procurador_endereco: string | null
          procurador_nacionalidade: string | null
          procurador_nome: string | null
          procurador_orgao_expedidor: string | null
          procurador_rg: string | null
          procurador_telefone: string | null
          responsible_name: string | null
          signature_url: string | null
          stamp_url: string | null
          suspended_at: string | null
          suspended_reason: string | null
          technical_responsible_name: string | null
          technical_responsible_registry: string | null
          updated_at: string
          watermark_url: string | null
        }
        Insert: {
          billing_due_date?: string | null
          billing_monthly_amount?: number | null
          billing_notes?: string | null
          billing_payment_method?: string | null
          billing_status?: string
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          cnpj?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          document_template_map?: Json
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          is_pilot?: boolean | null
          last_access_at?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          logo_url?: string | null
          name: string
          onboarding_status?: string | null
          onboarding_step?: number | null
          pdf_footer_text?: string | null
          pdf_template?: string
          phone?: string | null
          pilot_feedback_score?: number | null
          plan?: string | null
          plan_id?: string | null
          procurador_cpf?: string | null
          procurador_crea?: string | null
          procurador_email?: string | null
          procurador_endereco?: string | null
          procurador_nacionalidade?: string | null
          procurador_nome?: string | null
          procurador_orgao_expedidor?: string | null
          procurador_rg?: string | null
          procurador_telefone?: string | null
          responsible_name?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          technical_responsible_name?: string | null
          technical_responsible_registry?: string | null
          updated_at?: string
          watermark_url?: string | null
        }
        Update: {
          billing_due_date?: string | null
          billing_monthly_amount?: number | null
          billing_notes?: string | null
          billing_payment_method?: string | null
          billing_status?: string
          brand_primary_color?: string | null
          brand_secondary_color?: string | null
          cnpj?: string | null
          contact_address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          contact_whatsapp?: string | null
          created_at?: string
          created_by?: string | null
          document_template_map?: Json
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_demo?: boolean | null
          is_pilot?: boolean | null
          last_access_at?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          logo_url?: string | null
          name?: string
          onboarding_status?: string | null
          onboarding_step?: number | null
          pdf_footer_text?: string | null
          pdf_template?: string
          phone?: string | null
          pilot_feedback_score?: number | null
          plan?: string | null
          plan_id?: string | null
          procurador_cpf?: string | null
          procurador_crea?: string | null
          procurador_email?: string | null
          procurador_endereco?: string | null
          procurador_nacionalidade?: string | null
          procurador_nome?: string | null
          procurador_orgao_expedidor?: string | null
          procurador_rg?: string | null
          procurador_telefone?: string | null
          responsible_name?: string | null
          signature_url?: string | null
          stamp_url?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          technical_responsible_name?: string | null
          technical_responsible_registry?: string | null
          updated_at?: string
          watermark_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      company_billing_history: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string
          payment_method: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          payment_method?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_billing_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pdf_templates: {
        Row: {
          base_template: string
          category: string
          company_id: string
          config: Json
          created_at: string
          created_by: string | null
          document_type: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_template?: string
          category?: string
          company_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_template?: string
          category?: string
          company_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pdf_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_resource_addons: {
        Row: {
          company_id: string
          created_at: string
          extra_daily: number
          extra_monthly: number
          id: string
          metadata: Json
          resource_key: string
          source: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          extra_daily?: number
          extra_monthly?: number
          id?: string
          metadata?: Json
          resource_key: string
          source?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          extra_daily?: number
          extra_monthly?: number
          id?: string
          metadata?: Json
          resource_key?: string
          source?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_resource_addons_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_resource_addons_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["key"]
          },
        ]
      }
      company_template_library: {
        Row: {
          acquired_at: string
          base_template: string
          company_id: string
          created_at: string
          document_type: string | null
          id: string
          is_default: boolean
          is_favorite: boolean
          source: string
          template_slug: string
          updated_at: string
        }
        Insert: {
          acquired_at?: string
          base_template: string
          company_id: string
          created_at?: string
          document_type?: string | null
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          source: string
          template_slug: string
          updated_at?: string
        }
        Update: {
          acquired_at?: string
          base_template?: string
          company_id?: string
          created_at?: string
          document_type?: string | null
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          source?: string
          template_slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_template_library_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string
          document_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          process_id: string | null
          severity: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description: string
          document_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
          severity?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string
          document_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          process_id?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_history_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
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
      customer_signatures: {
        Row: {
          authorized_at: string
          company_id: string
          created_at: string
          customer_id: string
          device_info: Json | null
          id: string
          ip_address: string | null
          revoked_at: string | null
          signature_hash: string | null
          signature_image_url: string
          signature_type: string
          source_participant_id: string | null
          user_agent: string | null
        }
        Insert: {
          authorized_at?: string
          company_id: string
          created_at?: string
          customer_id: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          signature_hash?: string | null
          signature_image_url: string
          signature_type?: string
          source_participant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          authorized_at?: string
          company_id?: string
          created_at?: string
          customer_id?: string
          device_info?: Json | null
          id?: string
          ip_address?: string | null
          revoked_at?: string | null
          signature_hash?: string | null
          signature_image_url?: string
          signature_type?: string
          source_participant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_signatures_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_signatures_source_participant_id_fkey"
            columns: ["source_participant_id"]
            isOneToOne: false
            referencedRelation: "signature_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          notes: string | null
          phone: string | null
          rg: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          state?: string | null
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
      demo_configurations: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_demo_mode: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_demo_mode?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_demo_mode?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demo_configurations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_company_id_fkey"
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
      document_checklists: {
        Row: {
          completed_at: string | null
          conditional_rule: Json | null
          created_at: string | null
          document_id: string | null
          document_role: string | null
          has_expiration: boolean | null
          id: string
          is_conditional: boolean | null
          is_mandatory: boolean | null
          item_name: string
          notes: string | null
          process_id: string | null
          requires_ocr: boolean | null
          requires_signature: boolean | null
          sort_order: number | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          conditional_rule?: Json | null
          created_at?: string | null
          document_id?: string | null
          document_role?: string | null
          has_expiration?: boolean | null
          id?: string
          is_conditional?: boolean | null
          is_mandatory?: boolean | null
          item_name: string
          notes?: string | null
          process_id?: string | null
          requires_ocr?: boolean | null
          requires_signature?: boolean | null
          sort_order?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          conditional_rule?: Json | null
          created_at?: string | null
          document_id?: string | null
          document_role?: string | null
          has_expiration?: boolean | null
          id?: string
          is_conditional?: boolean | null
          is_mandatory?: boolean | null
          item_name?: string
          notes?: string | null
          process_id?: string | null
          requires_ocr?: boolean | null
          requires_signature?: boolean | null
          sort_order?: number | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_checklists_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_checklists_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
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
      document_generation_logs: {
        Row: {
          company_id: string | null
          created_at: string
          document_name: string | null
          document_template_id: string | null
          event_type: string
          generated_document_id: string | null
          id: string
          message: string | null
          metadata: Json
          process_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          document_name?: string | null
          document_template_id?: string | null
          event_type: string
          generated_document_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          process_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          document_name?: string | null
          document_template_id?: string | null
          event_type?: string
          generated_document_id?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          process_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      document_library_imports: {
        Row: {
          company_id: string | null
          created_at: string | null
          created_by: string | null
          error_log: Json | null
          id: string
          import_type: string
          raw_payload: Json | null
          status: string | null
          success_count: number | null
          total_items: number | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          id?: string
          import_type: string
          raw_payload?: Json | null
          status?: string | null
          success_count?: number | null
          total_items?: number | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_log?: Json | null
          id?: string
          import_type?: string
          raw_payload?: Json | null
          status?: string | null
          success_count?: number | null
          total_items?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_library_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_process_package_items: {
        Row: {
          conditional_rule: Json | null
          created_at: string | null
          document_role: string
          document_template_id: string | null
          has_expiration: boolean | null
          id: string
          is_required: boolean | null
          item_label: string | null
          package_id: string | null
          requires_ocr: boolean | null
          requires_signature: boolean | null
          responsible_role: string | null
          sort_order: number | null
          validation_rules: Json | null
        }
        Insert: {
          conditional_rule?: Json | null
          created_at?: string | null
          document_role: string
          document_template_id?: string | null
          has_expiration?: boolean | null
          id?: string
          is_required?: boolean | null
          item_label?: string | null
          package_id?: string | null
          requires_ocr?: boolean | null
          requires_signature?: boolean | null
          responsible_role?: string | null
          sort_order?: number | null
          validation_rules?: Json | null
        }
        Update: {
          conditional_rule?: Json | null
          created_at?: string | null
          document_role?: string
          document_template_id?: string | null
          has_expiration?: boolean | null
          id?: string
          is_required?: boolean | null
          item_label?: string | null
          package_id?: string | null
          requires_ocr?: boolean | null
          requires_signature?: boolean | null
          responsible_role?: string | null
          sort_order?: number | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_process_package_items_document_template_id_fkey"
            columns: ["document_template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_process_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "document_process_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      document_process_packages: {
        Row: {
          category: string | null
          created_at: string | null
          default_deadline_days: number | null
          default_priority: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          process_type: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_deadline_days?: number | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          process_type: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_deadline_days?: number | null
          default_priority?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          process_type?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_process_rules: {
        Row: {
          created_at: string | null
          expiry_monitoring: boolean | null
          id: string
          ocr_required: boolean | null
          process_type_id: string | null
          rule_type: string
          signature_required: boolean | null
          template_id: string | null
          trigger_condition: Json | null
        }
        Insert: {
          created_at?: string | null
          expiry_monitoring?: boolean | null
          id?: string
          ocr_required?: boolean | null
          process_type_id?: string | null
          rule_type: string
          signature_required?: boolean | null
          template_id?: string | null
          trigger_condition?: Json | null
        }
        Update: {
          created_at?: string | null
          expiry_monitoring?: boolean | null
          id?: string
          ocr_required?: boolean | null
          process_type_id?: string | null
          rule_type?: string
          signature_required?: boolean | null
          template_id?: string | null
          trigger_condition?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_process_rules_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_process_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_fields: {
        Row: {
          created_at: string | null
          field_key: string
          field_label: string
          field_type: string
          id: string
          is_required: boolean | null
          mapping_path: string | null
          options: Json | null
          position_config: Json | null
          template_id: string | null
          validation_rules: Json | null
        }
        Insert: {
          created_at?: string | null
          field_key: string
          field_label: string
          field_type: string
          id?: string
          is_required?: boolean | null
          mapping_path?: string | null
          options?: Json | null
          position_config?: Json | null
          template_id?: string | null
          validation_rules?: Json | null
        }
        Update: {
          created_at?: string | null
          field_key?: string
          field_label?: string
          field_type?: string
          id?: string
          is_required?: boolean | null
          mapping_path?: string | null
          options?: Json | null
          position_config?: Json | null
          template_id?: string | null
          validation_rules?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_template_rules: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          is_active: boolean
          rule_expression: Json
          rule_key: string
          rule_type: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          rule_expression?: Json
          rule_key: string
          rule_type: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          is_active?: boolean
          rule_expression?: Json
          rule_key?: string
          rule_type?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_template_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          base_content: string | null
          category: string | null
          category_id: string | null
          code: string | null
          company_id: string | null
          created_at: string
          description: string | null
          document_structure: Json | null
          document_type_io: string | null
          fields_config: Json | null
          file_type: string | null
          id: string
          is_active: boolean | null
          is_global: boolean
          metadata: Json | null
          name: string
          ocr_enabled: boolean | null
          process_type: string | null
          region_tag: string | null
          regional_scope: string | null
          source_origin: string | null
          template_file_url: string | null
          updated_at: string
          validation_status: string | null
          version: number | null
          version_notes: string | null
          version_number: number | null
        }
        Insert: {
          base_content?: string | null
          category?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_structure?: Json | null
          document_type_io?: string | null
          fields_config?: Json | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          metadata?: Json | null
          name: string
          ocr_enabled?: boolean | null
          process_type?: string | null
          region_tag?: string | null
          regional_scope?: string | null
          source_origin?: string | null
          template_file_url?: string | null
          updated_at?: string
          validation_status?: string | null
          version?: number | null
          version_notes?: string | null
          version_number?: number | null
        }
        Update: {
          base_content?: string | null
          category?: string | null
          category_id?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          document_structure?: Json | null
          document_type_io?: string | null
          fields_config?: Json | null
          file_type?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          metadata?: Json | null
          name?: string
          ocr_enabled?: boolean | null
          process_type?: string | null
          region_tag?: string | null
          regional_scope?: string | null
          source_origin?: string | null
          template_file_url?: string | null
          updated_at?: string
          validation_status?: string | null
          version?: number | null
          version_notes?: string | null
          version_number?: number | null
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
      document_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          document_id: string | null
          file_url: string
          id: string
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_url: string
          id?: string
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          document_id?: string | null
          file_url?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          batch_id: string | null
          batch_status: string | null
          company_id: string
          compliance_status: string | null
          created_at: string
          customer_id: string | null
          deleted_at: string | null
          document_type: string
          expiry_date: string | null
          extracted_data: Json | null
          file_url: string | null
          id: string
          is_favorite: boolean | null
          issue_date: string | null
          last_accessed_at: string | null
          ocr_confidence_alerts: Json | null
          process_id: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
          validation_errors: Json | null
          version_history: Json | null
          vessel_id: string | null
        }
        Insert: {
          batch_id?: string | null
          batch_status?: string | null
          company_id: string
          compliance_status?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          document_type: string
          expiry_date?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          is_favorite?: boolean | null
          issue_date?: string | null
          last_accessed_at?: string | null
          ocr_confidence_alerts?: Json | null
          process_id?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          validation_errors?: Json | null
          version_history?: Json | null
          vessel_id?: string | null
        }
        Update: {
          batch_id?: string | null
          batch_status?: string | null
          company_id?: string
          compliance_status?: string | null
          created_at?: string
          customer_id?: string | null
          deleted_at?: string | null
          document_type?: string
          expiry_date?: string | null
          extracted_data?: Json | null
          file_url?: string | null
          id?: string
          is_favorite?: boolean | null
          issue_date?: string | null
          last_accessed_at?: string | null
          ocr_confidence_alerts?: Json | null
          process_id?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          validation_errors?: Json | null
          version_history?: Json | null
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
      edge_rate_limits: {
        Row: {
          bucket: string
          hits: number
          id: string
          subject: string
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          hits?: number
          id?: string
          subject: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          bucket?: string
          hits?: number
          id?: string
          subject?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      enterprise_audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      executive_metrics: {
        Row: {
          category: string | null
          created_at: string
          id: string
          metadata: Json | null
          metric_date: string | null
          metric_name: string
          metric_value: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date?: string | null
          metric_name: string
          metric_value: number
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_date?: string | null
          metric_name?: string
          metric_value?: number
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          rules: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name: string
          rules?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          rules?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      frontend_errors: {
        Row: {
          company_id: string | null
          component_stack: string | null
          created_at: string | null
          error_message: string
          error_stack: string | null
          fixed_in_version: string | null
          id: string
          metadata: Json | null
          resolved_at: string | null
          resolved_by: string | null
          route: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message: string
          error_stack?: string | null
          fixed_in_version?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          component_stack?: string | null
          created_at?: string | null
          error_message?: string
          error_stack?: string | null
          fixed_in_version?: string | null
          id?: string
          metadata?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          route?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "frontend_errors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frontend_errors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      generated_documents_instances: {
        Row: {
          company_id: string | null
          content_html: string | null
          created_at: string | null
          document_name: string
          file_url: string | null
          id: string
          last_edited_by: string | null
          mapped_data: Json | null
          process_id: string | null
          status: string | null
          template_id: string | null
          updated_at: string | null
          version_number: number | null
        }
        Insert: {
          company_id?: string | null
          content_html?: string | null
          created_at?: string | null
          document_name: string
          file_url?: string | null
          id?: string
          last_edited_by?: string | null
          mapped_data?: Json | null
          process_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Update: {
          company_id?: string | null
          content_html?: string | null
          created_at?: string | null
          document_name?: string
          file_url?: string | null
          id?: string
          last_edited_by?: string | null
          mapped_data?: Json | null
          process_id?: string | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          version_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_instances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_instances_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      global_audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          previous_value: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          previous_value?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          name: string
          notes: string | null
          phone: string | null
          source: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maritime_compliance_rules: {
        Row: {
          action_params: Json | null
          condition_logic: Json
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          required_action: string
          rule_description: string | null
          rule_name: string
        }
        Insert: {
          action_params?: Json | null
          condition_logic: Json
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          required_action: string
          rule_description?: string | null
          rule_name: string
        }
        Update: {
          action_params?: Json | null
          condition_logic?: Json
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          required_action?: string
          rule_description?: string | null
          rule_name?: string
        }
        Relationships: []
      }
      marketplace_collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price_cents: number
          published: boolean
          slug: string
          template_slugs: string[]
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_cents?: number
          published?: boolean
          slug: string
          template_slugs?: string[]
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_cents?: number
          published?: boolean
          slug?: string
          template_slugs?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          id: string
          item_kind: string
          item_slug: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_cents?: number
          company_id: string
          created_at?: string
          id?: string
          item_kind: string
          item_slug: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          id?: string
          item_kind?: string
          item_slug?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_templates: {
        Row: {
          author: string
          base_template: string
          category: string
          cover_url: string | null
          created_at: string
          description: string | null
          downloads_count: number
          gallery_urls: string[]
          id: string
          is_bestseller: boolean
          is_exclusive: boolean
          is_featured: boolean
          is_new: boolean
          is_promo: boolean
          name: string
          price_cents: number
          published: boolean
          rating: number
          slug: string
          updated_at: string
          version: string
        }
        Insert: {
          author?: string
          base_template: string
          category: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number
          gallery_urls?: string[]
          id?: string
          is_bestseller?: boolean
          is_exclusive?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_promo?: boolean
          name: string
          price_cents?: number
          published?: boolean
          rating?: number
          slug: string
          updated_at?: string
          version?: string
        }
        Update: {
          author?: string
          base_template?: string
          category?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          downloads_count?: number
          gallery_urls?: string[]
          id?: string
          is_bestseller?: boolean
          is_exclusive?: boolean
          is_featured?: boolean
          is_new?: boolean
          is_promo?: boolean
          name?: string
          price_cents?: number
          published?: boolean
          rating?: number
          slug?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      master_audit_logs: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          created_at: string
          event_type: string
          id: string
          message: string | null
          metadata: Json
          target_company_id: string | null
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json
          target_company_id?: string | null
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json
          target_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_audit_logs_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          priority: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          priority?: string
          title: string
          type?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          priority?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_evolution_logs: {
        Row: {
          company_id: string | null
          confidence_score: number | null
          correction_details: Json | null
          created_at: string | null
          document_type: string | null
          error_message: string | null
          id: string
          job_id: string | null
          was_manually_corrected: boolean | null
        }
        Insert: {
          company_id?: string | null
          confidence_score?: number | null
          correction_details?: Json | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          was_manually_corrected?: boolean | null
        }
        Update: {
          company_id?: string | null
          confidence_score?: number | null
          correction_details?: Json | null
          created_at?: string | null
          document_type?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          was_manually_corrected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_evolution_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_jobs: {
        Row: {
          applied_at: string | null
          batch_id: string | null
          company_id: string | null
          comparison_data: Json | null
          confidence_by_field: Json | null
          confidence_score: number | null
          created_at: string
          document_type: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          identified_document_type: string | null
          is_applied: boolean | null
          processing_progress: number | null
          processing_time: number | null
          provider_used: string | null
          reviewed_by: string | null
          status: string
          suggested_actions: Json | null
          total_pages: number | null
          updated_at: string
          uploaded_file_id: string | null
        }
        Insert: {
          applied_at?: string | null
          batch_id?: string | null
          company_id?: string | null
          comparison_data?: Json | null
          confidence_by_field?: Json | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          identified_document_type?: string | null
          is_applied?: boolean | null
          processing_progress?: number | null
          processing_time?: number | null
          provider_used?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_actions?: Json | null
          total_pages?: number | null
          updated_at?: string
          uploaded_file_id?: string | null
        }
        Update: {
          applied_at?: string | null
          batch_id?: string | null
          company_id?: string | null
          comparison_data?: Json | null
          confidence_by_field?: Json | null
          confidence_score?: number | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          identified_document_type?: string | null
          is_applied?: boolean | null
          processing_progress?: number | null
          processing_time?: number | null
          provider_used?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_actions?: Json | null
          total_pages?: number | null
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
      ocr_timeline_events: {
        Row: {
          created_at: string | null
          event_message: string | null
          event_type: string
          id: string
          job_id: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          event_message?: string | null
          event_type: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          event_message?: string | null
          event_type?: string
          id?: string
          job_id?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_timeline_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ocr_jobs"
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
      operational_alerts: {
        Row: {
          alert_type: string
          company_id: string | null
          created_at: string | null
          description: string
          document_id: string | null
          field_ref: string | null
          id: string
          process_id: string | null
          resolved_at: string | null
          severity: string | null
        }
        Insert: {
          alert_type: string
          company_id?: string | null
          created_at?: string | null
          description: string
          document_id?: string | null
          field_ref?: string | null
          id?: string
          process_id?: string | null
          resolved_at?: string | null
          severity?: string | null
        }
        Update: {
          alert_type?: string
          company_id?: string | null
          created_at?: string | null
          description?: string
          document_id?: string | null
          field_ref?: string | null
          id?: string
          process_id?: string | null
          resolved_at?: string | null
          severity?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_alerts_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_feedback: {
        Row: {
          context_url: string | null
          created_at: string | null
          description: string
          id: string
          severity: string | null
          status: string | null
          subject: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          context_url?: string | null
          created_at?: string | null
          description: string
          id?: string
          severity?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          context_url?: string | null
          created_at?: string | null
          description?: string
          id?: string
          severity?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      operational_insights: {
        Row: {
          action_label: string | null
          action_url: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_resolved: boolean | null
          process_id: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          process_id?: string | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_resolved?: boolean | null
          process_id?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operational_insights_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_tasks: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          priority: string | null
          process_id: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          process_id?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          process_id?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operational_tasks_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      operational_tests: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          engineer_id: string | null
          errors_encountered: string[] | null
          findings: string[] | null
          id: string
          metadata: Json | null
          status: string | null
          test_name: string
          updated_at: string | null
          ux_bottlenecks: string[] | null
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          engineer_id?: string | null
          errors_encountered?: string[] | null
          findings?: string[] | null
          id?: string
          metadata?: Json | null
          status?: string | null
          test_name: string
          updated_at?: string | null
          ux_bottlenecks?: string[] | null
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          engineer_id?: string | null
          errors_encountered?: string[] | null
          findings?: string[] | null
          id?: string
          metadata?: Json | null
          status?: string | null
          test_name?: string
          updated_at?: string | null
          ux_bottlenecks?: string[] | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          address: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          phone: string | null
          type: Database["public"]["Enums"]["partner_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          phone?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          type?: Database["public"]["Enums"]["partner_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_shares: {
        Row: {
          created_at: string
          document_id: string | null
          expires_at: string | null
          id: string
          partner_id: string
          permissions: string[] | null
          process_id: string | null
          shared_by: string | null
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          expires_at?: string | null
          id?: string
          partner_id: string
          permissions?: string[] | null
          process_id?: string | null
          shared_by?: string | null
        }
        Update: {
          created_at?: string
          document_id?: string | null
          expires_at?: string | null
          id?: string
          partner_id?: string
          permissions?: string[] | null
          process_id?: string | null
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_shares_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_shares_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
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
      plan_resource_limits: {
        Row: {
          created_at: string
          daily_limit: number | null
          monthly_limit: number | null
          plan_id: string
          resource_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_limit?: number | null
          monthly_limit?: number | null
          plan_id: string
          resource_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_limit?: number | null
          monthly_limit?: number | null
          plan_id?: string
          resource_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_resource_limits_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_resource_limits_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["key"]
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
          process_limit: number | null
          slug: string | null
          storage_limit_gb: number | null
          updated_at: string
          user_limit: number | null
          version: number | null
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
          process_limit?: number | null
          slug?: string | null
          storage_limit_gb?: number | null
          updated_at?: string
          user_limit?: number | null
          version?: number | null
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
          process_limit?: number | null
          slug?: string | null
          storage_limit_gb?: number | null
          updated_at?: string
          user_limit?: number | null
          version?: number | null
        }
        Relationships: []
      }
      process_assignees: {
        Row: {
          created_at: string | null
          id: string
          process_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          process_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          process_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_assignees_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
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
      process_document_uploads: {
        Row: {
          company_id: string
          confidence_score: number | null
          created_at: string
          detected_document_type: string | null
          extracted_fields: Json
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          ocr_status: string
          ocr_text: string | null
          process_document_id: string
          process_id: string
          updated_at: string
          uploaded_by: string | null
          validation_errors: Json
          validation_status: string
        }
        Insert: {
          company_id: string
          confidence_score?: number | null
          created_at?: string
          detected_document_type?: string | null
          extracted_fields?: Json
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          process_document_id: string
          process_id: string
          updated_at?: string
          uploaded_by?: string | null
          validation_errors?: Json
          validation_status?: string
        }
        Update: {
          company_id?: string
          confidence_score?: number | null
          created_at?: string
          detected_document_type?: string | null
          extracted_fields?: Json
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          ocr_status?: string
          ocr_text?: string | null
          process_document_id?: string
          process_id?: string
          updated_at?: string
          uploaded_by?: string | null
          validation_errors?: Json
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_document_uploads_process_document_id_fkey"
            columns: ["process_document_id"]
            isOneToOne: false
            referencedRelation: "process_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_document_uploads_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_documents: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          final_pdf_url: string | null
          id: string
          is_required: boolean
          metadata: Json
          process_id: string
          selected_by: string | null
          source: string
          status: string
          template_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          final_pdf_url?: string | null
          id?: string
          is_required?: boolean
          metadata?: Json
          process_id: string
          selected_by?: string | null
          source?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          final_pdf_url?: string | null
          id?: string
          is_required?: boolean
          metadata?: Json
          process_id?: string
          selected_by?: string | null
          source?: string
          status?: string
          template_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      process_dossiers: {
        Row: {
          attachments_snapshot: Json | null
          audit_snapshot: Json | null
          checklist_snapshot: Json | null
          company_id: string
          created_at: string | null
          delivered_at: string | null
          documents_snapshot: Json | null
          dossier_number: string | null
          file_url: string | null
          final_pdf_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          metadata: Json | null
          process_id: string
          status: string
          updated_at: string | null
          verification_code: string | null
          version: number
          zip_url: string | null
        }
        Insert: {
          attachments_snapshot?: Json | null
          audit_snapshot?: Json | null
          checklist_snapshot?: Json | null
          company_id: string
          created_at?: string | null
          delivered_at?: string | null
          documents_snapshot?: Json | null
          dossier_number?: string | null
          file_url?: string | null
          final_pdf_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          process_id: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          version?: number
          zip_url?: string | null
        }
        Update: {
          attachments_snapshot?: Json | null
          audit_snapshot?: Json | null
          checklist_snapshot?: Json | null
          company_id?: string
          created_at?: string | null
          delivered_at?: string | null
          documents_snapshot?: Json | null
          dossier_number?: string | null
          file_url?: string | null
          final_pdf_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string
          status?: string
          updated_at?: string | null
          verification_code?: string | null
          version?: number
          zip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_dossiers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_dossiers_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_insights: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          is_resolved: boolean | null
          message: string
          metadata: Json | null
          process_id: string | null
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message: string
          metadata?: Json | null
          process_id?: string | null
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          metadata?: Json | null
          process_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_insights_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_insights_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      process_sla_history: {
        Row: {
          created_at: string | null
          duration_minutes: number | null
          entered_at: string | null
          exited_at: string | null
          id: string
          is_breached: boolean | null
          process_id: string | null
          stage: string
        }
        Insert: {
          created_at?: string | null
          duration_minutes?: number | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          is_breached?: boolean | null
          process_id?: string | null
          stage: string
        }
        Update: {
          created_at?: string | null
          duration_minutes?: number | null
          entered_at?: string | null
          exited_at?: string | null
          id?: string
          is_breached?: boolean | null
          process_id?: string | null
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_sla_history_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
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
          archived_at: string | null
          automation_level: number | null
          automation_metadata: Json | null
          automation_status: string | null
          branding_logo_url: string | null
          branding_mode: string | null
          buyer_id: string | null
          company_id: string
          completed_at: string | null
          completion_percentage: number | null
          compliance_score: number | null
          compliance_status: string | null
          created_at: string
          customer_id: string
          deleted_at: string | null
          draft_data: Json | null
          due_date: string | null
          efficiency_score: number | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_blocked: boolean | null
          is_draft: boolean | null
          is_favorite: boolean | null
          kanban_stage: string | null
          last_accessed_at: string | null
          last_automation_run: string | null
          missing_signatures_count: number | null
          new_owner_cpf_cnpj: string | null
          new_owner_name: string | null
          notes: string | null
          pending_documents_count: number | null
          priority: string
          priority_score: number | null
          process_type: string
          process_type_id: string | null
          protocol_at: string | null
          protocol_number: string | null
          responsible_id: string | null
          secondary_customer_id: string | null
          seller_id: string | null
          share_token: string | null
          sla_deadline: string | null
          sla_limit_at: string | null
          sla_status: string | null
          stalled_since: string | null
          started_at: string | null
          status: string
          tags: string[] | null
          target_completion_at: string | null
          technical_manager_id: string | null
          title: string | null
          trashed_at: string | null
          updated_at: string
          validation_errors: Json | null
          vessel_id: string | null
        }
        Insert: {
          archived_at?: string | null
          automation_level?: number | null
          automation_metadata?: Json | null
          automation_status?: string | null
          branding_logo_url?: string | null
          branding_mode?: string | null
          buyer_id?: string | null
          company_id: string
          completed_at?: string | null
          completion_percentage?: number | null
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          draft_data?: Json | null
          due_date?: string | null
          efficiency_score?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_blocked?: boolean | null
          is_draft?: boolean | null
          is_favorite?: boolean | null
          kanban_stage?: string | null
          last_accessed_at?: string | null
          last_automation_run?: string | null
          missing_signatures_count?: number | null
          new_owner_cpf_cnpj?: string | null
          new_owner_name?: string | null
          notes?: string | null
          pending_documents_count?: number | null
          priority?: string
          priority_score?: number | null
          process_type: string
          process_type_id?: string | null
          protocol_at?: string | null
          protocol_number?: string | null
          responsible_id?: string | null
          secondary_customer_id?: string | null
          seller_id?: string | null
          share_token?: string | null
          sla_deadline?: string | null
          sla_limit_at?: string | null
          sla_status?: string | null
          stalled_since?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          target_completion_at?: string | null
          technical_manager_id?: string | null
          title?: string | null
          trashed_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
          vessel_id?: string | null
        }
        Update: {
          archived_at?: string | null
          automation_level?: number | null
          automation_metadata?: Json | null
          automation_status?: string | null
          branding_logo_url?: string | null
          branding_mode?: string | null
          buyer_id?: string | null
          company_id?: string
          completed_at?: string | null
          completion_percentage?: number | null
          compliance_score?: number | null
          compliance_status?: string | null
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          draft_data?: Json | null
          due_date?: string | null
          efficiency_score?: number | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_blocked?: boolean | null
          is_draft?: boolean | null
          is_favorite?: boolean | null
          kanban_stage?: string | null
          last_accessed_at?: string | null
          last_automation_run?: string | null
          missing_signatures_count?: number | null
          new_owner_cpf_cnpj?: string | null
          new_owner_name?: string | null
          notes?: string | null
          pending_documents_count?: number | null
          priority?: string
          priority_score?: number | null
          process_type?: string
          process_type_id?: string | null
          protocol_at?: string | null
          protocol_number?: string | null
          responsible_id?: string | null
          secondary_customer_id?: string | null
          seller_id?: string | null
          share_token?: string | null
          sla_deadline?: string | null
          sla_limit_at?: string | null
          sla_status?: string | null
          stalled_since?: string | null
          started_at?: string | null
          status?: string
          tags?: string[] | null
          target_completion_at?: string | null
          technical_manager_id?: string | null
          title?: string | null
          trashed_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
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
            foreignKeyName: "processes_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_secondary_customer_id_fkey"
            columns: ["secondary_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processes_technical_manager_id_fkey"
            columns: ["technical_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      production_readiness_checks: {
        Row: {
          category: string
          check_name: string
          details: Json | null
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          category: string
          check_name: string
          details?: Json | null
          id?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          check_name?: string
          details?: Json | null
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          department_id: string | null
          email: string | null
          id: string
          is_demo_user: boolean | null
          is_pilot: boolean | null
          name: string | null
          onboarding_checklist: Json | null
          partner_id: string | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id: string
          is_demo_user?: boolean | null
          is_pilot?: boolean | null
          name?: string | null
          onboarding_checklist?: Json | null
          partner_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department_id?: string | null
          email?: string | null
          id?: string
          is_demo_user?: boolean | null
          is_pilot?: boolean | null
          name?: string | null
          onboarding_checklist?: Json | null
          partner_id?: string | null
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
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_items: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          started_at: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          started_at?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          started_at?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_consumption: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: number
          metadata: Json
          period_day: string
          period_month: string
          request_id: string | null
          resource_key: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          id?: number
          metadata?: Json
          period_day?: string
          period_month?: string
          request_id?: string | null
          resource_key: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: number
          metadata?: Json
          period_day?: string
          period_month?: string
          request_id?: string | null
          resource_key?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_consumption_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_consumption_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "resource_types"
            referencedColumns: ["key"]
          },
        ]
      }
      resource_types: {
        Row: {
          created_at: string
          default_daily: number | null
          default_monthly: number | null
          is_storage: boolean
          key: string
          label: string
          unit: string
        }
        Insert: {
          created_at?: string
          default_daily?: number | null
          default_monthly?: number | null
          is_storage?: boolean
          key: string
          label: string
          unit?: string
        }
        Update: {
          created_at?: string
          default_daily?: number | null
          default_monthly?: number | null
          is_storage?: boolean
          key?: string
          label?: string
          unit?: string
        }
        Relationships: []
      }
      saas_commercial_metrics: {
        Row: {
          active_subscriptions: number | null
          avg_revenue_per_user: number | null
          churn_rate: number | null
          created_at: string | null
          id: string
          metric_date: string | null
          total_mrr: number | null
          trial_subscriptions: number | null
        }
        Insert: {
          active_subscriptions?: number | null
          avg_revenue_per_user?: number | null
          churn_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          total_mrr?: number | null
          trial_subscriptions?: number | null
        }
        Update: {
          active_subscriptions?: number | null
          avg_revenue_per_user?: number | null
          churn_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string | null
          total_mrr?: number | null
          trial_subscriptions?: number | null
        }
        Relationships: []
      }
      saas_global_metrics: {
        Row: {
          active_users_daily: number | null
          active_users_monthly: number | null
          churn_rate: number | null
          created_at: string | null
          id: string
          metric_date: string
          ocr_total_usage: number | null
          storage_total_bytes: number | null
          total_companies: number | null
          total_mrr: number | null
        }
        Insert: {
          active_users_daily?: number | null
          active_users_monthly?: number | null
          churn_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          ocr_total_usage?: number | null
          storage_total_bytes?: number | null
          total_companies?: number | null
          total_mrr?: number | null
        }
        Update: {
          active_users_daily?: number | null
          active_users_monthly?: number | null
          churn_rate?: number | null
          created_at?: string | null
          id?: string
          metric_date?: string
          ocr_total_usage?: number | null
          storage_total_bytes?: number | null
          total_companies?: number | null
          total_mrr?: number | null
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          company_id: string
          created_at: string
          event_message: string | null
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          participant_id: string | null
          signature_request_id: string
          user_agent: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          event_message?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          participant_id?: string | null
          signature_request_id: string
          user_agent?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          event_message?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          participant_id?: string | null
          signature_request_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "signature_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_evidence_certificates: {
        Row: {
          certificate_url: string | null
          company_id: string
          document_hash: string | null
          events_snapshot: Json | null
          generated_at: string
          id: string
          participants_snapshot: Json | null
          pdf_url: string | null
          signature_request_id: string
          verification_code: string
        }
        Insert: {
          certificate_url?: string | null
          company_id: string
          document_hash?: string | null
          events_snapshot?: Json | null
          generated_at?: string
          id?: string
          participants_snapshot?: Json | null
          pdf_url?: string | null
          signature_request_id: string
          verification_code: string
        }
        Update: {
          certificate_url?: string | null
          company_id?: string
          document_hash?: string | null
          events_snapshot?: Json | null
          generated_at?: string
          id?: string
          participants_snapshot?: Json | null
          pdf_url?: string | null
          signature_request_id?: string
          verification_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_evidence_certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_evidence_certificates_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_participants: {
        Row: {
          access_token: string
          company_id: string
          created_at: string
          customer_id: string | null
          device_info: Json | null
          email: string | null
          id: string
          ip_address: string | null
          location_data: Json | null
          name: string
          phone: string | null
          reuse_authorized: boolean
          role: string
          signature_hash: string | null
          signature_image_url: string | null
          signature_request_id: string
          signature_type: string | null
          signed_at: string | null
          signing_order: number
          status: string
          token_expires_at: string | null
          user_agent: string | null
        }
        Insert: {
          access_token: string
          company_id: string
          created_at?: string
          customer_id?: string | null
          device_info?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          name: string
          phone?: string | null
          reuse_authorized?: boolean
          role?: string
          signature_hash?: string | null
          signature_image_url?: string | null
          signature_request_id: string
          signature_type?: string | null
          signed_at?: string | null
          signing_order?: number
          status?: string
          token_expires_at?: string | null
          user_agent?: string | null
        }
        Update: {
          access_token?: string
          company_id?: string
          created_at?: string
          customer_id?: string | null
          device_info?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          location_data?: Json | null
          name?: string
          phone?: string | null
          reuse_authorized?: boolean
          role?: string
          signature_hash?: string | null
          signature_image_url?: string | null
          signature_request_id?: string
          signature_type?: string | null
          signed_at?: string | null
          signing_order?: number
          status?: string
          token_expires_at?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_participants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_participants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_participants_signature_request_id_fkey"
            columns: ["signature_request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          document_hash: string | null
          document_id: string | null
          evidence_certificate_url: string | null
          expires_at: string | null
          final_signed_pdf_url: string | null
          id: string
          metadata: Json | null
          process_id: string | null
          signing_order: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          document_hash?: string | null
          document_id?: string | null
          evidence_certificate_url?: string | null
          expires_at?: string | null
          final_signed_pdf_url?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string | null
          signing_order?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          document_hash?: string | null
          document_id?: string | null
          evidence_certificate_url?: string | null
          expires_at?: string | null
          final_signed_pdf_url?: string | null
          id?: string
          metadata?: Json | null
          process_id?: string | null
          signing_order?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configs: {
        Row: {
          created_at: string | null
          critical_threshold_days: number
          id: string
          process_type_id: string | null
          target_days: number
          updated_at: string | null
          warning_threshold_days: number
        }
        Insert: {
          created_at?: string | null
          critical_threshold_days?: number
          id?: string
          process_type_id?: string | null
          target_days?: number
          updated_at?: string | null
          warning_threshold_days?: number
        }
        Update: {
          created_at?: string | null
          critical_threshold_days?: number
          id?: string
          process_type_id?: string | null
          target_days?: number
          updated_at?: string | null
          warning_threshold_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "sla_configs_process_type_id_fkey"
            columns: ["process_type_id"]
            isOneToOne: false
            referencedRelation: "process_types"
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
      support_tickets: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string | null
          status: string | null
          subject: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string | null
          status?: string | null
          subject?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_backlog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          priority: string
          source: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority: string
          source?: string | null
          status: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          priority?: string
          source?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_changelog: {
        Row: {
          changes: Json
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean | null
          title: string
          version: string
        }
        Insert: {
          changes?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          title: string
          version: string
        }
        Update: {
          changes?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean | null
          title?: string
          version?: string
        }
        Relationships: []
      }
      system_deploys: {
        Row: {
          created_at: string | null
          deployed_at: string | null
          deployed_by: string | null
          environment: string
          id: string
          is_hotfix: boolean | null
          release_notes: string | null
          status: string
          version: string
        }
        Insert: {
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment: string
          id?: string
          is_hotfix?: boolean | null
          release_notes?: string | null
          status: string
          version: string
        }
        Update: {
          created_at?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string
          id?: string
          is_hotfix?: boolean | null
          release_notes?: string | null
          status?: string
          version?: string
        }
        Relationships: []
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
      system_health_metrics: {
        Row: {
          id: string
          metadata: Json | null
          metric_name: string
          recorded_at: string | null
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json | null
          metric_name: string
          recorded_at?: string | null
          value: number
        }
        Update: {
          id?: string
          metadata?: Json | null
          metric_name?: string
          recorded_at?: string | null
          value?: number
        }
        Relationships: []
      }
      system_health_status: {
        Row: {
          id: string
          last_check: string | null
          latency_ms: number | null
          message: string | null
          service_name: string
          status: string
        }
        Insert: {
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          message?: string | null
          service_name: string
          status: string
        }
        Update: {
          id?: string
          last_check?: string | null
          latency_ms?: number | null
          message?: string | null
          service_name?: string
          status?: string
        }
        Relationships: []
      }
      system_incidents: {
        Row: {
          created_at: string | null
          description: string | null
          ends_at: string | null
          id: string
          impact_score: number | null
          is_maintenance: boolean | null
          recovery_steps: string | null
          root_cause: string | null
          severity: string | null
          starts_at: string | null
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          impact_score?: number | null
          is_maintenance?: boolean | null
          recovery_steps?: string | null
          root_cause?: string | null
          severity?: string | null
          starts_at?: string | null
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          impact_score?: number | null
          is_maintenance?: boolean | null
          recovery_steps?: string | null
          root_cause?: string | null
          severity?: string | null
          starts_at?: string | null
          status?: string | null
          title?: string
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
      system_readiness_scores: {
        Row: {
          category: string
          details: Json | null
          id: string
          last_checked: string | null
          score: number
          status: string
        }
        Insert: {
          category: string
          details?: Json | null
          id?: string
          last_checked?: string | null
          score?: number
          status?: string
        }
        Update: {
          category?: string
          details?: Json | null
          id?: string
          last_checked?: string | null
          score?: number
          status?: string
        }
        Relationships: []
      }
      system_roadmap: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          estimated_completion: string | null
          id: string
          priority: string
          status: string
          target_version: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          priority?: string
          status?: string
          target_version?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          estimated_completion?: string | null
          id?: string
          priority?: string
          status?: string
          target_version?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      telemetry_logs: {
        Row: {
          company_id: string | null
          created_at: string | null
          duration_ms: number | null
          event_type: string
          flow_name: string | null
          id: string
          metadata: Json | null
          module_name: string | null
          step_name: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          event_type: string
          flow_name?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string | null
          step_name?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          duration_ms?: number | null
          event_type?: string
          flow_name?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string | null
          step_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telemetry_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_downloads: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          template_id: string
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          template_id: string
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          template_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      template_reviews: {
        Row: {
          comment: string | null
          company_id: string | null
          created_at: string
          id: string
          rating: number
          template_id: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          rating: number
          template_id: string
          user_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          template_id?: string
          user_id?: string
        }
        Relationships: []
      }
      template_signature_anchors: {
        Row: {
          align: string
          company_id: string | null
          created_at: string
          height: number
          id: string
          is_default: boolean
          label: string | null
          page: number
          role: string
          template_id: string
          updated_at: string
          width: number
          x: number
          y: number
        }
        Insert: {
          align?: string
          company_id?: string | null
          created_at?: string
          height?: number
          id?: string
          is_default?: boolean
          label?: string | null
          page?: number
          role: string
          template_id: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Update: {
          align?: string
          company_id?: string | null
          created_at?: string
          height?: number
          id?: string
          is_default?: boolean
          label?: string | null
          page?: number
          role?: string
          template_id?: string
          updated_at?: string
          width?: number
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_signature_anchors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          changelog: Json
          created_at: string
          id: string
          notes: string | null
          released_at: string
          template_id: string
          version: string
        }
        Insert: {
          changelog?: Json
          created_at?: string
          id?: string
          notes?: string | null
          released_at?: string
          template_id: string
          version: string
        }
        Update: {
          changelog?: Json
          created_at?: string
          id?: string
          notes?: string | null
          released_at?: string
          template_id?: string
          version?: string
        }
        Relationships: []
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
          deleted_at: string | null
          discarded_at: string | null
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
          deleted_at?: string | null
          discarded_at?: string | null
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
          deleted_at?: string | null
          discarded_at?: string | null
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
      usage_analytics: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          module_name: string
          time_saved_minutes: number | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          module_name: string
          time_saved_minutes?: number | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          module_name?: string
          time_saved_minutes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      usage_metrics: {
        Row: {
          company_id: string
          created_at: string | null
          docs_generated: number | null
          id: string
          last_reset_at: string | null
          ocr_usage: number | null
          processes_created: number | null
          storage_usage_bytes: number | null
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          docs_generated?: number | null
          id?: string
          last_reset_at?: string | null
          ocr_usage?: number | null
          processes_created?: number | null
          storage_usage_bytes?: number | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          docs_generated?: number | null
          id?: string
          last_reset_at?: string | null
          ocr_usage?: number | null
          processes_created?: number | null
          storage_usage_bytes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usage_metrics_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ux_usability_metrics: {
        Row: {
          complexity_rating: number | null
          confusion_points: string[] | null
          created_at: string | null
          duration_ms: number | null
          flow_name: string
          id: string
          redundant_fields: string[] | null
          user_id: string | null
        }
        Insert: {
          complexity_rating?: number | null
          confusion_points?: string[] | null
          created_at?: string | null
          duration_ms?: number | null
          flow_name: string
          id?: string
          redundant_fields?: string[] | null
          user_id?: string | null
        }
        Update: {
          complexity_rating?: number | null
          confusion_points?: string[] | null
          created_at?: string | null
          duration_ms?: number | null
          flow_name?: string
          id?: string
          redundant_fields?: string[] | null
          user_id?: string | null
        }
        Relationships: []
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
          boca: string | null
          capacity: string | null
          category: string | null
          company_id: string
          created_at: string
          current_owner_cpf_cnpj: string | null
          current_owner_name: string | null
          customer_id: string | null
          engine: string | null
          engine_power: string | null
          engine_serial_number: string | null
          id: string
          length: string | null
          material: string | null
          name: string
          notes: string | null
          pontal: string | null
          registration_number: string | null
          updated_at: string
          vessel_type: string | null
        }
        Insert: {
          boca?: string | null
          capacity?: string | null
          category?: string | null
          company_id: string
          created_at?: string
          current_owner_cpf_cnpj?: string | null
          current_owner_name?: string | null
          customer_id?: string | null
          engine?: string | null
          engine_power?: string | null
          engine_serial_number?: string | null
          id?: string
          length?: string | null
          material?: string | null
          name: string
          notes?: string | null
          pontal?: string | null
          registration_number?: string | null
          updated_at?: string
          vessel_type?: string | null
        }
        Update: {
          boca?: string | null
          capacity?: string | null
          category?: string | null
          company_id?: string
          created_at?: string
          current_owner_cpf_cnpj?: string | null
          current_owner_name?: string | null
          customer_id?: string | null
          engine?: string | null
          engine_power?: string | null
          engine_serial_number?: string | null
          id?: string
          length?: string | null
          material?: string | null
          name?: string
          notes?: string | null
          pontal?: string | null
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
      _assert_process_access: { Args: { p_id: string }; Returns: string }
      active_processes_count: {
        Args: { p_company_id: string }
        Returns: number
      }
      check_process_duplicates: {
        Args: {
          p_cpf_cnpj?: string
          p_hull_number?: string
          p_tie?: string
          p_vessel_name?: string
        }
        Returns: Json
      }
      company_can_perform: {
        Args: { p_action: string; p_company_id: string }
        Returns: Json
      }
      current_company_id: { Args: never; Returns: string }
      current_user_company_id: { Args: never; Returns: string }
      duplicate_document: { Args: { doc_id: string }; Returns: string }
      get_system_readiness: { Args: never; Returns: Json }
      increment_ocr_usage: {
        Args: { amount: number; company_id_param: string }
        Returns: undefined
      }
      is_admin_master: { Args: never; Returns: boolean }
      limits_check: {
        Args: { p_amount?: number; p_company: string; p_resource: string }
        Returns: Json
      }
      limits_consume: {
        Args: {
          p_amount?: number
          p_company: string
          p_metadata?: Json
          p_request_id?: string
          p_resource: string
        }
        Returns: Json
      }
      limits_status: {
        Args: { p_company: string }
        Returns: {
          daily_limit: number
          daily_used: number
          label: string
          monthly_limit: number
          monthly_used: number
          percent_day: number
          percent_month: number
          renews_at: string
          resource_key: string
          unit: string
        }[]
      }
      log_security_event: {
        Args: {
          p_action: string
          p_company_id: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_severity?: string
        }
        Returns: undefined
      }
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
      process_archive: { Args: { p_id: string }; Returns: undefined }
      process_duplicate: { Args: { p_id: string }; Returns: string }
      process_get_share_token: { Args: { p_id: string }; Returns: string }
      process_hard_delete: {
        Args: { p_confirmation: string; p_id: string }
        Returns: undefined
      }
      process_materialize_checklist: {
        Args: { p_process_id: string }
        Returns: Json
      }
      process_restore: { Args: { p_id: string }; Returns: undefined }
      process_toggle_favorite: { Args: { p_id: string }; Returns: boolean }
      process_trash: { Args: { p_id: string }; Returns: undefined }
      process_unarchive: { Args: { p_id: string }; Returns: undefined }
      purge_orphan_uploads: { Args: { p_older_than?: string }; Returns: Json }
      rl_hit: {
        Args: {
          p_bucket: string
          p_max: number
          p_subject: string
          p_window_seconds?: number
        }
        Returns: Json
      }
      seed_demo_data: { Args: { p_company_id: string }; Returns: undefined }
      track_usage: {
        Args: {
          p_action: string
          p_meta?: Json
          p_module: string
          p_time_saved?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      partner_type:
        | "despachante"
        | "engenheiro"
        | "vistoriador"
        | "marina"
        | "estaleiro"
        | "oficina"
        | "outro"
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
    Enums: {
      partner_type: [
        "despachante",
        "engenheiro",
        "vistoriador",
        "marina",
        "estaleiro",
        "oficina",
        "outro",
      ],
    },
  },
} as const
