import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { supabase } from "./supabase";

export async function executarDiagnosticoDeBoot(client: Client) {
    // Substitua pelo ID do seu canal secreto "『🤖』configurações-de-bots"
    const ID_DO_CANAL = "COLE_O_ID_DO_CANAL_AQUI"; 
    
    try {
        const canalLog = client.channels.cache.get(ID_DO_CANAL) as TextChannel;
        if (!canalLog) return;

        // 1. Manda a primeira mensagem de carregamento
        const bootMessage = await canalLog.send("⏱️ `[SYS_BOOT] Inicializando Keep OS Subsystem... Verificando módulos de rede.`");

        let dbStatus = "🔴 OFFLINE";
        let enkaStatus = "🔴 OFFLINE";
        const startDb = Date.now();
        const { error: dbError } = await supabase.from("users").select("discord_id").limit(1);
        const pingDb = Date.now() - startDb;
        
        if (!dbError) {
            dbStatus = `🟢 ONLINE (\`${pingDb}ms\`)`;
        } else {
            dbStatus = `🔴 ERRO: ${dbError.message}`;
        }
        const startEnka = Date.now();
        try {
            // Fazemos um request leve só na página inicial deles para ver se a API não caiu
            const enkaRes = await fetch("https://enka.network/");
            const pingEnka = Date.now() - startEnka;
            if (enkaRes.ok) {
                enkaStatus = `🟢 ONLINE (\`${pingEnka}ms\`)`;
            } else {
                enkaStatus = `🔴 HTTP ${enkaRes.status}`;
            }
        } catch (e) {
            enkaStatus = "🔴 TIMEOUT / OFFLINE";
        }
        const embed = new EmbedBuilder()
            .setColor("#2B2D31") // Cinza escuro (cor de fundo do Discord) para dar efeito de console
            .setTitle("📡 UPLINK ESTABELECIDO: KLUKAI O.S.")
            .setDescription("```ini\n[DIAGNÓSTICO DE SISTEMAS INICIADO]\n```")
            .addFields(
                { name: "🗄️ NÚCLEO DE DADOS (Supabase)", value: `└ ${dbStatus}`, inline: false },
                { name: "⚔️ HOYOVERSE LINK (Enka API)", value: `└ ${enkaStatus}`, inline: false },
                { name: "🔫 VALVE NETWORK (Steam CS2)", value: `└ 🟢 AGUARDANDO GAME COORDINATOR`, inline: false },
                { name: "⚙️ MOTOR V8 (Poller Automático)", value: `└ 🟢 LOOP ENGATILHADO (30 min)`, inline: false },
                { name: "STATUS GERAL", value: "http://googleusercontent.com/immersive_entry_chip/0" }
            )
    }
        catch (fail) {
            console.log("ERROR!",fail);
        }
}
