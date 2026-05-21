import "dotenv/config";
import { supabase } from "./supabase";
import { EmbedBuilder } from "discord.js";
import genshinDb from "genshin-db";
import { analyzeDPS } from "./GenshinAnalyzer";


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

export async function showcaseGenshin(message: any, discordId: string) {
    
    try {

        const { data: user } = await supabase.from("users").select("genshin_uid").eq("discord_id", discordId).maybeSingle();
        if (!user || !user.genshin_uid) {
            return message.reply("[!] Você ainda não registrou seu UID. Use `!registrar-genshin <UID>`.");
        }
        
    const Waiting = await message.reply("📡 Mapeando os personagens na sua vitrine...");
        const res = await fetch(`https://enka.network/api/uid/${user.genshin_uid}/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            return Waiting.edit(`[X] Conexão barrada pela Enka.Network (Erro ${res.status}).`);
        }
        
        const dados = await res.json();
        const listChars = dados.avatarInfoList || [];
        
        if (listChars.length === 0) {
            return Waiting.edit("[X] Nenhum personagem exposto ou perfil privado dentro do jogo.");
        }
        
        const embedVitrine = new EmbedBuilder()
        .setColor("#9000FF") // Roxo Épico
        .setTitle(`⚔️ VITRINE DE COMBATE: ${dados.playerInfo.nickname}`)
        .setDescription("Abaixo está o índice de build e detecção de classe de todos os personagens expostos no seu perfil:")
        .setTimestamp();
        
        const { analyzeDPS } = require("./GenshinAnalyzer");
        
// Limitamos a 8 bonecos para o Discord não chiar com o limite de tamanho do Embed
// Limitamos a 8 bonecos para o Discord não chiar com o limite de tamanho do Embed
        listChars.slice(0, 8).forEach((personagem: any) => {
            
            // 1. A MÁGICA: Ensinamos a ler IDs e calamos o TypeScript com "as any"
            const charData = genshinDb.characters(personagem.avatarId.toString(), { 
                queryLanguages: ["id"], 
                resultLanguage: "Portuguese" 
            } as any);
            
            let nomeChar = charData ? charData.name : "Herói Oculto";
            
            // Tratamento especial para os Viajantes (Aether / Lumine)
            if (personagem.avatarId === 10000005) nomeChar = "Aether (Viajante)";
            if (personagem.avatarId === 10000007) nomeChar = "Lumine (Viajante)";

            // 2. O Extrator do "Cofre 4001" (Level)
            const nivelObj = personagem.propMap?.["4001"];
            const levelBoneco = nivelObj ? (nivelObj.ival || nivelObj.val) : "??";

            // 3. Cálculos Vitais
            const stats = analyzeDPS(personagem);

            embedVitrine.addFields({
                name: `• ${nomeChar} (Nv. ${levelBoneco})`,
                value: `└ 📊 **CV:** \`${stats.cvTotal}\` | *${stats.classificacao.split(" (")[0]}*`,
                inline: false
            });
        });
        
        return Waiting.edit({conent: "", embeds: [embedVitrine]});
    } catch(e) {
        console.error(e);
        return message.reply("[X] erro ao processar a vitrine");
    }
}

export async function exibirDetalhesPersonagem(message: any, discordId: string, nomeBuscado: string) {
    try {
        const { data: user } = await supabase.from("users").select("genshin_uid").eq("discord_id", discordId).maybeSingle();
        if (!user || !user.genshin_uid) {
            return message.reply("[!] Registre seu UID primeiro com `!registrar-genshin <UID>`.");
        }
    const Waiting = await message.reply("📡 Mapeando os personagens na sua vitrine...");
        const res = await fetch(`https://enka.network/api/uid/${user.genshin_uid}/`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            return Waiting.edit(`[X] Conexão barrada pela Enka.Network (Erro ${res.status}).`);
        }
        
        const dados = await res.json();
        const listaPersonagens = dados.avatarInfoList || [];

        // Buscamos as informações do jogo para descobrir o ID correto do personagem procurado
        const charInfoJogo = genshinDb.characters(nomeBuscado);
        if (!charInfoJogo) return Waiting.edit("[X] Erro ao identificar o herói.");

        // Procuramos o boneco correspondente dentro da vitrine do jogador
        const bonecoAlvo = listaPersonagens.find((c: any) => c.avatarId.toString() === charInfoJogo.id.toString());

        if (!bonecoAlvo) {
            return Waiting.edit(`[!] **${charInfoJogo.name}** não está na sua vitrine pública do jogo! Coleque ele na vitrine dentro do Genshin e aguarde uns minutos.`);
        }

        // Puxamos a nossa análise matemática de CV
        const { analyzeDPS } = require("./genshinAnalyzer");
        const stats = analyzeDPS(bonecoAlvo);

        // --- EXTRATOR DE ARMA (Usando o genshin-db para traduzir o item da Enka) ---
        let textoArma = "Nenhuma arma equipada";
        const armaEquipada = bonecoAlvo.equipList?.find((e: any) => e.weapon);
        if (armaEquipada) {
            const dadosArma = genshinDb.weapons(armaEquipada.weapon.weaponId.toString());
            if (dadosArma) {
                textoArma = `⚔️ **${dadosArma.name}** (Refinamento ${armaEquipada.weapon.affixMap ? Object.values(armaEquipada.weapon.affixMap)[0] as number + 1 : 1})`;
            }
        }

        // --- CONSTRUÇÃO DO CARD DETALHADO DO BONECO ---
        const embedDetalhes = new EmbedBuilder()
            .setColor(stats.corDestaque as any)
            .setTitle(`🔬 DIAGNÓSTICO AVANÇADO: ${charInfoJogo.name}`)
            .setDescription(`Análise em tempo real do slot ativo de <@${discordId}>`)
            .addFields(
                { name: "📈 ATRIBUTOS CRÍTICOS", value: `🎯 **Taxa Crítica:** \`${stats.taxaCritica}%\`\n💥 **Dano Crítico:** \`${stats.danoCritico}%\`\n📊 **Critical Value (CV):** \`${stats.cvTotal}\``, inline: true },
                { name: "🛡️ EQUIPAMENTO", value: `${textoArma}\n Nível da Conta: \`AR ${dados.playerInfo.level}\``, inline: true },
                { name: "🔎 VEREDITO DA KLUKAI", value: `**${stats.classificacao}**\n*Este cálculo avalia puramente o investimento em taxa e dano nos artefatos e armas equipados.*`, inline: false }
            )
            .setFooter({ text: `Klukai Analytics • UID: ${user.genshin_uid}` })
            .setTimestamp();

        return Waiting.edit({ content: "", embeds: [embedDetalhes] });

    } catch (e) {
        console.error(e);
        return message.reply("❌ Erro crítico ao analisar o personagem.");
    }
}