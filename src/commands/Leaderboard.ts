import { EmbedBuilder, Message } from "discord.js";
import { supabase } from "../services/supabase";

export async function executeLeaderboard(message: Message) {
    const FormattedMessage = message.content.toLowerCase();
    
    
    const isDaily = FormattedMessage.includes("dia");

    try {
        const WaitMessage = await message.reply("[CHECKING...] Consultando os registros da Valve para montar o ranking...");

        let query = supabase.from("cs_matches").select("*");

        if (isDaily) {
            const Hoje = new Date();
            Hoje.setHours(0, 0, 0, 0);
            query = query.gte("created_at", Hoje.toISOString());
        }

        const { data: matches, error } = await query;

        if (error) {
            console.error("[LEADERBOARD] Erro no banco de dados:", error);
            return WaitMessage.edit("[X][X]Ocorreu um erro ao buscar os dados da leaderboard no servidor.");
        }

        if (!matches || matches.length === 0) {
            return WaitMessage.edit(isDaily
                ? "**A tabela de hoje está vazia!** Ninguém jogou (ou o bot ainda não registrou) nenhuma partida hoje."
                : "**O banco de dados histórico está vazio.** Vão jogar para preencher o placar!"
            );
        }

        const Score: Record<string, { kills: number, deaths: number, assists: number, mvps: number }> = {};

        matches.forEach(matchItem => {
            const id = matchItem.discord_id;

            if (!Score[id]) {
                Score[id] = { kills: 0, deaths: 0, assists: 0, mvps: 0 };
            }
            
            Score[id].kills += matchItem.kills;
            Score[id].deaths += matchItem.deaths;
            Score[id].assists += matchItem.assists;
            Score[id].mvps += matchItem.mvps || 0;
        });

        let ranking = Object.keys(Score).map(id => {
            const stats = Score[id]!;
            const deathsFixed = stats.deaths === 0 ? 1 : stats.deaths;
            const kda = ((stats.kills + stats.assists) / deathsFixed).toFixed(2);
            
            return {
                discord_id: id,
                ...stats,
                kda: parseFloat(kda)
            };
        });

        if(!isDaily) {
            ranking = ranking.filter(player => player.kills >= 25)
        }

        ranking.sort((a, b) => b.kda - a.kda);

        const embed = new EmbedBuilder()
            .setTitle(isDaily ? '🏆 Leaderboard CS2: Operações de Hoje' : '🏆 Leaderboard CS2: Hall da Fama Oficial')
            .setColor(isDaily ? '#00FFFF' : '#FFD700') // Ciano pro Diário, Ouro pro Histórico
            .setDescription(isDaily 
                ? 'Ranking diário consolidado no KDA. Reinicia todo dia à meia-noite.' 
                : 'Ranking global consolidado. *Requisito mínimo: 25 Kills totais para ranquear.*'
            );

        if (ranking.length === 0) {
            embed.addFields({ name: 'Tabela Vazia', value: 'Nenhum jogador atingiu a cota mínima de 25 kills ainda.' });
        } else {
            ranking.slice(0, 10).forEach((player, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
                
                // Formatação monospaçada para deixar os números alinhados
                const K = player.kills.toString().padStart(3, '0');
                const D = player.deaths.toString().padStart(3, '0');
                const A = player.assists.toString().padStart(3, '0');

                embed.addFields({
                    name: `${medal} ${index + 1}º Lugar`,
                    value: `👤 <@${player.discord_id}> • **KDA: ${player.kda.toFixed(2)}**\n\`[ ⚔️ K: ${K} | 💀 D: ${D} | 🤝 A: ${A} ]\` • ⭐ \`${player.mvps}\` MVPs`,
                    inline: false // Deixa cada jogador em uma linha separada para destacar
                });
            });
        }

        embed.setFooter({ text: 'Klukai Analytics • Matchmaking System', iconURL: message.client.user?.displayAvatarURL() })
             .setTimestamp();

        return WaitMessage.edit({ content: "", embeds: [embed] });

    } catch (err) {
        console.error("[LEADERBOARD] Falha crítica:", err);
        return message.reply("❌ Erro interno ao montar a Leaderboard.");
    }
}