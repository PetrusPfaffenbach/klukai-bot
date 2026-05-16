import { createClient } from "@supabase/supabase-js";
import "dotenv/config"

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if(! supabaseUrl || !supabaseKey)
{
    throw new Error("Critical Error: URL e KEY não configurados ou registrados.")
}


export const supabase = createClient(supabaseUrl, supabaseKey);