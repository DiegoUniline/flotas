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
      attachments: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          organization_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          organization_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_certifications: {
        Row: {
          certification_number: string | null
          certification_type: string
          created_at: string
          driver_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          certification_number?: string | null
          certification_type: string
          created_at?: string
          driver_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          certification_number?: string | null
          certification_type?: string
          created_at?: string
          driver_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_certifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_certifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_licenses: {
        Row: {
          created_at: string
          driver_id: string
          expires_at: string | null
          id: string
          issued_at: string | null
          issuing_country: string | null
          issuing_state: string | null
          license_number: string
          license_type: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuing_country?: string | null
          issuing_state?: string | null
          license_number: string
          license_type?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          issuing_country?: string | null
          issuing_state?: string | null
          license_number?: string
          license_type?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_licenses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_licenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          active: boolean
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          first_name: string
          hire_date: string | null
          id: string
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          photo_url: string | null
          primary_location_id: string | null
          status: string
          termination_date: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          first_name: string
          hire_date?: string | null
          id?: string
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          first_name?: string
          hire_date?: string | null
          id?: string
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          photo_url?: string | null
          primary_location_id?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_documents: {
        Row: {
          attachment_id: string | null
          created_at: string
          document_number: string | null
          document_type: string
          entity_id: string
          entity_type: string
          expires_at: string | null
          id: string
          issued_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attachment_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type: string
          entity_id: string
          entity_type: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attachment_id?: string | null
          created_at?: string
          document_number?: string | null
          document_type?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_documents_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          active: boolean
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          id: string
          latitude: number | null
          location_type: string
          longitude: number | null
          manager_user_id: string | null
          name: string
          organization_id: string
          phone: string | null
          postal_code: string | null
          state: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          manager_user_id?: string | null
          name: string
          organization_id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          manager_user_id?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string | null
          location_id: string | null
          organization_id: string
          role_id: string
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          location_id?: string | null
          organization_id: string
          role_id: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string | null
          location_id?: string | null
          organization_id?: string
          role_id?: string
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          setting_key: string
          setting_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string
          created_at: string
          currency: string
          deleted_at: string | null
          email: string | null
          id: string
          legal_name: string | null
          locale: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          tax_id: string | null
          timezone: string
          trial_ends_at: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          tax_id?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          legal_name?: string | null
          locale?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          tax_id?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          key: string
          module: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          module: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_organization_id: string | null
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          language: string
          last_name: string | null
          phone: string | null
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          phone?: string | null
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
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
          active: boolean
          created_at: string
          description: string | null
          id: string
          key: string | null
          name: string
          organization_id: string | null
          system_role: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string | null
          name: string
          organization_id?: string | null
          system_role?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string | null
          name?: string
          organization_id?: string | null
          system_role?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_driver_assignments: {
        Row: {
          active: boolean
          assigned_by: string | null
          assignment_type: string
          created_at: string
          driver_id: string
          ends_at: string | null
          id: string
          notes: string | null
          organization_id: string
          starts_at: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          active?: boolean
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          driver_id: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          starts_at?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          active?: boolean
          assigned_by?: string | null
          assignment_type?: string
          created_at?: string
          driver_id?: string
          ends_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          starts_at?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_driver_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_driver_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_groups: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          parent_group_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          parent_group_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_group_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_groups_parent_group_id_fkey"
            columns: ["parent_group_id"]
            isOneToOne: false
            referencedRelation: "vehicle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_types: {
        Row: {
          active: boolean
          created_at: string
          icon: string | null
          id: string
          key: string | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          key?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          icon?: string | null
          id?: string
          key?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          active: boolean
          assigned_driver_id: string | null
          brand: string | null
          created_at: string
          current_odometer: number | null
          deleted_at: string | null
          economic_number: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          last_latitude: number | null
          last_longitude: number | null
          last_position_at: string | null
          location_id: string | null
          model: string | null
          notes: string | null
          odometer_unit: string
          organization_id: string
          plate: string | null
          status: string
          updated_at: string
          vehicle_group_id: string | null
          vehicle_type_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          active?: boolean
          assigned_driver_id?: string | null
          brand?: string | null
          created_at?: string
          current_odometer?: number | null
          deleted_at?: string | null
          economic_number?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          last_latitude?: number | null
          last_longitude?: number | null
          last_position_at?: string | null
          location_id?: string | null
          model?: string | null
          notes?: string | null
          odometer_unit?: string
          organization_id: string
          plate?: string | null
          status?: string
          updated_at?: string
          vehicle_group_id?: string | null
          vehicle_type_id: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          active?: boolean
          assigned_driver_id?: string | null
          brand?: string | null
          created_at?: string
          current_odometer?: number | null
          deleted_at?: string | null
          economic_number?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          last_latitude?: number | null
          last_longitude?: number | null
          last_position_at?: string | null
          location_id?: string | null
          model?: string | null
          notes?: string | null
          odometer_unit?: string
          organization_id?: string
          plate?: string | null
          status?: string
          updated_at?: string
          vehicle_group_id?: string | null
          vehicle_type_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_group_id_fkey"
            columns: ["vehicle_group_id"]
            isOneToOne: false
            referencedRelation: "vehicle_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_vehicle_type_id_fkey"
            columns: ["vehicle_type_id"]
            isOneToOne: false
            referencedRelation: "vehicle_types"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_vehicle_to_driver: {
        Args: { p_driver_id: string; p_notes?: string; p_vehicle_id: string }
        Returns: string
      }
      create_organization: {
        Args: {
          p_country?: string
          p_currency?: string
          p_name: string
          p_slug: string
          p_timezone?: string
        }
        Returns: string
      }
      has_permission: {
        Args: { p_org: string; p_perm: string }
        Returns: boolean
      }
      is_org_member: { Args: { p_org: string }; Returns: boolean }
      unassign_vehicle: { Args: { p_vehicle_id: string }; Returns: undefined }
      user_org_ids: { Args: never; Returns: string[] }
    }
    Enums: {
      member_status: "invited" | "active" | "suspended" | "removed"
      org_status: "trial" | "active" | "suspended" | "cancelled"
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
      member_status: ["invited", "active", "suspended", "removed"],
      org_status: ["trial", "active", "suspended", "cancelled"],
    },
  },
} as const
