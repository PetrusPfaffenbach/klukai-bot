import { createClient } from "@supabase/supabase-js";
import "dotenv/config";
import ws from "ws"; // <-- Importamos o WebSocket ultra-estável que vem no Node!

// 1. Injetamos o WebSocket globalmente para enganar o motor do Node 20
(globalThis as any).WebSocket = ws;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("Critical Error: URL e KEY não configurados ou registrados.");
}

// 2. Criamos o banco forçando ele a usar a nossa conexão segura
export const supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: {
        transport: ws as any// <-- A mágica acontece aqui!
    }
});