// Declarações de tipo ambiente para compatibilidade do TypeScript Compiler com Deno / Edge Functions
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}
