import "dotenv/config";
import { supabase } from "./supabase";
import { EmbedBuilder } from "discord.js";
import genshinDb from "genshin-db";


export async function perfilGenshin(message: any, uid: string) {
    const url = `https://enka.network/api/uid/${uid}/`;
    const discordId = message.author.id;
    let maxConquistasJogo = 1710;
    try {
        const Waitingmessage = await message.reply("Getting into Enka Servers")
    

        const awnser = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json"
        }
    });

    console.log (`[O] RASTREADOR GENSHIN/ENKA: Status ${awnser.status} (${awnser.statusText})\n`)

    if(!awnser.ok) {
            return Waitingmessage.edit(`[X] A Enka recusou o pedido. Erro HTTP: \`${awnser.status}\`.`);
        }

        const dados = await awnser.json();
        const playerInfo = dados.playerInfo;

        if (!playerInfo) {
            return Waitingmessage.edit("[X] Esse UID existe, mas o perfil está sem informações públicas.");
        }

        await supabase
            .from("users")
            .upsert({
                discord_id: discordId,
                genshin_uid: uid
            });
        
    const conquistasAtuais = playerInfo.finishAchievementNum || 0;
        
        
        let maxConquistasJogo = 1710; 

        try {
            // 2. Tentamos puxar a lista atualizada
            const todasConquistas = genshinDb.achievements("all", { matchCategories: true });
            
            
            if (Array.isArray(todasConquistas)) {
                maxConquistasJogo = todasConquistas.length;
            }
        } catch (dbError) {
            console.log("[GENSHIN-DB WARN] Falha ao ler a base local. Usando fallback de 1710.");
        }

        // Nossa equação proxy de tempo de tela
        const horasEstimadas = Math.floor(conquistasAtuais * 1.85);
        const progressoPercentual = ((conquistasAtuais / maxConquistasJogo) * 100).toFixed(1);

        let tituloPrestigio = "";
        if (conquistasAtuais < 300) tituloPrestigio = "🌱 Turista de Teyvat (Casual)";
        else if (conquistasAtuais < 700) tituloPrestigio = "🗺️ Explorador Frequente (Intermediário)";
        else if (conquistasAtuais < 1100) tituloPrestigio = "⚔️ Veterano do Abismo (Avançado)";
        else if (conquistasAtuais < 1500) tituloPrestigio = "👑 Sábio de Irminsul (Hardcore)";
        else tituloPrestigio = "🌌 Arconte do Tempo (Completista / Day 1)";

        // --- FRONTEND: CONSTRUÇÃO DO CARD DISCORD ---
        const embedGenshin = new EmbedBuilder()
            .setColor("#00E1D9") 
            .setTitle(`🌌 REGISTRO DE AVENTUREIRO: ${playerInfo.nickname}`)
            .setDescription(`\`\`\`ini\n[UID: ${uid}] • Sincronizado com Teyvat Subsystem\n\`\`\``)
            .addFields(
                { 
                    name: "👤 DADOS DO VIAJANTE", 
                    value: `🔹 **Rank de Aventura:** \`AR ${playerInfo.level}\`\n🔹 **Nível do Mundo:** \`Nível ${playerInfo.worldLevel || 0}\`\n🔹 **Assinatura:** *"${playerInfo.signature || "Sem assinatura"}"*`,
                    inline: false 
                },
                { 
                    name: "⏱️ TEMPO DE SERVIÇO ESTIMADO", 
                    value: `🎖️ **Patente:** \`${tituloPrestigio}\`\n🎮 \`~${horasEstimadas.toLocaleString('pt-BR')} horas de jogo\` *(Heurística)*\n🏆 \`${conquistasAtuais} / ${maxConquistasJogo}\` Conquistas concluídas (\`${progressoPercentual}%\`)`,
                    inline: false 
                },
                { 
                    name: "⚔️ PROGRESSÃO DO ABISMO", 
                    value: `🌀 **Exploração Atual:** \`Andar ${playerInfo.towerFloorIndex || 0} - Sala ${playerInfo.towerLevelIndex || 0}\``,
                    inline: false 
                }
            )
            .setFooter({ text: "Klukai O.S. • Módulo Genshin Impact v1.1", iconURL: message.client.user?.displayAvatarURL() })
            .setTimestamp();

        return Waitingmessage.edit({ content: "", embeds: [embedGenshin] });

    } catch (erro) {
        console.error("Erro nos serviços do Genshin:", erro);
        return message.reply("[X][X] Falha crítica ao conectar à API da Enka.Network ou processar dados!");
    }

}
