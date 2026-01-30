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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      contacts: {
        Row: {
          company: string | null
          contact_type: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          role: string | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          contact_type: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_notes: {
        Row: {
          content: string | null
          created_at: string
          date: string
          id: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          date: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      deal_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          deal_id: string
          id: string
          input_data: Json | null
          notion_connected: boolean | null
          result_content: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          created_at?: string
          deal_id: string
          id?: string
          input_data?: Json | null
          notion_connected?: boolean | null
          result_content: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          created_at?: string
          deal_id?: string
          id?: string
          input_data?: Json | null
          notion_connected?: boolean | null
          result_content?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_analyses_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          benchmark_companies: string | null
          bu_category: string | null
          created_at: string
          deal_date: string | null
          description: string | null
          feedback_notes: string | null
          financials: string | null
          folder_link: string | null
          followers: string | null
          funding_amount: string | null
          funding_round: string | null
          hq_location: string | null
          id: string
          key_contacts: string | null
          leads: string | null
          logo_url: string | null
          pre_investors: string | null
          project_name: string
          sector: string | null
          source: string | null
          status: string | null
          updated_at: string
          user_id: string
          valuation_terms: string | null
        }
        Insert: {
          benchmark_companies?: string | null
          bu_category?: string | null
          created_at?: string
          deal_date?: string | null
          description?: string | null
          feedback_notes?: string | null
          financials?: string | null
          folder_link?: string | null
          followers?: string | null
          funding_amount?: string | null
          funding_round?: string | null
          hq_location?: string | null
          id?: string
          key_contacts?: string | null
          leads?: string | null
          logo_url?: string | null
          pre_investors?: string | null
          project_name: string
          sector?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          valuation_terms?: string | null
        }
        Update: {
          benchmark_companies?: string | null
          bu_category?: string | null
          created_at?: string
          deal_date?: string | null
          description?: string | null
          feedback_notes?: string | null
          financials?: string | null
          folder_link?: string | null
          followers?: string | null
          funding_amount?: string | null
          funding_round?: string | null
          hq_location?: string | null
          id?: string
          key_contacts?: string | null
          leads?: string | null
          logo_url?: string | null
          pre_investors?: string | null
          project_name?: string
          sector?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          valuation_terms?: string | null
        }
        Relationships: []
      }
      industries: {
        Row: {
          created_at: string
          display_order: number
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          contact_id: string
          created_at: string
          deal_id: string | null
          id: string
          interaction_date: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          deal_id?: string | null
          id?: string
          interaction_date?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          deal_id?: string | null
          id?: string
          interaction_date?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          identity: string | null
          notion_api_key: string | null
          onboarding_completed: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          identity?: string | null
          notion_api_key?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          identity?: string | null
          notion_api_key?: string | null
          onboarding_completed?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      research_items: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          published_at: string | null
          source_id: string
          summary: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          published_at?: string | null
          source_id: string
          summary?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          published_at?: string | null
          source_id?: string
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_items_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "research_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      research_sources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          display_order: number
          favicon_url: string | null
          feed_url: string | null
          id: string
          last_checked_at: string | null
          last_content_hash: string | null
          logo_url: string | null
          name: string
          priority: number | null
          source_type: string
          tags: string[] | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          favicon_url?: string | null
          feed_url?: string | null
          id?: string
          last_checked_at?: string | null
          last_content_hash?: string | null
          logo_url?: string | null
          name: string
          priority?: number | null
          source_type?: string
          tags?: string[] | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          display_order?: number
          favicon_url?: string | null
          feed_url?: string | null
          id?: string
          last_checked_at?: string | null
          last_content_hash?: string | null
          logo_url?: string | null
          name?: string
          priority?: number | null
          source_type?: string
          tags?: string[] | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      research_summary_history: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          item_count: number
          preview: string | null
          priority_counts: Json | null
          source_count: number
          source_ids: string[] | null
          summary: string
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          item_count?: number
          preview?: string | null
          priority_counts?: Json | null
          source_count?: number
          source_ids?: string[] | null
          summary: string
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          item_count?: number
          preview?: string | null
          priority_counts?: Json | null
          source_count?: number
          source_ids?: string[] | null
          summary?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      stock_discussions: {
        Row: {
          content: string
          created_at: string
          id: string
          industry_id: string | null
          parent_id: string | null
          stock_symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          industry_id?: string | null
          parent_id?: string | null
          stock_symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          industry_id?: string | null
          parent_id?: string | null
          stock_symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_discussions_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "stock_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_explanations: {
        Row: {
          change_percent: number
          created_at: string
          date: string
          explanation: string
          id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          change_percent: number
          created_at?: string
          date: string
          explanation: string
          id?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          change_percent?: number
          created_at?: string
          date?: string
          explanation?: string
          id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_groups: {
        Row: {
          created_at: string
          display_order: number
          id: string
          index_symbol: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          index_symbol?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          index_symbol?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_notes: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note: string
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_price_cache: {
        Row: {
          cached_at: string
          change_amount: number
          change_percent: number
          company_name: string | null
          current_price: number
          date: string
          id: string
          previous_close: number
          symbol: string
          updated_at: string
        }
        Insert: {
          cached_at?: string
          change_amount: number
          change_percent: number
          company_name?: string | null
          current_price: number
          date: string
          id?: string
          previous_close: number
          symbol: string
          updated_at?: string
        }
        Update: {
          cached_at?: string
          change_amount?: number
          change_percent?: number
          company_name?: string | null
          current_price?: number
          date?: string
          id?: string
          previous_close?: number
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      stocks: {
        Row: {
          created_at: string
          display_order: number
          group_id: string
          id: string
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_id: string
          id?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_id?: string
          id?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stocks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "stock_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      weekly_additional_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          updated_at: string
          week_end_date: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          week_end_date: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          week_end_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
