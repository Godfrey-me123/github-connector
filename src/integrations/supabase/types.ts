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
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      background_assets: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          service_type: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name?: string | null
          service_type?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          service_type?: string | null
          url?: string
        }
        Relationships: []
      }
      download_records: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          id: string
          service: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type: string
          id: string
          service: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          id?: string
          service?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      manual_requests: {
        Row: {
          admin_notes: string | null
          full_name: string
          id: string
          normal_call_number: string
          service_id: string | null
          service_name: string
          status: string | null
          submitted_at: string | null
          user_id: string | null
          user_passkey: string | null
          whatsapp_number: string
        }
        Insert: {
          admin_notes?: string | null
          full_name: string
          id: string
          normal_call_number: string
          service_id?: string | null
          service_name: string
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          user_passkey?: string | null
          whatsapp_number: string
        }
        Update: {
          admin_notes?: string | null
          full_name?: string
          id?: string
          normal_call_number?: string
          service_id?: string | null
          service_name?: string
          status?: string | null
          submitted_at?: string | null
          user_id?: string | null
          user_passkey?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_at_timestamp: number | null
          created_by: string | null
          created_date: string | null
          description: string | null
          id: string
          key: string
          last_used: string | null
          package_name: string | null
          package_price: string | null
          payment_status: string | null
          remaining_usages: number | null
          role: string | null
          total_usages: number | null
          used_usages: number | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_at_timestamp?: number | null
          created_by?: string | null
          created_date?: string | null
          description?: string | null
          id: string
          key: string
          last_used?: string | null
          package_name?: string | null
          package_price?: string | null
          payment_status?: string | null
          remaining_usages?: number | null
          role?: string | null
          total_usages?: number | null
          used_usages?: number | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_at_timestamp?: number | null
          created_by?: string | null
          created_date?: string | null
          description?: string | null
          id?: string
          key?: string
          last_used?: string | null
          package_name?: string | null
          package_price?: string | null
          payment_status?: string | null
          remaining_usages?: number | null
          role?: string | null
          total_usages?: number | null
          used_usages?: number | null
        }
        Relationships: []
      }
      payment_reviews: {
        Row: {
          admin_id: string | null
          id: string
          review_notes: string | null
          reviewed_at: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          admin_id?: string | null
          id: string
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          admin_id?: string | null
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          passkey: string | null
          phone: string | null
          role: string | null
          status: string | null
          tokens: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          passkey?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          passkey?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          service_name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          service_name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          service_name?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          config_key: string | null
          config_value: Json | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key?: string | null
          config_value?: Json | null
          id: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string | null
          config_value?: Json | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          category_name: string
          created_at: string | null
          id: string
          service_type: string
        }
        Insert: {
          category_name: string
          created_at?: string | null
          id: string
          service_type: string
        }
        Update: {
          category_name?: string
          created_at?: string | null
          id?: string
          service_type?: string
        }
        Relationships: []
      }
      template_elements: {
        Row: {
          element_json: Json | null
          element_name: string | null
          element_type: string | null
          id: string
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          element_json?: Json | null
          element_name?: string | null
          element_type?: string | null
          id: string
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          element_json?: Json | null
          element_name?: string | null
          element_type?: string | null
          id?: string
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_elements_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          created_at: string | null
          id: string
          template_id: string | null
          template_json: Json
          version_number: number
        }
        Insert: {
          created_at?: string | null
          id: string
          template_id?: string | null
          template_json: Json
          version_number: number
        }
        Update: {
          created_at?: string | null
          id?: string
          template_id?: string | null
          template_json?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          background_url: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_universal: boolean | null
          service_type: string
          template_json: Json
          template_name: string | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          background_url?: string | null
          created_by?: string | null
          id: string
          is_active?: boolean | null
          is_universal?: boolean | null
          service_type: string
          template_json: Json
          template_name?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          background_url?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_universal?: boolean | null
          service_type?: string
          template_json?: Json
          template_name?: string | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      token_packages: {
        Row: {
          bonus: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: string
          promotion: string | null
          sort_order: number | null
          updated_at: string | null
          usages: number
          visibility: string | null
        }
        Insert: {
          bonus?: number | null
          created_at?: string | null
          description?: string | null
          id: string
          is_active?: boolean | null
          name: string
          price: string
          promotion?: string | null
          sort_order?: number | null
          updated_at?: string | null
          usages: number
          visibility?: string | null
        }
        Update: {
          bonus?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: string
          promotion?: string | null
          sort_order?: number | null
          updated_at?: string | null
          usages?: number
          visibility?: string | null
        }
        Relationships: []
      }
      token_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id: string
          reason: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      token_wallets: {
        Row: {
          balance: number | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tokens: {
        Row: {
          balance: number | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_generated_cards: {
        Row: {
          card_data: Json | null
          created_at: string | null
          id: string
          service_type: string | null
          user_id: string | null
        }
        Insert: {
          card_data?: Json | null
          created_at?: string | null
          id: string
          service_type?: string | null
          user_id?: string | null
        }
        Update: {
          card_data?: Json | null
          created_at?: string | null
          id?: string
          service_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          payment_date: string | null
          receiver: string | null
          reference: string | null
          sender: string | null
          status: string | null
          tokens_granted: number | null
          user_id: string | null
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id: string
          payment_date?: string | null
          receiver?: string | null
          reference?: string | null
          sender?: string | null
          status?: string | null
          tokens_granted?: number | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          payment_date?: string | null
          receiver?: string | null
          reference?: string | null
          sender?: string | null
          status?: string | null
          tokens_granted?: number | null
          user_id?: string | null
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          passkey: string | null
          phone: string | null
          role: string | null
          status: string | null
          tokens: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          passkey?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tokens?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          passkey?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          tokens?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          permissions: Json | null
          role: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          permissions?: Json | null
          role?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          preferences: Json | null
          profile_settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          preferences?: Json | null
          profile_settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          preferences?: Json | null
          profile_settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      weekly_offers: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          price: string
          services: string[] | null
          start_date: string
          title: string
          tokens: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id: string
          is_active?: boolean | null
          price: string
          services?: string[] | null
          start_date: string
          title: string
          tokens: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          price?: string
          services?: string[] | null
          start_date?: string
          title?: string
          tokens?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
