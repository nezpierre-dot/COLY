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
          is_archived_by: string[]
          last_message_at: string
          shipment_id: string
          voyageur_id: string
        }
        Insert: {
          created_at?: string
          demandeur_id: string
          id?: string
          is_archived_by?: string[]
          last_message_at?: string
          shipment_id: string
          voyageur_id: string
        }
        Update: {
          created_at?: string
          demandeur_id?: string
          id?: string
          is_archived_by?: string[]
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
      dispute_messages: {
        Row: {
          content: string
          created_at: string
          dispute_id: string
          id: string
          photo_url: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          content: string
          created_at?: string
          dispute_id: string
          id?: string
          photo_url?: string | null
          sender_id: string
          sender_role?: string
        }
        Update: {
          content?: string
          created_at?: string
          dispute_id?: string
          id?: string
          photo_url?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_ratings: {
        Row: {
          comment: string | null
          created_at: string
          dispute_id: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_ratings_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          photo_url: string | null
          reason: string
          resolution: string | null
          resolved_by: string | null
          shipment_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          reason: string
          resolution?: string | null
          resolved_by?: string | null
          shipment_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          photo_url?: string | null
          reason?: string
          resolution?: string | null
          resolved_by?: string | null
          shipment_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ean_products: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          ean_code: string
          id: string
          image_url: string | null
          product_name: string | null
          source: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          ean_code: string
          id?: string
          image_url?: string | null
          product_name?: string | null
          source?: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          ean_code?: string
          id?: string
          image_url?: string | null
          product_name?: string | null
          source?: string
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      favorite_products: {
        Row: {
          category_path: string[]
          city: string | null
          country: string
          created_at: string
          dimension: string | null
          ean_code: string | null
          id: string
          is_unlisted: boolean
          photo_url: string | null
          poids: string | null
          prix_max: string | null
          product_name: string
          unlisted_description: string | null
          user_id: string
        }
        Insert: {
          category_path?: string[]
          city?: string | null
          country: string
          created_at?: string
          dimension?: string | null
          ean_code?: string | null
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          poids?: string | null
          prix_max?: string | null
          product_name: string
          unlisted_description?: string | null
          user_id: string
        }
        Update: {
          category_path?: string[]
          city?: string | null
          country?: string
          created_at?: string
          dimension?: string | null
          ean_code?: string | null
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          poids?: string | null
          prix_max?: string | null
          product_name?: string
          unlisted_description?: string | null
          user_id?: string
        }
        Relationships: []
      }
      favorite_routes: {
        Row: {
          created_at: string
          from_city: string
          id: string
          to_city: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_city: string
          id?: string
          to_city: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_city?: string
          id?: string
          to_city?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_checks: {
        Row: {
          confidence: number | null
          created_at: string
          details: string | null
          id: string
          photo_url: string
          result: string
          shipment_id: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          details?: string | null
          id?: string
          photo_url: string
          result?: string
          shipment_id: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          details?: string | null
          id?: string
          photo_url?: string
          result?: string
          shipment_id?: string
          user_id?: string
        }
        Relationships: []
      }
      live_locations: {
        Row: {
          created_at: string
          id: string
          is_sharing: boolean
          latitude: number
          longitude: number
          shipment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sharing?: boolean
          latitude: number
          longitude: number
          shipment_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sharing?: boolean
          latitude?: number
          longitude?: number
          shipment_id?: string
          updated_at?: string
          user_id?: string
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
          auto_accept: boolean
          category_path: string[]
          city: string | null
          confirmation_code: string | null
          country: string
          created_at: string
          dimension: string | null
          ean_code: string | null
          ean_verified: boolean
          id: string
          is_unlisted: boolean
          photo_url: string | null
          pickup_access_code: string | null
          pickup_address: string | null
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
          auto_accept?: boolean
          category_path?: string[]
          city?: string | null
          confirmation_code?: string | null
          country: string
          created_at?: string
          dimension?: string | null
          ean_code?: string | null
          ean_verified?: boolean
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          pickup_access_code?: string | null
          pickup_address?: string | null
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
          auto_accept?: boolean
          category_path?: string[]
          city?: string | null
          confirmation_code?: string | null
          country?: string
          created_at?: string
          dimension?: string | null
          ean_code?: string | null
          ean_verified?: boolean
          id?: string
          is_unlisted?: boolean
          photo_url?: string | null
          pickup_access_code?: string | null
          pickup_address?: string | null
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
      pickup_proofs: {
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
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          kyc_status: string
          phone: string | null
          preferred_transports: string[] | null
          referral_code: string | null
          referred_by: string | null
          stripe_customer_id: string | null
          trust_badges: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: string
          phone?: string | null
          preferred_transports?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          trust_badges?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: string
          phone?: string | null
          preferred_transports?: string[] | null
          referral_code?: string | null
          referred_by?: string | null
          stripe_customer_id?: string | null
          trust_badges?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rating_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          rating_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          rating_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          rating_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_replies_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: true
            referencedRelation: "ratings"
            referencedColumns: ["id"]
          },
        ]
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
      referrals: {
        Row: {
          bonus_amount: number
          created_at: string
          id: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          bonus_amount?: number
          created_at?: string
          id?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          body: string
          created_at: string
          delay_label: string
          id: string
          item_id: string
          item_type: string
          remind_at: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          delay_label: string
          id?: string
          item_id: string
          item_type: string
          remind_at: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          delay_label?: string
          id?: string
          item_id?: string
          item_type?: string
          remind_at?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipments: {
        Row: {
          arrival_city: string
          arrival_country: string
          confirmation_code: string | null
          contact_email: string | null
          contact_nom: string
          contact_prenom: string
          contact_tel: string
          created_at: string
          departure_city: string | null
          departure_date: string
          departure_method: string
          escrow_expires_at: string | null
          escrow_status: string
          id: string
          insured: boolean
          is_international: boolean
          photo_url: string | null
          pickup_access_code: string | null
          pickup_address: string | null
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
          confirmation_code?: string | null
          contact_email?: string | null
          contact_nom: string
          contact_prenom: string
          contact_tel: string
          created_at?: string
          departure_city?: string | null
          departure_date: string
          departure_method: string
          escrow_expires_at?: string | null
          escrow_status?: string
          id?: string
          insured?: boolean
          is_international?: boolean
          photo_url?: string | null
          pickup_access_code?: string | null
          pickup_address?: string | null
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
          confirmation_code?: string | null
          contact_email?: string | null
          contact_nom?: string
          contact_prenom?: string
          contact_tel?: string
          created_at?: string
          departure_city?: string | null
          departure_date?: string
          departure_method?: string
          escrow_expires_at?: string | null
          escrow_status?: string
          id?: string
          insured?: boolean
          is_international?: boolean
          photo_url?: string | null
          pickup_access_code?: string | null
          pickup_address?: string | null
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
      support_tickets: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          replied_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
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
          capacity_dimensions: string | null
          capacity_volume_liters: number | null
          created_at: string
          cutoff_hours: number
          deliver_to_address: boolean
          departure_address: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          departure_time: string | null
          id: string
          max_items: number | null
          max_weight_kg: number | null
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
          capacity_dimensions?: string | null
          capacity_volume_liters?: number | null
          created_at?: string
          cutoff_hours?: number
          deliver_to_address?: boolean
          departure_address?: string | null
          departure_city: string
          departure_country: string
          departure_date: string
          departure_time?: string | null
          id?: string
          max_items?: number | null
          max_weight_kg?: number | null
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
          capacity_dimensions?: string | null
          capacity_volume_liters?: number | null
          created_at?: string
          cutoff_hours?: number
          deliver_to_address?: boolean
          departure_address?: string | null
          departure_city?: string
          departure_country?: string
          departure_date?: string
          departure_time?: string | null
          id?: string
          max_items?: number | null
          max_weight_kg?: number | null
          needit_budget?: string | null
          status?: string
          transport_method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      voyageur_availability: {
        Row: {
          available_date: string
          city: string | null
          country: string | null
          created_at: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          available_date: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          available_date?: string
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          type: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          type?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
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
      admin_get_dispute_stats: { Args: never; Returns: Json }
      admin_get_disputes: {
        Args: { _limit?: number }
        Returns: {
          created_at: string
          description: string
          id: string
          photo_url: string
          reason: string
          reporter_name: string
          resolution: string
          shipment_id: string
          shipment_ref: string
          status: string
          user_id: string
        }[]
      }
      admin_get_fraud_checks: {
        Args: { _limit?: number }
        Returns: {
          confidence: number
          created_at: string
          details: string
          id: string
          photo_url: string
          reporter_name: string
          result: string
          shipment_id: string
          shipment_ref: string
          user_id: string
        }[]
      }
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
      admin_get_support_tickets: {
        Args: { _limit?: number }
        Returns: {
          admin_reply: string
          category: string
          created_at: string
          id: string
          message: string
          replied_at: string
          reporter_email: string
          reporter_name: string
          status: string
          subject: string
          updated_at: string
          user_id: string
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
      compute_trust_badges: { Args: { _user_id: string }; Returns: string[] }
      count_voyageurs_for_destination: {
        Args: { _city?: string; _country: string }
        Returns: number
      }
      generate_confirmation_code: {
        Args: { _item_id: string; _item_type: string }
        Returns: string
      }
      get_admin_stats: { Args: never; Returns: Json }
      get_matching_voyageurs: {
        Args: {
          _departure_date?: string
          _destination_city?: string
          _destination_country: string
          _limit?: number
          _max_weight_kg?: number
        }
        Returns: {
          arrival_city: string
          arrival_country: string
          avatar_url: string
          average_score: number
          departure_city: string
          departure_country: string
          departure_date: string
          full_name: string
          max_items: number
          max_weight_kg: number
          total_ratings: number
          transport_method: string
          voyage_id: string
          voyageur_id: string
        }[]
      }
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
      validate_confirmation_code: {
        Args: { _code: string; _item_id: string; _item_type: string }
        Returns: boolean
      }
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
