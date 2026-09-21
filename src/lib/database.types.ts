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
      activities: {
        Row: {
          avg_hr: number | null
          avg_pace_sec_per_mi: number | null
          distance_m: number | null
          ended_at: string
          hr_zones: Json | null
          id: string
          matched_session_id: string | null
          max_hr: number | null
          moving_sec: number | null
          payload: Json
          sport: string
          started_at: string
          strain: number | null
          strava_id: number | null
          user_id: string
          whoop_id: string | null
        }
        Insert: {
          avg_hr?: number | null
          avg_pace_sec_per_mi?: number | null
          distance_m?: number | null
          ended_at: string
          hr_zones?: Json | null
          id?: string
          matched_session_id?: string | null
          max_hr?: number | null
          moving_sec?: number | null
          payload?: Json
          sport: string
          started_at: string
          strain?: number | null
          strava_id?: number | null
          user_id: string
          whoop_id?: string | null
        }
        Update: {
          avg_hr?: number | null
          avg_pace_sec_per_mi?: number | null
          distance_m?: number | null
          ended_at?: string
          hr_zones?: Json | null
          id?: string
          matched_session_id?: string | null
          max_hr?: number | null
          moving_sec?: number | null
          payload?: Json
          sport?: string
          started_at?: string
          strain?: number | null
          strava_id?: number | null
          user_id?: string
          whoop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          id: string
          label: string
          payload: Json
          periodization: Json
          phase: string
          total_weeks: number
          user_id: string
          week: number
        }
        Insert: {
          id: string
          label: string
          payload?: Json
          periodization: Json
          phase: string
          total_weeks: number
          user_id: string
          week: number
        }
        Update: {
          id?: string
          label?: string
          payload?: Json
          periodization?: Json
          phase?: string
          total_weeks?: number
          user_id?: string
          week?: number
        }
        Relationships: [
          {
            foreignKeyName: "blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          id: string
          payload: Json
          proposal_refs: Json | null
          role: string
          seq: number
          time_label: string | null
          user_id: string
        }
        Insert: {
          body: string
          id: string
          payload?: Json
          proposal_refs?: Json | null
          role: string
          seq: number
          time_label?: string | null
          user_id: string
        }
        Update: {
          body?: string
          id?: string
          payload?: Json
          proposal_refs?: Json | null
          role?: string
          seq?: number
          time_label?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_targets: {
        Row: {
          carbs_g: number
          computed_at: string
          day: string
          engine_version: string
          fat_g: number
          kcal: number
          payload: Json
          protein_g: number
          reason: string | null
          session_id: string | null
          sodium_mg: number | null
          user_id: string
        }
        Insert: {
          carbs_g: number
          computed_at?: string
          day: string
          engine_version?: string
          fat_g: number
          kcal: number
          payload?: Json
          protein_g: number
          reason?: string | null
          session_id?: string | null
          sodium_mg?: number | null
          user_id: string
        }
        Update: {
          carbs_g?: number
          computed_at?: string
          day?: string
          engine_version?: string
          fat_g?: number
          kcal?: number
          payload?: Json
          protein_g?: number
          reason?: string | null
          session_id?: string | null
          sodium_mg?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          date: string
          id: string
          mode: string
          name: string
          payload: Json
          target_seconds: number
          user_id: string
        }
        Insert: {
          date: string
          id: string
          mode?: string
          name: string
          payload?: Json
          target_seconds: number
          user_id: string
        }
        Update: {
          date?: string
          id?: string
          mode?: string
          name?: string
          payload?: Json
          target_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hydration_logs: {
        Row: {
          day: string
          id: string
          logged_at: string
          ml: number
          user_id: string
        }
        Insert: {
          day?: string
          id?: string
          logged_at?: string
          ml: number
          user_id: string
        }
        Update: {
          day?: string
          id?: string
          logged_at?: string
          ml?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hydration_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_tokens: {
        Row: {
          athlete_ref: string | null
          ciphertext: string
          expires_at: string | null
          iv: string
          provider: string
          tag: string
          updated_at: string
          user_id: string
        }
        Insert: {
          athlete_ref?: string | null
          ciphertext: string
          expires_at?: string | null
          iv: string
          provider: string
          tag: string
          updated_at?: string
          user_id: string
        }
        Update: {
          athlete_ref?: string | null
          ciphertext?: string
          expires_at?: string | null
          iv?: string
          provider?: string
          tag?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          carbs_g: number
          day: string
          description: string
          eaten_at: string
          fat_g: number
          id: string
          kcal: number
          kind: string
          payload: Json
          protein_g: number
          slot: string
          sodium_mg: number | null
          source: string
          user_id: string
        }
        Insert: {
          carbs_g?: number
          day?: string
          description: string
          eaten_at?: string
          fat_g?: number
          id?: string
          kcal: number
          kind?: string
          payload?: Json
          protein_g?: number
          slot: string
          sodium_mg?: number | null
          source?: string
          user_id: string
        }
        Update: {
          carbs_g?: number
          day?: string
          description?: string
          eaten_at?: string
          fat_g?: number
          id?: string
          kcal?: number
          kind?: string
          payload?: Json
          protein_g?: number
          slot?: string
          sodium_mg?: number | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_areas: {
        Row: {
          id: string
          name: string
          payload: Json
          severity: number
          trend: string
          user_id: string
        }
        Insert: {
          id: string
          name: string
          payload: Json
          severity: number
          trend: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          payload?: Json
          severity?: number
          trend?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_areas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pain_logs: {
        Row: {
          area_id: string
          id: string
          logged_at: string
          note: string | null
          severity: number
          user_id: string
        }
        Insert: {
          area_id: string
          id?: string
          logged_at?: string
          note?: string | null
          severity: number
          user_id: string
        }
        Update: {
          area_id?: string
          id?: string
          logged_at?: string
          note?: string | null
          severity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pain_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_sessions: {
        Row: {
          date: string
          detail: string | null
          id: string
          payload: Json
          provenance: string
          status: string
          structure: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          date: string
          detail?: string | null
          id: string
          payload: Json
          provenance?: string
          status?: string
          structure?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          date?: string
          detail?: string | null
          id?: string
          payload?: Json
          provenance?: string
          status?: string
          structure?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          created_at: string
          diet: string | null
          display_name: string | null
          email: string
          height_in: number | null
          home_timezone: string
          id: string
          level: string | null
          max_hr: number | null
          notes: string | null
          onboarded_at: string | null
          recent_race: Json | null
          resting_hr: number | null
          run_days_per_week: number | null
          sex: string | null
          updated_at: string
          weight_lb: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          diet?: string | null
          display_name?: string | null
          email: string
          height_in?: number | null
          home_timezone?: string
          id: string
          level?: string | null
          max_hr?: number | null
          notes?: string | null
          onboarded_at?: string | null
          recent_race?: Json | null
          resting_hr?: number | null
          run_days_per_week?: number | null
          sex?: string | null
          updated_at?: string
          weight_lb?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          diet?: string | null
          display_name?: string | null
          email?: string
          height_in?: number | null
          home_timezone?: string
          id?: string
          level?: string | null
          max_hr?: number | null
          notes?: string | null
          onboarded_at?: string | null
          recent_race?: Json | null
          resting_hr?: number | null
          run_days_per_week?: number | null
          sex?: string | null
          updated_at?: string
          weight_lb?: number | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          decided_at: string | null
          id: string
          payload: Json
          scope: string
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          id: string
          payload: Json
          scope: string
          session_id: string
          status?: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          id?: string
          payload?: Json
          scope?: string
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_snapshots: {
        Row: {
          day: string
          day_strain: number | null
          hrv_ms: number | null
          payload: Json
          recovery_pct: number | null
          rhr: number | null
          sleep: Json | null
          source: string
          synced_at: string
          user_id: string
        }
        Insert: {
          day: string
          day_strain?: number | null
          hrv_ms?: number | null
          payload?: Json
          recovery_pct?: number | null
          rhr?: number | null
          sleep?: Json | null
          source?: string
          synced_at?: string
          user_id: string
        }
        Update: {
          day?: string
          day_strain?: number | null
          hrv_ms?: number | null
          payload?: Json
          recovery_pct?: number | null
          rhr?: number | null
          sleep?: Json | null
          source?: string
          synced_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_snapshots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      run_logs: {
        Row: {
          activity_id: string | null
          id: string
          logged_at: string
          pain: Json | null
          rpe: number
          session_id: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          id?: string
          logged_at?: string
          pain?: Json | null
          rpe: number
          session_id?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string | null
          id?: string
          logged_at?: string
          pain?: Json | null
          rpe?: number
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_logs_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supplement_logs: {
        Row: {
          day: string
          dose: string | null
          name: string
          taken_at: string
          user_id: string
        }
        Insert: {
          day?: string
          dose?: string | null
          name: string
          taken_at?: string
          user_id: string
        }
        Update: {
          day?: string
          dose?: string | null
          name?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          detail: string | null
          id: string
          items: number
          ok: boolean
          ran_at: string
          source: string
          user_id: string
        }
        Insert: {
          detail?: string | null
          id?: string
          items?: number
          ok: boolean
          ran_at?: string
          source: string
          user_id: string
        }
        Update: {
          detail?: string | null
          id?: string
          items?: number
          ok?: boolean
          ran_at?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      connected_providers: { Args: never; Returns: string[] }
      decide_proposal: {
        Args: { p_decision: string; p_id: string; p_modified?: Json }
        Returns: undefined
      }
      nutrition_day: { Args: { p_day?: string }; Returns: Json }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
