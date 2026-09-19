// Generated from the Supabase project (marathon-training-app, vekgulejexranhdhecdp)
// after migrations 0005/0006. Regenerate with:
//   npx supabase gen types typescript --project-id vekgulejexranhdhecdp > src/lib/database.types.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' };
  public: {
    Tables: {
      activities: {
        Row: {
          avg_hr: number | null; avg_pace_sec_per_mi: number | null; distance_m: number | null; ended_at: string;
          hr_zones: Json | null; id: string; matched_session_id: string | null; max_hr: number | null;
          moving_sec: number | null; payload: Json; sport: string; started_at: string; strain: number | null;
          strava_id: number | null; user_id: string; whoop_id: string | null;
        };
        Insert: {
          avg_hr?: number | null; avg_pace_sec_per_mi?: number | null; distance_m?: number | null; ended_at: string;
          hr_zones?: Json | null; id?: string; matched_session_id?: string | null; max_hr?: number | null;
          moving_sec?: number | null; payload?: Json; sport: string; started_at: string; strain?: number | null;
          strava_id?: number | null; user_id: string; whoop_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
        Relationships: [];
      };
      blocks: {
        Row: { id: string; label: string; payload: Json; periodization: Json; phase: string; total_weeks: number; user_id: string; week: number };
        Insert: { id: string; label: string; payload?: Json; periodization: Json; phase: string; total_weeks: number; user_id: string; week: number };
        Update: Partial<Database['public']['Tables']['blocks']['Insert']>;
        Relationships: [];
      };
      chat_messages: {
        Row: { body: string; id: string; payload: Json; proposal_refs: Json | null; role: string; seq: number; time_label: string | null; user_id: string };
        Insert: { body: string; id: string; payload?: Json; proposal_refs?: Json | null; role: string; seq: number; time_label?: string | null; user_id: string };
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
        Relationships: [];
      };
      daily_targets: {
        Row: {
          carbs_g: number; computed_at: string; day: string; engine_version: string; fat_g: number; kcal: number;
          payload: Json; protein_g: number; reason: string | null; session_id: string | null; sodium_mg: number | null; user_id: string;
        };
        Insert: {
          carbs_g: number; computed_at?: string; day: string; engine_version?: string; fat_g: number; kcal: number;
          payload?: Json; protein_g: number; reason?: string | null; session_id?: string | null; sodium_mg?: number | null; user_id: string;
        };
        Update: Partial<Database['public']['Tables']['daily_targets']['Insert']>;
        Relationships: [];
      };
      goals: {
        Row: { date: string; id: string; name: string; payload: Json; target_seconds: number; user_id: string };
        Insert: { date: string; id: string; name: string; payload?: Json; target_seconds: number; user_id: string };
        Update: Partial<Database['public']['Tables']['goals']['Insert']>;
        Relationships: [];
      };
      hydration_logs: {
        Row: { day: string; id: string; logged_at: string; ml: number; user_id: string };
        Insert: { day?: string; id?: string; logged_at?: string; ml: number; user_id: string };
        Update: Partial<Database['public']['Tables']['hydration_logs']['Insert']>;
        Relationships: [];
      };
      integration_tokens: {
        Row: { athlete_ref: string | null; ciphertext: string; expires_at: string | null; iv: string; provider: string; tag: string; updated_at: string; user_id: string };
        Insert: { athlete_ref?: string | null; ciphertext: string; expires_at?: string | null; iv: string; provider: string; tag: string; updated_at?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['integration_tokens']['Insert']>;
        Relationships: [];
      };
      meals: {
        Row: {
          carbs_g: number; day: string; description: string; eaten_at: string; fat_g: number; id: string; kcal: number;
          kind: string; payload: Json; protein_g: number; slot: string; sodium_mg: number | null; source: string; user_id: string;
        };
        Insert: {
          carbs_g?: number; day?: string; description: string; eaten_at?: string; fat_g?: number; id?: string; kcal: number;
          kind?: string; payload?: Json; protein_g?: number; slot: string; sodium_mg?: number | null; source?: string; user_id: string;
        };
        Update: Partial<Database['public']['Tables']['meals']['Insert']>;
        Relationships: [];
      };
      pain_areas: {
        Row: { id: string; name: string; payload: Json; severity: number; trend: string; user_id: string };
        Insert: { id: string; name: string; payload: Json; severity: number; trend: string; user_id: string };
        Update: Partial<Database['public']['Tables']['pain_areas']['Insert']>;
        Relationships: [];
      };
      pain_logs: {
        Row: { area_id: string; id: string; logged_at: string; note: string | null; severity: number; user_id: string };
        Insert: { area_id: string; id?: string; logged_at?: string; note?: string | null; severity: number; user_id: string };
        Update: Partial<Database['public']['Tables']['pain_logs']['Insert']>;
        Relationships: [];
      };
      planned_sessions: {
        Row: { date: string; detail: string | null; id: string; payload: Json; provenance: string; status: string; structure: Json; title: string; type: string; user_id: string };
        Insert: { date: string; detail?: string | null; id: string; payload: Json; provenance?: string; status?: string; structure?: Json; title: string; type: string; user_id: string };
        Update: Partial<Database['public']['Tables']['planned_sessions']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          age: number | null; created_at: string; diet: string | null; display_name: string | null; email: string;
          height_in: number | null; home_timezone: string; id: string; onboarded_at: string | null;
          run_days_per_week: number | null; sex: string | null; updated_at: string; weight_lb: number | null;
        };
        Insert: {
          age?: number | null; created_at?: string; diet?: string | null; display_name?: string | null; email: string;
          height_in?: number | null; home_timezone?: string; id: string; onboarded_at?: string | null;
          run_days_per_week?: number | null; sex?: string | null; updated_at?: string; weight_lb?: number | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      proposals: {
        Row: { decided_at: string | null; id: string; payload: Json; scope: string; session_id: string; status: string; user_id: string };
        Insert: { decided_at?: string | null; id: string; payload: Json; scope: string; session_id: string; status?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['proposals']['Insert']>;
        Relationships: [];
      };
      recovery_snapshots: {
        Row: { day: string; day_strain: number | null; hrv_ms: number | null; payload: Json; recovery_pct: number | null; rhr: number | null; sleep: Json | null; source: string; synced_at: string; user_id: string };
        Insert: { day: string; day_strain?: number | null; hrv_ms?: number | null; payload?: Json; recovery_pct?: number | null; rhr?: number | null; sleep?: Json | null; source?: string; synced_at?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['recovery_snapshots']['Insert']>;
        Relationships: [];
      };
      run_logs: {
        Row: { activity_id: string | null; id: string; logged_at: string; pain: Json | null; rpe: number; session_id: string | null; user_id: string };
        Insert: { activity_id?: string | null; id?: string; logged_at?: string; pain?: Json | null; rpe: number; session_id?: string | null; user_id: string };
        Update: Partial<Database['public']['Tables']['run_logs']['Insert']>;
        Relationships: [];
      };
      supplement_logs: {
        Row: { day: string; dose: string | null; name: string; taken_at: string; user_id: string };
        Insert: { day?: string; dose?: string | null; name: string; taken_at?: string; user_id: string };
        Update: Partial<Database['public']['Tables']['supplement_logs']['Insert']>;
        Relationships: [];
      };
      sync_runs: {
        Row: { detail: string | null; id: string; items: number; ok: boolean; ran_at: string; source: string; user_id: string };
        Insert: { detail?: string | null; id?: string; items?: number; ok: boolean; ran_at?: string; source: string; user_id: string };
        Update: Partial<Database['public']['Tables']['sync_runs']['Insert']>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      connected_providers: { Args: Record<string, never>; Returns: string[] };
      decide_proposal: { Args: { p_decision: string; p_id: string; p_modified?: Json }; Returns: undefined };
      nutrition_day: { Args: { p_day?: string }; Returns: Json };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
