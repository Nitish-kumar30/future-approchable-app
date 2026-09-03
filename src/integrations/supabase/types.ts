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
      certificate_requests: {
        Row: {
          admin_note: string | null
          cohort_id: string | null
          course_id: string | null
          created_at: string
          id: string
          learner_note: string | null
          linkedin_post_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["certificate_request_status"]
          tier: Database["public"]["Enums"]["certificate_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          learner_note?: string | null
          linkedin_post_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["certificate_request_status"]
          tier: Database["public"]["Enums"]["certificate_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          learner_note?: string | null
          linkedin_post_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["certificate_request_status"]
          tier?: Database["public"]["Enums"]["certificate_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_requests_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificate_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          certificate_id: string
          cohort_id: string | null
          completion_date: string
          course_id: string | null
          created_at: string
          id: string
          instructor_name: string
          instructor_title: string
          issued_at: string
          issued_by: string | null
          pdf_storage_path: string
          program_name: string
          recipient_name: string
          request_id: string | null
          tier: Database["public"]["Enums"]["certificate_tier"]
          user_id: string
          verify_url: string
        }
        Insert: {
          certificate_id: string
          cohort_id?: string | null
          completion_date: string
          course_id?: string | null
          created_at?: string
          id?: string
          instructor_name?: string
          instructor_title?: string
          issued_at?: string
          issued_by?: string | null
          pdf_storage_path: string
          program_name: string
          recipient_name: string
          request_id?: string | null
          tier: Database["public"]["Enums"]["certificate_tier"]
          user_id: string
          verify_url: string
        }
        Update: {
          certificate_id?: string
          cohort_id?: string | null
          completion_date?: string
          course_id?: string | null
          created_at?: string
          id?: string
          instructor_name?: string
          instructor_title?: string
          issued_at?: string
          issued_by?: string | null
          pdf_storage_path?: string
          program_name?: string
          recipient_name?: string
          request_id?: string | null
          tier?: Database["public"]["Enums"]["certificate_tier"]
          user_id?: string
          verify_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "certificate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_progress: {
        Row: {
          chapter_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          chapter_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          chapter_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          chapter_order: number
          created_at: string
          description: string | null
          duration_seconds: number | null
          hls_url: string | null
          id: string
          is_content_unlocked: boolean
          is_preview: boolean
          session_id: string
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chapter_order?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          hls_url?: string | null
          id?: string
          is_content_unlocked?: boolean
          is_preview?: boolean
          session_id: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chapter_order?: number
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          hls_url?: string | null
          id?: string
          is_content_unlocked?: boolean
          is_preview?: boolean
          session_id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      cohort_registrations: {
        Row: {
          additional_info: string | null
          amount: number | null
          capstone_office_hours: boolean
          cohort: string
          company: string
          country: string | null
          created_at: string
          currency: string | null
          email: string
          id: string
          interests: string[]
          name: string
          other_interest: string | null
          payment_status: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          reason: string
          role: string
          state: string | null
          status: string
          updated_at: string
          whatsapp_number: string
        }
        Insert: {
          additional_info?: string | null
          amount?: number | null
          capstone_office_hours?: boolean
          cohort: string
          company: string
          country?: string | null
          created_at?: string
          currency?: string | null
          email: string
          id?: string
          interests?: string[]
          name: string
          other_interest?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason: string
          role: string
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp_number: string
        }
        Update: {
          additional_info?: string | null
          amount?: number | null
          capstone_office_hours?: boolean
          cohort?: string
          company?: string
          country?: string | null
          created_at?: string
          currency?: string | null
          email?: string
          id?: string
          interests?: string[]
          name?: string
          other_interest?: string | null
          payment_status?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          reason?: string
          role?: string
          state?: string | null
          status?: string
          updated_at?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      cohorts: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          enrollment_disabled: boolean
          group_link: string | null
          id: string
          is_published: boolean | null
          max_seats: number | null
          meeting_link: string | null
          mentor_info: string | null
          mentor_name: string | null
          name: string
          session_time: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          enrollment_disabled?: boolean
          group_link?: string | null
          id?: string
          is_published?: boolean | null
          max_seats?: number | null
          meeting_link?: string | null
          mentor_info?: string | null
          mentor_name?: string | null
          name: string
          session_time?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          enrollment_disabled?: boolean
          group_link?: string | null
          id?: string
          is_published?: boolean | null
          max_seats?: number | null
          meeting_link?: string | null
          mentor_info?: string | null
          mentor_name?: string | null
          name?: string
          session_time?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_ratings: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          duration: string | null
          enrollment_disabled: boolean
          id: string
          image_url: string | null
          is_on_demand: boolean
          is_published: boolean | null
          mentor_info: string | null
          mentor_name: string | null
          name: string
          price_inr_paise: number | null
          price_usd_cents: number | null
          slug: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_disabled?: boolean
          id?: string
          image_url?: string | null
          is_on_demand?: boolean
          is_published?: boolean | null
          mentor_info?: string | null
          mentor_name?: string | null
          name: string
          price_inr_paise?: number | null
          price_usd_cents?: number | null
          slug: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string | null
          enrollment_disabled?: boolean
          id?: string
          image_url?: string | null
          is_on_demand?: boolean
          is_published?: boolean | null
          mentor_info?: string | null
          mentor_name?: string | null
          name?: string
          price_inr_paise?: number | null
          price_usd_cents?: number | null
          slug?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          cohort_id: string | null
          course_id: string | null
          enrolled_at: string
          id: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          course_id?: string | null
          enrolled_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          cohort_id: string | null
          comment: string | null
          course_id: string | null
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cohort_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cohort_id?: string | null
          comment?: string | null
          course_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_projects: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          session_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mini_projects_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string
          id: string
          razorpay_order_id: string
          razorpay_payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          currency?: string
          id?: string
          razorpay_order_id: string
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string
          id?: string
          razorpay_order_id?: string
          razorpay_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_reading_materials: {
        Row: {
          created_at: string
          display_order: number
          id: string
          link: string
          session_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          link: string
          session_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          link?: string
          session_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_reading_materials_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quiz_submissions: {
        Row: {
          answers: Json
          id: string
          quiz_id: string
          score: number | null
          submitted_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          quiz_id: string
          score?: number | null
          submitted_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          id?: string
          quiz_id?: string
          score?: number | null
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_submissions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          questions: Json
          session_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          questions?: Json
          session_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          questions?: Json
          session_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_quizzes: {
        Row: {
          created_at: string
          display_order: number
          id: string
          quiz_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          quiz_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          quiz_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_quizzes_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          cohort_id: string | null
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          is_content_unlocked: boolean
          presentation_url: string | null
          recording_url: string | null
          session_date: string | null
          session_order: number | null
          text_content: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_content_unlocked?: boolean
          presentation_url?: string | null
          recording_url?: string | null
          session_date?: string | null
          session_order?: number | null
          text_content?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cohort_id?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_content_unlocked?: boolean
          presentation_url?: string | null
          recording_url?: string | null
          session_date?: string | null
          session_order?: number | null
          text_content?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
      cohorts_public: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          enrollment_disabled: boolean | null
          id: string | null
          is_published: boolean | null
          max_seats: number | null
          mentor_info: string | null
          mentor_name: string | null
          name: string | null
          session_time: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_disabled?: boolean | null
          id?: string | null
          is_published?: boolean | null
          max_seats?: number | null
          mentor_info?: string | null
          mentor_name?: string | null
          name?: string | null
          session_time?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          enrollment_disabled?: boolean | null
          id?: string | null
          is_published?: boolean | null
          max_seats?: number | null
          mentor_info?: string | null
          mentor_name?: string | null
          name?: string | null
          session_time?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_enrollment_progress_percent: {
        Args: { p_cohort_id?: string; p_course_id?: string; p_user_id: string }
        Returns: number
      }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_certificate_eligibility: {
        Args: { p_cohort_id?: string; p_course_id?: string; p_user_id: string }
        Returns: Json
      }
      get_cohort_enrollment_count: {
        Args: { _cohort_id: string }
        Returns: number
      }
      get_course_community_progress: {
        Args: { _course_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_enrolled_in_cohort: {
        Args: { _cohort_id: string; _user_id: string }
        Returns: boolean
      }
      is_enrolled_in_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_paid_course: { Args: { _course_id: string }; Returns: boolean }
      recompute_session_completion: {
        Args: { _session_id: string; _user_id: string }
        Returns: undefined
      }
      submit_quiz_answers: {
        Args: { p_answers: Json; p_quiz_id: string }
        Returns: {
          score: number
          submission_id: string
        }[]
      }
      upsert_chapter_progress: {
        Args: {
          _chapter_id: string
          _is_completed: boolean
          _user_id: string
          _watched_seconds: number
        }
        Returns: {
          chapter_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_completed: boolean
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        SetofOptions: {
          from: "*"
          to: "chapter_progress"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "learner"
      certificate_request_status: "pending" | "approved" | "rejected" | "issued"
      certificate_tier: "foundation" | "practitioner" | "expert"
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
    Enums: {
      app_role: ["admin", "learner"],
      certificate_request_status: ["pending", "approved", "rejected", "issued"],
      certificate_tier: ["foundation", "practitioner", "expert"],
    },
  },
} as const
