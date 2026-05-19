import { EmbedBuilder, Message } from "discord.js";
import { supabase } from "../services/supabase";

export async function executeLeaderboard(message: Message) {
    const FormattedMessage = message.content.toLowerCase();
    
    // Descobre se o usuário quer o ranking de hoje ou o histórico inteiro
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

        const ranking = Object.keys(Score).map(id => {
            const stats = Score[id];
            const deathsFixed = stats.deaths === 0 ? 1 : stats.deaths;
            const kda = ((stats.kills + stats.assists) / deathsFixed).toFixed(2);
            
            return {
                discord_id: id,
                ...stats,
                kda: parseFloat(kda)
            };
        });


        ranking.sort((a, b) => b.kda - a.kda);

        const embed = new EmbedBuilder()
            .setTitle(isDaily ? '🏆 Leaderboard CS2: Gameplay de hoje' : '🏆 Leaderboard CS2: Histórico de gameplay')
            .setColor('#FFD700')
            .setDescription('Ranking consolidado no KDA (Kills + Assists / Deaths) extraído diretamente da Valve.')
            .setThumbnail('https://i.imgur.com/83pA8oW.png');

        let topString = "";

        ranking.slice(0, 10).forEach((player, index) => {
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🏅";
            topString += `${medal} <@${player.discord_id}> - KDA: **${player.kda.toFixed(2)}**\n`;
            topString += `└ ⚔️ \`${player.kills} / ${player.deaths} / ${player.assists}\` | ⭐ \`${player.mvps}\` MVPs\n\n`;
        });

        embed.addFields({ name: 'Classificação "Oficial"', value: topString });
        embed.setFooter({ text: 'CS2Bot • Atualizado dinamicamente', iconURL: message.client.user?.displayAvatarURL() })
            .setTimestamp();

        return WaitMessage.edit({ content: "", embeds: [embed] });

    } catch (err) {
        console.error("[LEADERBOARD] Falha crítica:", err);
        return message.reply("❌ Erro interno ao montar a Leaderboard.");
    }
}