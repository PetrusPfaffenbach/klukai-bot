import { supabase } from "./supabase";
import { buscarPartidaCS2 } from "./steamClient";
import { Client } from "discord.js";
import { sendTelemetry } from "./Telemetry"; // <-- O Walkie-Talkie chegou aqui!

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function startTrackerCS2(client: Client) {
    
    // O console.log e o motor agora estão LIVRES, na raiz da função!
    console.log("[!TRACK!] [POLLER] Rastreador do CS2 inicializado, loop de teste rápido (10 segundos)...");

    setInterval(async () => {
        console.log("\n[!STANDBY!][POLLER] Nova varredura de partidas inicializada. . . ");
        
        try {
            const { data: users, error } = await supabase
                .from("users")
                .select("discord_id, steam_id_64, steam_auth_token, steam_know_match")
                .not("steam_auth_token", "is", null);
            
            if (error || !users || users.length === 0) {
                console.log("[!EMPTY ERROR!][POLLER] Nenhum usuário registrado ou erro no banco.");
                return;
            }

            for (const user of users) {
                console.log(`[POLLER] Checando o jogador: ${user.discord_id}`);
                
                try {
                    const { shareCode, dadosMatch: match } = await buscarPartidaCS2(
                        user.steam_id_64,
                        user.steam_auth_token,
                        user.steam_know_match
                    );
                    
                    console.log("[!LAUNCHED!][POLLER] Partida encontrada.");
                    const accountConversor = (BigInt(user.steam_id_64) - 76561197960265728n).toString();
                    const todosOsRounds = match.roundstatsall || [];
                    
                    if (todosOsRounds.length > 0) {
                        const ultimoRound = todosOsRounds[todosOsRounds.length - 1];
                        const account_ids = ultimoRound?.reservation?.account_ids || [];
                        const playerIndex = account_ids.findIndex((id: any) => id.toString() === accountConversor);
                        
                        if (playerIndex !== -1) {
                            const kills = ultimoRound.kills?.[playerIndex] ?? 0;
                            const deaths = ultimoRound.deaths?.[playerIndex] ?? 0;
                            const assists = ultimoRound.assists?.[playerIndex] ?? 0;
                            const mvps = ultimoRound.mvps?.[playerIndex] ?? 0;
                            
                            const { error: insertError } = await supabase
                                .from("cs_matches")
                                .insert({
                                    discord_id: user.discord_id,
                                    match_code: shareCode,
                                    kills: kills,
                                    deaths: deaths,
                                    assists: assists,
                                    mvps: mvps
                                });

                            if (insertError) {
                                console.log(`[!UNIQUE!][POLLER] Partida já estava salva ou erro:`, insertError.message);
                            } else {
                                console.log(`[FOUND] [POLLER] Partida salva com sucesso para ${user.discord_id}! (K:${kills} D:${deaths})`);
                                // Mandando a fofoca pro Discord via Telemetria!
                                await sendTelemetry(client, `[SUCESSO] Nova partida registrada para <@${user.discord_id}>! (K:${kills} D:${deaths})`);
                            }
                            
                            await supabase
                                .from("users")
                                .update({ steam_know_match: shareCode })
                                .eq("discord_id", user.discord_id);
                        }
                    }
                } catch (err: any) {
                    if (err.message.includes("Não foi possível gerar o Share Code")) {
                        console.log(`[NOR] [POLLER] Nenhuma partida nova para ${user.discord_id}.`);
                    } else {
                        console.error(`[FAILED] [POLLER] Falha ao rastrear ${user.discord_id}:`, err.message);
                        // Avisando do erro tático!
                        await sendTelemetry(client, `[SCAN FAILURE] Falha ao rastrear <@${user.discord_id}>: ${err.message}`);
                    }
                }
                
                await delay(5000);
            }
            
            console.log("[OK] [POLLER] Varredura concluída.");
        } catch (erroGeral: any) {
            await sendTelemetry(client, `[ERRO CRÍTICO NO LOOP]: ${erroGeral.message}`);
        }
    }, 3600000);
}