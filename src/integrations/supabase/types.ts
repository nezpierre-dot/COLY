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
      conversations: {
        Row: {
          created_at: string
          demandeur_id: string
          id: string
          last_message_at: string
          shipment_id: string
          voyageur_id: string
        }
        Insert: {
          created_at?: string
          demandeur_id: string
          id?: string
          last_message_at?: string
          shipment_id: string
          voyageur_id: string
        }
        Update: {
          created_at?: string
          demandeur_id?: string
          id?: string
          last_message_at?: string
          shipment_id?: string
          voyageur_id?: string
        }
        Relationships: []
      }
      delivery_proofs: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          photo_url: string
          shipment_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url: string
          shipment_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          photo_url?: string
          shipment_id?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      needit_missions: {
        Row: {
          category_path: string[]
          city: string | null
          country: string
          created_at: string
          dimension: string | null
          id: string
          is_unlisted: boolean
          photo_url: string | null
          poids: string | null
          prix_max: string | null
          product_name: string | null
          status: string
          timing: string
          unlisted_description: string | null
          updated_at: string
          user_id: string
          voyageur_id: string | null
        }
        Insert: {
          category_path?: string[]
          city?: string | null
          country: string
          created_at?: string
          dimension?: string | null
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          poids?: string | null
          prix_max?: string | null
          product_name?: string | null
          status?: string
          timing?: string
          unlisted_description?: string | null
          updated_at?: string
          user_id: string
          voyageur_id?: string | null
        }
        Update: {
          category_path?: string[]
          city?: string | null
          country?: string
          created_at?: string
          dimension?: string | null
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          poids?: string | null
          prix_max?: string | null
          product_name?: string | null
          status?: string
          timing?: string
          unlisted_description?: string | null
          updated_at?: string
          user_id?: string
          voyageur_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          kyc_status: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          rated_id: string
          rater_id: string
          rater_role: string
          score: number
          shipment_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id: string
          rater_id: string
          rater_role: string
          score: number
          shipment_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          rated_id?: string
          rater_id?: string
          rater_role?: string
          score?: number
          shipment_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          arrival_city: string
          arrival_country: string
          contact_email: string | null
          contact_nom: string
          contact_prenom: string
          contact_tel: string
          created_at: string
          departure_city: string | null
          departure_date: string
          departure_method: string
          id: string
          insured: boolean
          is_international: boolean
          photo_url: string | null
          relay_point: string | null
          size: string
          status: string
          tarif: string
          updated_at: string
          user_id: string
          voyageur_id: string | null
        }
        Insert: {
          arrival_city: string
          arrival_country: string
          contact_email?: string | null
          contact_nom: string
          contact_prenom: string
          contact_tel: string
          created_at?: string
          departure_city?: string | null
          departure_date: string
          departure_method: string
          id?: string
          insured?: boolean
          is_international?: boolean
          photo_url?: string | null
          relay_point?: string | null
          size?: string
          status?: string
          tarif: string
          updated_at?: string
          user_id: string
          voyageur_id?: string | null
        }
        Update: {
          arrival_city?: string
          arrival_country?: string
          contact_email?: string | null
          contact_nom?: string
          contact_prenom?: string
          contact_tel?: string
          created_at?: string
          departure_city?: string | null
          departure_date?: string
          departure_method?: string
          id?: string
          insured?: boolean
          is_international?: boolean
          photo_url?: string | null
          relay_point?: string | null
          size?: string
          status?: string
          tarif?: string
          updated_at?: string
          user_id?: string
          voyageur_id?: string | null
        }
        Relationships: []
      }
      tracking_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          shipment_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          shipment_id: string
          status: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          shipment_id?: string
          status?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      voyages: {
        Row: {
          accept_needit: boolean
          arrival_address: string | null
          arrival_city: string
          arrival_country: string
          arrival_date: string | null
          arrival_time: string | null
          can_move: boolean
          can_pickup: boolean
          created_at: string
          deliver_to_address: boolean
          departure_address: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          departure_time: string | null
          id: string
          needit_budget: string | null
          status: string
          transport_method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accept_needit?: boolean
          arrival_address?: string | null
          arrival_city: string
          arrival_country: string
          arrival_date?: string | null
          arrival_time?: string | null
          can_move?: boolean
          can_pickup?: boolean
          created_at?: string
          deliver_to_address?: boolean
          departure_address?: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          departure_time?: string | null
          id?: string
          needit_budget?: string | null
          status?: string
          transport_method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accept_needit?: boolean
          arrival_address?: string | null
          arrival_city?: string
          arrival_country?: string
          arrival_date?: string | null
          arrival_time?: string | null
          can_move?: boolean
          can_pickup?: boolean
          created_at?: string
          deliver_to_address?: boolean
          departure_address?: string | null
          departure_city?: string
          departure_country?: string
          departure_date?: string
          departure_time?: string | null
          id?: string
          needit_budget?: string | null
          status?: string
          transport_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_needit_mission: { Args: { _mission_id: string }; Returns: string }
      accept_shipment: { Args: { _shipment_id: string }; Returns: string }
      admin_get_recent_shipments: {
        Args: { _limit?: number }
        Returns: {
          arrival_city: string
          arrival_country: string
          created_at: string
          departure_city: string
          id: string
          insured: boolean
          ref_number: string
          size: string
          status: string
          tarif: string
        }[]
      }
      admin_get_shipments_over_time: {
        Args: never
        Returns: {
          count: number
          day: string
        }[]
      }
      admin_get_users_over_time: {
        Args: never
        Returns: {
          count: number
          day: string
        }[]
      }
      admin_list_users: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          created_at: string
          full_name: string
          kyc_status: string
          role: string
          user_ref: string
        }[]
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_pending_needit_missions: {
        Args: never
        Returns: {
          category_path: string[]
          city: string
          country: string
          created_at: string
          dimension: string
          id: string
          is_unlisted: boolean
          photo_url: string
          poids: string
          prix_max: string
          product_name: string
          ref_number: string
          status: string
          timing: string
          unlisted_description: string
        }[]
      }
      get_pending_shipments: {
        Args: never
        Returns: {
          arrival_city: string
          arrival_country: string
          created_at: string
          departure_city: string
          departure_date: string
          departure_method: string
          id: string
          insured: boolean
          is_international: boolean
          photo_url: string
          ref_number: string
          size: string
          status: string
          tarif: string
        }[]
      }
      get_public_pending_missions: {
        Args: never
        Returns: {
          arrival_city: string
          arrival_country: string
          departure_city: string
          departure_country: string
          id: string
          type: string
        }[]
      }
      get_user_rating: {
        Args: { _user_id: string }
        Returns: {
          average_score: number
          total_ratings: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_user_role: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role: "demandeur" | "voyageur" | "admin"
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
      app_role: ["demandeur", "voyageur", "admin"],
    },
  },
} as const
