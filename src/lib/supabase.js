import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hwtqtmrehoxxhsblbkjy.supabase.co";
const supabaseKey = "sb_publishable_27bqR6IyjzBwKtw07gGO1g_HUTePPQm";

export const db = createClient(supabaseUrl, supabaseKey);