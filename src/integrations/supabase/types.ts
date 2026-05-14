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
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          plan: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          updated_at?: string
        }
        Relationships: []
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
      document_fields: {
        Row: {
          created_at: string
          field_label: string
          field_name: string
          field_type: string
          id: string
          page_number: number | null
          position_x: number | null
          position_y: number | null
          required: boolean | null
          source_field: string | null
          source_type: string
          template_id: string | null
        }
        Insert: {
          created_at?: string
          field_label: string
          field_name: string
          field_type?: string
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          required?: boolean | null
          source_field?: string | null
          source_type?: string
          template_id?: string | null
        }
        Update: {
          created_at?: string
          field_label?: string
          field_name?: string
          field_type?: string
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          required?: boolean | null
          source_field?: string | null
          source_type?: string
          template_id?: string | null
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
          category: string
          company_id: string | null
          created_at: string
          description: string | null
          fields_config: Json | null
          id: string
          is_active: boolean | null
          name: string
          process_type: string | null
          template_file_url: string | null
          updated_at: string
          version: number | null
        }
        Insert: {
          category: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          fields_config?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          process_type?: string | null
          template_file_url?: string | null
          updated_at?: string
          version?: number | null
        }
        Update: {
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          fields_config?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          process_type?: string | null
          template_file_url?: string | null
          updated_at?: string
          version?: number | null
        }
        Relationships: [
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
          file_url: string | null
          id: string
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
          file_url?: string | null
          id?: string
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
          file_url?: string | null
          id?: string
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
          generated_by: string | null
          generated_file_url: string | null
          id: string
          metadata: Json | null
          name: string
          process_id: string | null
          status: string
          template_id: string | null
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          generated_by?: string | null
          generated_file_url?: string | null
          id?: string
          metadata?: Json | null
          name: string
          process_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          generated_by?: string | null
          generated_file_url?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          process_id?: string | null
          status?: string
          template_id?: string | null
          updated_at?: string
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
      payment_logs: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string | null
          id: string
          payload: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
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
          price: number
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
          price: number
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
          price?: number
          user_limit?: number | null
        }
        Relationships: []
      }
      processes: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          process_type: string
          status: string
          updated_at: string
          vessel_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          process_type: string
          status?: string
          updated_at?: string
          vessel_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          process_type?: string
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
      uploaded_files: {
        Row: {
          category: string
          company_id: string | null
          created_at: string
          customer_id: string | null
          extracted_data: Json | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
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
          extracted_data?: Json | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
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
          extracted_data?: Json | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
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
