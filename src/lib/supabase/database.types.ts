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
      chart_of_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
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
          credit_note_padding: number
          credit_note_prefix: string
          debit_note_padding: number
          debit_note_prefix: string
          email: string | null
          gstin: string | null
          id: string
          invoice_number_padding: number
          invoice_prefix: string
          invoice_terms: string | null
          logo_url: string | null
          name: string
          next_credit_note_number: number
          next_debit_note_number: number
          next_invoice_number: number
          next_payment_number: number
          next_purchase_ref_number: number
          next_receipt_number: number
          payment_padding: number
          payment_prefix: string
          phone: string | null
          purchase_ref_padding: number
          purchase_ref_prefix: string
          receipt_padding: number
          receipt_prefix: string
          state: string | null
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
          credit_note_padding?: number
          credit_note_prefix?: string
          debit_note_padding?: number
          debit_note_prefix?: string
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_number_padding?: number
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          name: string
          next_credit_note_number?: number
          next_debit_note_number?: number
          next_invoice_number?: number
          next_payment_number?: number
          next_purchase_ref_number?: number
          next_receipt_number?: number
          payment_padding?: number
          payment_prefix?: string
          phone?: string | null
          purchase_ref_padding?: number
          purchase_ref_prefix?: string
          receipt_padding?: number
          receipt_prefix?: string
          state?: string | null
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
          credit_note_padding?: number
          credit_note_prefix?: string
          debit_note_padding?: number
          debit_note_prefix?: string
          email?: string | null
          gstin?: string | null
          id?: string
          invoice_number_padding?: number
          invoice_prefix?: string
          invoice_terms?: string | null
          logo_url?: string | null
          name?: string
          next_credit_note_number?: number
          next_debit_note_number?: number
          next_invoice_number?: number
          next_payment_number?: number
          next_purchase_ref_number?: number
          next_receipt_number?: number
          payment_padding?: number
          payment_prefix?: string
          phone?: string | null
          purchase_ref_padding?: number
          purchase_ref_prefix?: string
          receipt_padding?: number
          receipt_prefix?: string
          state?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      credit_note_items: {
        Row: {
          cgst: number
          credit_note_id: string
          discount_percent: number
          gst_percent: number
          id: string
          igst: number
          line_total: number
          product_id: string
          quantity: number
          rate: number
          sales_invoice_item_id: string
          sgst: number
          taxable_value: number
        }
        Insert: {
          cgst?: number
          credit_note_id: string
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          line_total?: number
          product_id: string
          quantity: number
          rate: number
          sales_invoice_item_id: string
          sgst?: number
          taxable_value?: number
        }
        Update: {
          cgst?: number
          credit_note_id?: string
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          line_total?: number
          product_id?: string
          quantity?: number
          rate?: number
          sales_invoice_item_id?: string
          sgst?: number
          taxable_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_note_items_credit_note_id_fkey"
            columns: ["credit_note_id"]
            isOneToOne: false
            referencedRelation: "credit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "credit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_note_items_sales_invoice_item_id_fkey"
            columns: ["sales_invoice_item_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_notes: {
        Row: {
          cgst_total: number
          created_at: string
          created_by: string | null
          credit_note_date: string
          credit_note_number: string
          customer_id: string
          discount_total: number
          id: string
          igst_total: number
          reason: string
          sales_invoice_id: string
          sgst_total: number
          status: string
          subtotal: number
          taxable_total: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number: string
          customer_id: string
          discount_total?: number
          id?: string
          igst_total?: number
          reason: string
          sales_invoice_id: string
          sgst_total?: number
          status?: string
          subtotal?: number
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          credit_note_date?: string
          credit_note_number?: string
          customer_id?: string
          discount_total?: number
          id?: string
          igst_total?: number
          reason?: string
          sales_invoice_id?: string
          sgst_total?: number
          status?: string
          subtotal?: number
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_notes_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "credit_notes_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
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
      debit_note_items: {
        Row: {
          cgst: number
          debit_note_id: string
          discount_percent: number
          gst_percent: number
          id: string
          igst: number
          line_total: number
          product_id: string
          purchase_invoice_item_id: string
          quantity: number
          rate: number
          sgst: number
          taxable_value: number
        }
        Insert: {
          cgst?: number
          debit_note_id: string
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          line_total?: number
          product_id: string
          purchase_invoice_item_id: string
          quantity: number
          rate: number
          sgst?: number
          taxable_value?: number
        }
        Update: {
          cgst?: number
          debit_note_id?: string
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          line_total?: number
          product_id?: string
          purchase_invoice_item_id?: string
          quantity?: number
          rate?: number
          sgst?: number
          taxable_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "debit_note_items_debit_note_id_fkey"
            columns: ["debit_note_id"]
            isOneToOne: false
            referencedRelation: "debit_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "debit_note_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_note_items_purchase_invoice_item_id_fkey"
            columns: ["purchase_invoice_item_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoice_items"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_notes: {
        Row: {
          cgst_total: number
          created_at: string
          created_by: string | null
          debit_note_date: string
          debit_note_number: string
          discount_total: number
          id: string
          igst_total: number
          purchase_invoice_id: string
          reason: string
          sgst_total: number
          status: string
          subtotal: number
          supplier_id: string
          taxable_total: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          debit_note_date?: string
          debit_note_number: string
          discount_total?: number
          id?: string
          igst_total?: number
          purchase_invoice_id: string
          reason: string
          sgst_total?: number
          status?: string
          subtotal?: number
          supplier_id: string
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          debit_note_date?: string
          debit_note_number?: string
          discount_total?: number
          id?: string
          igst_total?: number
          purchase_invoice_id?: string
          reason?: string
          sgst_total?: number
          status?: string
          subtotal?: number
          supplier_id?: string
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_notes_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "debit_notes_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debit_notes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gst_return_periods: {
        Row: {
          created_at: string
          created_by: string | null
          filed_reference_number: string | null
          id: string
          notes: string | null
          period_month: number
          period_year: number
          return_type: string
          status: string
          status_updated_at: string
          status_updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          filed_reference_number?: string | null
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          return_type: string
          status?: string
          status_updated_at?: string
          status_updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          filed_reference_number?: string | null
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          return_type?: string
          status?: string
          status_updated_at?: string
          status_updated_by?: string | null
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          entry_date: string
          id: string
          reversed_entry_id: string | null
          source_id: string
          source_table: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          entry_date: string
          id?: string
          reversed_entry_id?: string | null
          source_id: string
          source_table: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          entry_date?: string
          id?: string
          reversed_entry_id?: string | null
          source_id?: string
          source_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_reversed_entry_id_fkey"
            columns: ["reversed_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          credit_amount: number
          debit_amount: number
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          credit_amount?: number
          debit_amount?: number
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          credit_amount?: number
          debit_amount?: number
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "chart_of_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount_allocated: number
          id: string
          payment_id: string
          purchase_invoice_id: string
        }
        Insert: {
          amount_allocated: number
          id?: string
          payment_id: string
          purchase_invoice_id: string
        }
        Update: {
          amount_allocated?: number
          id?: string
          payment_id?: string
          purchase_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_allocations_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          expense_category_id: string | null
          id: string
          method: string
          notes: string | null
          paid_to: string | null
          payment_date: string
          payment_number: string
          purpose: string
          reference_number: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          expense_category_id?: string | null
          id?: string
          method: string
          notes?: string | null
          paid_to?: string | null
          payment_date?: string
          payment_number: string
          purpose: string
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          expense_category_id?: string | null
          id?: string
          method?: string
          notes?: string | null
          paid_to?: string | null
          payment_date?: string
          payment_number?: string
          purpose?: string
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          last_purchase_date: string | null
          last_purchase_rate: number | null
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
          last_purchase_date?: string | null
          last_purchase_rate?: number | null
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
          last_purchase_date?: string | null
          last_purchase_rate?: number | null
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
      purchase_invoice_items: {
        Row: {
          cgst: number
          discount_percent: number
          gst_percent: number
          id: string
          igst: number
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          rate: number
          sgst: number
          taxable_value: number
        }
        Insert: {
          cgst?: number
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          rate: number
          sgst?: number
          taxable_value: number
        }
        Update: {
          cgst?: number
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          rate?: number
          sgst?: number
          taxable_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_invoices: {
        Row: {
          cgst_total: number
          created_at: string
          created_by: string | null
          discount_total: number
          duplicate_override: boolean
          id: string
          igst_total: number
          notes: string | null
          our_reference_number: string
          overridden_at: string | null
          overridden_by: string | null
          sgst_total: number
          status: string
          subtotal: number
          supplier_id: string
          supplier_invoice_date: string
          supplier_invoice_number: string
          taxable_total: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          discount_total?: number
          duplicate_override?: boolean
          id?: string
          igst_total?: number
          notes?: string | null
          our_reference_number: string
          overridden_at?: string | null
          overridden_by?: string | null
          sgst_total?: number
          status?: string
          subtotal?: number
          supplier_id: string
          supplier_invoice_date: string
          supplier_invoice_number: string
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cgst_total?: number
          created_at?: string
          created_by?: string | null
          discount_total?: number
          duplicate_override?: boolean
          id?: string
          igst_total?: number
          notes?: string | null
          our_reference_number?: string
          overridden_at?: string | null
          overridden_by?: string | null
          sgst_total?: number
          status?: string
          subtotal?: number
          supplier_id?: string
          supplier_invoice_date?: string
          supplier_invoice_number?: string
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_verifications: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          purchase_invoice_id: string
          status: string
          supplier_gst_total: number | null
          supplier_taxable_value: number | null
          supplier_total: number | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_invoice_id: string
          status?: string
          supplier_gst_total?: number | null
          supplier_taxable_value?: number | null
          supplier_total?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          purchase_invoice_id?: string
          status?: string
          supplier_gst_total?: number | null
          supplier_taxable_value?: number | null
          supplier_total?: number | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_verifications_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: true
            referencedRelation: "purchase_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "purchase_verifications_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: true
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_allocations: {
        Row: {
          amount_allocated: number
          id: string
          receipt_id: string
          sales_invoice_id: string
        }
        Insert: {
          amount_allocated: number
          id?: string
          receipt_id: string
          sales_invoice_id: string
        }
        Update: {
          amount_allocated?: number
          id?: string
          receipt_id?: string
          sales_invoice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_allocations_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_allocations_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "receipt_allocations_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          mode: string
          notes: string | null
          receipt_date: string
          receipt_number: string
          reference_number: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method: string
          mode: string
          notes?: string | null
          receipt_date?: string
          receipt_number: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: string
          mode?: string
          notes?: string | null
          receipt_date?: string
          receipt_number?: string
          reference_number?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
      sales_invoice_items: {
        Row: {
          cgst: number
          cost_price: number
          discount_percent: number
          gst_percent: number
          id: string
          igst: number
          invoice_id: string
          line_total: number
          product_id: string
          profit_amount: number
          quantity: number
          rate: number
          sgst: number
          taxable_value: number
        }
        Insert: {
          cgst?: number
          cost_price?: number
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          invoice_id: string
          line_total: number
          product_id: string
          profit_amount?: number
          quantity: number
          rate: number
          sgst?: number
          taxable_value: number
        }
        Update: {
          cgst?: number
          cost_price?: number
          discount_percent?: number
          gst_percent?: number
          id?: string
          igst?: number
          invoice_id?: string
          line_total?: number
          product_id?: string
          profit_amount?: number
          quantity?: number
          rate?: number
          sgst?: number
          taxable_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          cash_customer_name: string | null
          cash_customer_phone: string | null
          cgst_total: number
          cost_total: number
          created_at: string
          created_by: string | null
          credit_period_days: number
          customer_id: string | null
          discount_total: number
          due_date: string | null
          id: string
          igst_total: number
          invoice_date: string
          invoice_number: string
          notes: string | null
          profit_total: number
          route_id: string | null
          sale_type: string
          sgst_total: number
          staff_id: string | null
          status: string
          subtotal: number
          taxable_total: number
          total_amount: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cash_customer_name?: string | null
          cash_customer_phone?: string | null
          cgst_total?: number
          cost_total?: number
          created_at?: string
          created_by?: string | null
          credit_period_days?: number
          customer_id?: string | null
          discount_total?: number
          due_date?: string | null
          id?: string
          igst_total?: number
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          profit_total?: number
          route_id?: string | null
          sale_type: string
          sgst_total?: number
          staff_id?: string | null
          status?: string
          subtotal?: number
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cash_customer_name?: string | null
          cash_customer_phone?: string | null
          cgst_total?: number
          cost_total?: number
          created_at?: string
          created_by?: string | null
          credit_period_days?: number
          customer_id?: string | null
          discount_total?: number
          due_date?: string | null
          id?: string
          igst_total?: number
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          profit_total?: number
          route_id?: string | null
          sale_type?: string
          sgst_total?: number
          staff_id?: string | null
          status?: string
          subtotal?: number
          taxable_total?: number
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          discount_percent: number
          id: string
          order_id: string
          product_id: string
          quantity: number
          rate: number
        }
        Insert: {
          discount_percent?: number
          id?: string
          order_id: string
          product_id: string
          quantity: number
          rate: number
        }
        Update: {
          discount_percent?: number
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          converted_invoice_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          notes: string | null
          route_id: string | null
          staff_id: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          converted_invoice_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          route_id?: string | null
          staff_id?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_outstanding"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "sales_orders_converted_invoice_id_fkey"
            columns: ["converted_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_change: number
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_change: number
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_change?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          quantity_change: number
          reference_id: string | null
          reference_table: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          quantity_change: number
          reference_id?: string | null
          reference_table?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          quantity_change?: number
          reference_id?: string | null
          reference_table?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "product_stock_levels"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      product_stock_levels: {
        Row: {
          brand: string | null
          code: string | null
          current_qty: number | null
          is_active: boolean | null
          max_stock_level: number | null
          min_stock_level: number | null
          name: string | null
          opening_qty: number | null
          product_group: string | null
          product_id: string | null
          product_sub_group: string | null
          stock_value: number | null
          unit: string | null
          unit_cost: number | null
        }
        Relationships: []
      }
      purchase_invoice_outstanding: {
        Row: {
          invoice_id: string | null
          our_reference_number: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_outstanding: {
        Row: {
          customer_id: string | null
          invoice_id: string | null
          invoice_number: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cancel_credit_note: {
        Args: { p_credit_note_id: string }
        Returns: undefined
      }
      cancel_debit_note: {
        Args: { p_debit_note_id: string }
        Returns: undefined
      }
      cancel_payment: { Args: { p_payment_id: string }; Returns: undefined }
      cancel_purchase_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      cancel_receipt: { Args: { p_receipt_id: string }; Returns: undefined }
      cancel_sales_invoice: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      coa_id: { Args: { p_code: string }; Returns: string }
      create_credit_note: {
        Args: { p_items: Json; p_reason: string; p_sales_invoice_id: string }
        Returns: string
      }
      create_debit_note: {
        Args: { p_items: Json; p_purchase_invoice_id: string; p_reason: string }
        Returns: string
      }
      create_payment: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_expense_category_id: string
          p_method: string
          p_notes: string
          p_paid_to: string
          p_payment_date: string
          p_purpose: string
          p_reference_number: string
          p_supplier_id: string
        }
        Returns: string
      }
      create_purchase_invoice: {
        Args: {
          p_items: Json
          p_notes: string
          p_override_duplicate: boolean
          p_supplier_id: string
          p_supplier_invoice_date: string
          p_supplier_invoice_number: string
        }
        Returns: string
      }
      create_receipt: {
        Args: {
          p_allocations: Json
          p_amount: number
          p_customer_id: string
          p_method: string
          p_mode: string
          p_notes: string
          p_receipt_date: string
          p_reference_number: string
        }
        Returns: string
      }
      create_sales_invoice: {
        Args: {
          p_cash_customer_name: string
          p_cash_customer_phone: string
          p_credit_period_days: number
          p_customer_id: string
          p_items: Json
          p_notes: string
          p_route_id: string
          p_sale_type: string
          p_staff_id: string
        }
        Returns: string
      }
      create_stock_adjustment: {
        Args: {
          p_notes: string
          p_product_id: string
          p_quantity_change: number
          p_reason: string
        }
        Returns: string
      }
      current_role_name: { Args: never; Returns: string }
      get_account_balances: {
        Args: { p_from_date?: string; p_to_date?: string }
        Returns: {
          account_id: string
          account_type: string
          balance: number
          code: string
          name: string
          total_credit: number
          total_debit: number
        }[]
      }
      get_customer_ledger: {
        Args: { p_as_of_date?: string; p_customer_id: string }
        Returns: {
          billed: number
          particulars: string
          received: number
          ref_id: string
          ref_type: string
          running_balance: number
          txn_date: string
        }[]
      }
      get_gstr1_b2b: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cgst_total: number
          customer_gstin: string
          customer_name: string
          igst_total: number
          invoice_date: string
          invoice_id: string
          invoice_number: string
          sgst_total: number
          taxable_total: number
          total_amount: number
        }[]
      }
      get_gstr1_b2c_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cgst_total: number
          gst_percent: number
          igst_total: number
          invoice_count: number
          sgst_total: number
          taxable_total: number
          total_amount: number
        }[]
      }
      get_hsn_summary: {
        Args: { p_from: string; p_to: string; p_type: string }
        Returns: {
          cgst_total: number
          description: string
          gst_percent: number
          hsn_code: string
          igst_total: number
          sgst_total: number
          taxable_total: number
          total_amount: number
          total_quantity: number
          unit: string
        }[]
      }
      get_last_price: {
        Args: { p_customer_id: string; p_product_id: string }
        Returns: {
          discount_percent: number
          invoice_date: string
          invoice_number: string
          quantity: number
          rate: number
        }[]
      }
      get_movement_analysis: {
        Args: { p_days: number }
        Returns: {
          code: string
          name: string
          product_id: string
          total_sold: number
        }[]
      }
      get_purchase_register: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cgst_total: number
          igst_total: number
          invoice_date: string
          invoice_id: string
          our_reference_number: string
          sgst_total: number
          supplier_gstin: string
          supplier_invoice_number: string
          supplier_name: string
          taxable_total: number
          total_amount: number
        }[]
      }
      get_stock_as_of: {
        Args: { p_as_of_date: string }
        Returns: {
          brand: string
          code: string
          current_qty: number
          is_active: boolean
          max_stock_level: number
          min_stock_level: number
          name: string
          opening_qty: number
          product_group: string
          product_id: string
          product_sub_group: string
          stock_value: number
          unit: string
          unit_cost: number
        }[]
      }
      get_supplier_ledger: {
        Args: { p_as_of_date?: string; p_supplier_id: string }
        Returns: {
          billed: number
          paid: number
          particulars: string
          ref_id: string
          ref_type: string
          running_balance: number
          txn_date: string
        }[]
      }
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
      record_purchase_verification: {
        Args: {
          p_invoice_id: string
          p_notes: string
          p_supplier_gst_total: number
          p_supplier_taxable_value: number
          p_supplier_total: number
        }
        Returns: string
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
