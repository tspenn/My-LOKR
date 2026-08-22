export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  workspace_id: string;
  subject: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type ConversationMember = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "member" | "admin";
  joined_at: string;
  last_read_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type MessageAttachment = {
  id: string;
  message_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type InboxMember = {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
};

export type InboxItem = {
  id: string;
  subject: string | null;
  created_at: string;
  updated_at: string;
  last_message_body: string | null;
  last_message_at: string | null;
  unread_count: number;
  members: InboxMember[];
};

export type MessageWithDetails = Message & {
  sender: Profile | null;
  message_attachments: MessageAttachment[];
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  tier?: string;
  created_at?: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          tier?: string;
        };
        Update: {
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          company_name?: string | null;
        };
        Relationships: [];
      };
      lokr_workspaces: {
        Row: {
          id: string;
          name: string;
          account_type: "personal" | "business";
          logo_path: string | null;
          created_by: string;
          plan: "free" | "business" | "enterprise";
          vault_addon: "none" | "50" | "100" | "250";
          storage_used_bytes: number;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          vault_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          account_type?: "personal" | "business";
          logo_path?: string | null;
          created_by: string;
        };
        Update: {
          name?: string;
          account_type?: "personal" | "business";
          logo_path?: string | null;
          plan?: "free" | "business" | "enterprise";
          vault_addon?: "none" | "50" | "100" | "250";
          storage_used_bytes?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          vault_subscription_id?: string | null;
        };
        Relationships: [];
      };
      lokr_workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: string;
        };
        Insert: {
          workspace_id: string;
          user_id: string;
          role?: string;
        };
        Update: {
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lokr_workspace_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lokr_conversations: {
        Row: Conversation;
        Insert: {
          workspace_id: string;
          subject?: string | null;
          created_by: string;
        };
        Update: {
          subject?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      lokr_conversation_members: {
        Row: ConversationMember;
        Insert: {
          conversation_id: string;
          user_id: string;
          role?: "member" | "admin";
          last_read_at?: string | null;
        };
        Update: {
          last_read_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "lokr_conversation_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lokr_messages: {
        Row: Message;
        Insert: {
          conversation_id: string;
          sender_id: string;
          body?: string;
        };
        Update: {
          body?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lokr_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lokr_message_attachments_message_id_fkey";
            columns: ["id"];
            isOneToOne: false;
            referencedRelation: "lokr_message_attachments";
            referencedColumns: ["message_id"];
          },
        ];
      };
      lokr_calls: {
        Row: {
          id: string;
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          status: "ringing" | "active" | "ended";
          created_at: string;
          ended_at: string | null;
        };
        Insert: {
          conversation_id: string;
          caller_id: string;
          callee_id: string;
          status?: "ringing" | "active" | "ended";
        };
        Update: {
          status?: "ringing" | "active" | "ended";
          ended_at?: string | null;
        };
        Relationships: [];
      };
      lokr_distribution_lists: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          name: string;
          created_by: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      lokr_distribution_list_members: {
        Row: {
          list_id: string;
          user_id: string;
        };
        Insert: {
          list_id: string;
          user_id: string;
        };
        Update: never;
        Relationships: [];
      };
      lokr_user_phones: {
        Row: {
          user_id: string;
          phone_e164: string;
          verified_at: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      lokr_phone_invites: {
        Row: {
          id: string;
          workspace_id: string;
          invited_by: string;
          phone_e164: string;
          phone_last4: string;
          token: string;
          token_hash: string;
          status: "pending" | "awaiting_code" | "confirmed" | "accepted" | "revoked";
          otp_hash: string | null;
          otp_display: string | null;
          otp_expires_at: string | null;
          otp_sent_at: string | null;
          otp_attempts: number;
          phone_attempts: number;
          phone_confirmed_at: string | null;
          join_ticket: string | null;
          join_ticket_expires_at: string | null;
          accepted_at: string | null;
          accepted_user_id: string | null;
          expires_at: string;
          created_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      lokr_message_attachments: {
        Row: MessageAttachment;
        Insert: {
          message_id: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "lokr_message_attachments_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "lokr_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      lokr_demos: {
        Row: {
          id: string;
          token: string;
          title: string;
          payload: Json;
          created_by: string | null;
          expires_at: string;
          created_at: string;
          opened_count: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      lokr_create_workspace: {
        Args: { p_name: string; p_account_type: string };
        Returns: string;
      };
      lokr_ensure_own_workspace: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      lokr_accept_sample_share: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      lokr_sample_workspace_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      lokr_create_conversation: {
        Args: { p_subject: string | null; p_member_ids: string[]; p_workspace_id: string };
        Returns: string;
      };
      lokr_get_inbox: {
        Args: { p_workspace_id: string };
        Returns: InboxItem[];
      };
      lokr_can_upload: {
        Args: { p_additional_bytes: number; p_workspace_id: string };
        Returns: boolean;
      };
      lokr_storage_limit_bytes: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      lokr_start_call: {
        Args: { p_conversation_id: string };
        Returns: string;
      };
      lokr_ensure_direct_conversation: {
        Args: { p_other_user_id: string; p_workspace_id: string };
        Returns: string;
      };
      lokr_create_phone_invite: {
        Args: { p_workspace_id: string; p_phone_e164: string; p_token: string };
        Returns: Json;
      };
      lokr_peek_phone_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      lokr_confirm_invite_phone: {
        Args: { p_token: string; p_phone_e164: string };
        Returns: Json;
      };
      lokr_verify_invite_otp: {
        Args: { p_token: string; p_otp: string };
        Returns: Json;
      };
      lokr_accept_phone_invite: {
        Args: { p_ticket: string };
        Returns: Json;
      };
      lokr_accept_phone_invite_by_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      lokr_set_workspace_logo: {
        Args: { p_workspace_id: string; p_logo_path: string };
        Returns: Json;
      };
      lokr_email_for_verified_phone: {
        Args: { p_phone_e164: string };
        Returns: string;
      };
      lokr_has_password: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      lokr_activate_pending_password: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      lokr_set_own_password: {
        Args: { p_password: string };
        Returns: Json;
      };
      lokr_get_demo: {
        Args: { p_token: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
