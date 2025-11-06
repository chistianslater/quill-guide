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
      competencies: {
        Row: {
          competency_domain: string
          created_at: string
          description: string
          federal_state: string | null
          grade_level: number
          id: string
          is_mandatory: boolean
          requirement_level: string
          subject: string
          title: string
        }
        Insert: {
          competency_domain: string
          created_at?: string
          description: string
          federal_state?: string | null
          grade_level: number
          id?: string
          is_mandatory?: boolean
          requirement_level: string
          subject: string
          title: string
        }
        Update: {
          competency_domain?: string
          created_at?: string
          description?: string
          federal_state?: string | null
          grade_level?: number
          id?: string
          is_mandatory?: boolean
          requirement_level?: string
          subject?: string
          title?: string
        }
        Relationships: []
      }
      competency_progress: {
        Row: {
          competency_id: string
          confidence_level: number
          created_at: string
          estimated_level: number | null
          id: string
          is_priority: boolean | null
          last_practiced_at: string | null
          last_struggle_at: string | null
          metadata: Json | null
          priority: number | null
          status: string
          struggles_count: number | null
          updated_at: string
          user_id: string
          weakness_indicators: Json | null
        }
        Insert: {
          competency_id: string
          confidence_level?: number
          created_at?: string
          estimated_level?: number | null
          id?: string
          is_priority?: boolean | null
          last_practiced_at?: string | null
          last_struggle_at?: string | null
          metadata?: Json | null
          priority?: number | null
          status?: string
          struggles_count?: number | null
          updated_at?: string
          user_id: string
          weakness_indicators?: Json | null
        }
        Update: {
          competency_id?: string
          confidence_level?: number
          created_at?: string
          estimated_level?: number | null
          id?: string
          is_priority?: boolean | null
          last_practiced_at?: string | null
          last_struggle_at?: string | null
          metadata?: Json | null
          priority?: number | null
          status?: string
          struggles_count?: number | null
          updated_at?: string
          user_id?: string
          weakness_indicators?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_progress_competency_id_fkey"
            columns: ["competency_id"]
            isOneToOne: false
            referencedRelation: "competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_sessions: {
        Row: {
          ended_at: string | null
          engagement_level: string | null
          id: string
          metadata: Json | null
          started_at: string
          topics_covered: string[] | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          engagement_level?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          topics_covered?: string[] | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          engagement_level?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          topics_covered?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          federal_state: string | null
          grade_level: number | null
          id: string
          preferences: Json | null
          preferred_learning_times: string[] | null
          role: string
          tts_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          federal_state?: string | null
          grade_level?: number | null
          id: string
          preferences?: Json | null
          preferred_learning_times?: string[] | null
          role: string
          tts_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          federal_state?: string | null
          grade_level?: number | null
          id?: string
          preferences?: Json | null
          preferred_learning_times?: string[] | null
          role?: string
          tts_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      subject_assessments: {
        Row: {
          actual_grade_level: number
          answers_given: Json | null
          assessment_date: string | null
          confidence: number | null
          created_at: string | null
          discrepancy: number | null
          estimated_level: number
          id: string
          is_priority: boolean | null
          questions_asked: Json | null
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_grade_level: number
          answers_given?: Json | null
          assessment_date?: string | null
          confidence?: number | null
          created_at?: string | null
          discrepancy?: number | null
          estimated_level: number
          id?: string
          is_priority?: boolean | null
          questions_asked?: Json | null
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_grade_level?: number
          answers_given?: Json | null
          assessment_date?: string | null
          confidence?: number | null
          created_at?: string | null
          discrepancy?: number | null
          estimated_level?: number
          id?: string
          is_priority?: boolean | null
          questions_asked?: Json | null
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_assessments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          id: string
          intensity: number
          interest: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          intensity?: number
          interest: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          intensity?: number
          interest?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_user_id_fkey"
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
