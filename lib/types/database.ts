/** Supabase DB 스키마 타입 (테이블 구조에 맞춰 수동 정의) */

export interface Database {
  public: {
    Tables: {
      chat_rooms: {
        Row: {
          id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          role: "user" | "assistant";
          content: string;
          timestamp: string;
        };
        Insert: {
          id: string;
          room_id: string;
          role: "user" | "assistant";
          content?: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          role?: "user" | "assistant";
          content?: string;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "chat_rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      tool_calls: {
        Row: {
          id: string;
          message_id: string;
          server_id: string;
          server_name: string;
          name: string;
          args: Record<string, unknown>;
          status: string;
          result: unknown | null;
          error: string | null;
          function_name: string | null;
        };
        Insert: {
          id: string;
          message_id: string;
          server_id: string;
          server_name: string;
          name: string;
          args?: Record<string, unknown>;
          status?: string;
          result?: unknown | null;
          error?: string | null;
          function_name?: string | null;
        };
        Update: {
          id?: string;
          message_id?: string;
          server_id?: string;
          server_name?: string;
          name?: string;
          args?: Record<string, unknown>;
          status?: string;
          result?: unknown | null;
          error?: string | null;
          function_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tool_calls_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "messages";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_servers: {
        Row: {
          id: string;
          name: string;
          enabled: boolean;
          transport: "streamable-http" | "stdio";
          url: string | null;
          headers: Record<string, string> | null;
          command: string | null;
          args: string[] | null;
          env: Record<string, string> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          enabled?: boolean;
          transport: "streamable-http" | "stdio";
          url?: string | null;
          headers?: Record<string, string> | null;
          command?: string | null;
          args?: string[] | null;
          env?: Record<string, string> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          enabled?: boolean;
          transport?: "streamable-http" | "stdio";
          url?: string | null;
          headers?: Record<string, string> | null;
          command?: string | null;
          args?: string[] | null;
          env?: Record<string, string> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
