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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          gstin: string | null
          id: string
          invoice_number_padding: number
          invoice_prefix: string
          invoice_terms: string | null
          logo_url: string | null
          name: string
          next_invoice_number: number
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_number_padding?: number
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          name: string
          next_invoice_number?: number
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_number_padding?: number
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          name?: string
          next_invoice_number?: number
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          assigned_user_id: string | null
          category: string | null
          created_at: string
          created_by: string | null
          credit_limit: number
          credit_period_days: number
          district: string | null
          email: string | null
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          opening_balance: number
          opening_balance_type: string
          phone: string | null
          route_id: string | null
          state: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          assigned_user_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          credit_period_days?: number
          district?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          opening_balance?: number
          opening_balance_type?: string
          phone?: string | null
          route_id?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          assigned_user_id?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number
          credit_period_days?: number
          district?: string | null
          email?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          opening_balance?: number
          opening_balance_type?: string
          phone?: string | null
          route_id?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string
          id: string
          module_key: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          module_key: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          module_key?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          batch_number: string | null
          brand: string | null
          code: string
          created_at: string
          created_by: string | null
          expiry_date: string | null
          gst_percent: number
          hsn_code: string | null
          id: string
          is_active: boolean
          landing_cost: number | null
          max_stock_level: number | null
          min_stock_level: number
          mrp: number | null
          name: string
          opening_qty: number
          opening_value: number
          pack_size: string | null
          product_group: string | null
          product_sub_group: string | null
          purchase_rate: number | null
          selling_rate: number | null
          unit: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          batch_number?: string | null
          brand?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          landing_cost?: number | null
          max_stock_level?: number | null
          min_stock_level?: number
          mrp?: number | null
          name: string
          opening_qty?: number
          opening_value?: number
          pack_size?: string | null
          product_group?: string | null
          product_sub_group?: string | null
          purchase_rate?: number | null
          selling_rate?: number | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          batch_number?: string | null
          brand?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          expiry_date?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          landing_cost?: number | null
          max_stock_level?: number | null
          min_stock_level?: number
          mrp?: number | null
          name?: string
          opening_qty?: number
          opening_value?: number
          pack_size?: string | null
          product_group?: string | null
          product_sub_group?: string | null
          purchase_rate?: number | null
          selling_rate?: number | null
          unit?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
        }
        Relationships: []
      }
      routes: {
        Row: {
          area: string | null
          assigned_user_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          route_days: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          area?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          route_days?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          area?: string | null
          assigned_user_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          route_days?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          bank_name: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          credit_period_days: number
          gstin: string | null
          id: string
          is_active: boolean
          name: string
          opening_balance: number
          opening_balance_type: string
          phone: string | null
          state: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_period_days?: number
          gstin?: string | null
          id?: string
          is_active?: boolean
          name: string
          opening_balance?: number
          opening_balance_type?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          credit_period_days?: number
          gstin?: string | null
          id?: string
          is_active?: boolean
          name?: string
          opening_balance?: number
          opening_balance_type?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          is_active: boolean
          role_id: string
          staff_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          full_name: string
          id: string
          is_active?: boolean
          role_id: string
          staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          role_id?: string
          staff_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          role_name: string
        }[]
      }
      current_role_name: { Args: never; Returns: string }
      has_permission: {
        Args: { p_action: string; p_module: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      my_permissions: {
        Args: never
        Returns: {
          action: string
          module_key: string
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
