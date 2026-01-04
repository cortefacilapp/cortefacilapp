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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      financial_logs: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          type?: string
        }
        Relationships: []
      }
      haircut_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          is_used: boolean | null
          subscription_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          is_used?: boolean | null
          subscription_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "haircut_codes_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      haircut_history: {
        Row: {
          amount_to_platform: number | null
          amount_to_salon: number | null
          code_used: string | null
          created_at: string
          id: string
          salon_id: string
          subscription_id: string
          validated_by: string | null
        }
        Insert: {
          amount_to_platform?: number | null
          amount_to_salon?: number | null
          code_used?: string | null
          created_at?: string
          id?: string
          salon_id: string
          subscription_id: string
          validated_by?: string | null
        }
        Update: {
          amount_to_platform?: number | null
          amount_to_salon?: number | null
          code_used?: string | null
          created_at?: string
          id?: string
          salon_id?: string
          subscription_id?: string
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "haircut_history_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "haircut_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          external_id: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          external_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          external_id?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          haircuts_count: number | null
          id: string
          paid_at: string | null
          period_end: string
          period_start: string
          salon_id: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          haircuts_count?: number | null
          id?: string
          paid_at?: string | null
          period_end: string
          period_start: string
          salon_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          haircuts_count?: number | null
          id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          salon_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payouts_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          credits_per_month: number
          description: string | null
          duration_days: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          credits_per_month: number
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          created_at?: string
          credits_per_month?: number
          description?: string | null
          duration_days?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          birth_date: string | null
          cep: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
          role: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      salons: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          commission_rate: number | null
          created_at: string
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          name: string
          owner_id: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name: string
          owner_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          commission_rate?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          name?: string
          owner_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_credits: number | null
          end_date: string | null
          id: string
          plan_id: string
          salon_id: string
          start_date: string | null
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_credits?: number | null
          end_date?: string | null
          id?: string
          plan_id: string
          salon_id: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_credits?: number | null
          end_date?: string | null
          id?: string
          plan_id?: string
          salon_id?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_salon_id_fkey"
            columns: ["salon_id"]
            isOneToOne: false
            referencedRelation: "salons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "subscriber" | "salon" | "salon_owner"
      subscription_status: "active" | "inactive" | "cancelled" | "pending"
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
      app_role: ["admin", "subscriber", "salon", "salon_owner"],
      subscription_status: ["active", "inactive", "cancelled", "pending"],
    },
  },
} as const
