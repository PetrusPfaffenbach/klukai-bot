import "dotenv/config";
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, formatEmoji } from "discord.js";
import { SteamProfile } from "./services/steamServices";
import { perfilGenshin} from "./services/enkaServices";
import http from "http";
import { registerCS } from "./services/csServices";
import { supabase } from "./services/supabase";
import express from 'express';
import { buscarPartidaCS2, iniciarSteam} from './services/steamClient';
import { executeStatusCS } from "./commands/csStats";
import { steamRegister } from "./commands/steamRegister";
import { GenshinRegister } from "./commands/GenshinRegister";
import { startTrackerCS2, forceScanCS2, pausePollerCS2, statusPollerCS2 } from "./services/csPoller";
import { executeLeaderboard } from "./commands/Leaderboard";
import { executarDiagnosticoDeBoot } from "./services/systemCheck";


const requiredEnvVars = [
    "DISCORD_TOKEN",
    "STEAM_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "STEAM_BOT_USER",
    "STEAM_BOT_PASS",
    "ID_CANAL",
    "DIAG_ID",
    "MEU_ID_ADMIN"
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.error(`[FATAL ERROR] Variável de ambiente ausente: ${envVar}`);
        process.exit(1); // Desliga o motor imediatamente!
    }
}


setInterval(() => {
    const memory = process.memoryUsage();
    console.log(`[MONITOR RAM] Uso atual: ${(memory.rss / 1024 / 1024).toFixed(2)} MB`);
}, 900000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});


const app = express();
app.get('/healthz', (req, res) => res.status(200).send('Bot CS2 Rodando!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server online.'));


client.once("ready", () => {
    console.log(`O motor da ${client.user?.tag} ligou com sucesso!`);

    executarDiagnosticoDeBoot(client);
    iniciarSteam();
    startTrackerCS2(client);
});


client.on("messageCreate", async message => {
    if(message.author.bot) return;

    console.log(`CÓDIGO OUVIU: "${message.content}" de ${message.author.username}`);

    const FormattedMessage = message.content.toLowerCase();
    const discordIdUser = message.author.id;

    // 1. COMANDO DE SAUDAÇÕES
    if(FormattedMessage.includes("linda a klukai")) {
        return message.reply("sou a klukai RANDANDANDAN!");
    }

    // 1.5 CENTRAL DE COMANDOS
    if (FormattedMessage === "!comandos" || FormattedMessage === "!ajuda" || FormattedMessage === "!help") {
        const embedHelp = new EmbedBuilder()
            .setTitle("🤖 Terminal de Comandos: Klukai O.S.")
            .setColor("#2B2D31") // Cor que se camufla com o fundo do Discord
            .setDescription("Abaixo está a lista completa de módulos operacionais disponíveis no sistema:")
            .addFields(
                { 
                    name: "🔫 Counter-Strike 2", 
                    value: "`!registrar-cs <AuthCode> <ShareCode>`\nVincula sua conta e importa sua primeira partida.\n\n`!cs-help`\nMostra o tutorial de como conseguir os códigos.\n\n`!statuscs`\nMostra o seu card de perfil com o K/D/A atualizado.\n\n`!leaderboard`\nMostra o ranking histórico oficial do servidor.\n\n`!leaderboard dia`\nMostra o ranking apenas das partidas jogadas hoje." 
                },
                { 
                    name: "⚙️ Módulo Steam Base", 
                    value: "`!registrar-steam <SteamID64>`\nRegistra a sua conta da Steam no banco de dados.\n\n`!perfil-steam`\nExibe um card detalhado do seu status na Steam." 
                },
                { 
                    name: "🌌 Genshin Impact", 
                    value: "`!registrar-genshin <UID>`\n*(Módulo em fase de construção)*\n\n`!perfil-genshin`\n*(Módulo em fase de construção)*" 
                }
            )
            .setFooter({ text: "Sistemas Operacionais Klukai • Execute os comandos no chat" });

        return message.reply({ embeds: [embedHelp] });
    }

    // 2. COMANDOS DA SESSÃO STEAM
    if (FormattedMessage.startsWith("!registrar-steam") || FormattedMessage === "!perfil-steam") {
        return steamRegister(message, discordIdUser);
    }

    // 3. COMANDOS DA SESSÃO HOYOVERSE (GENSHIN POR ENQUANTO!)
    if (FormattedMessage.startsWith("!registrar-genshin") || FormattedMessage === "!perfil-genshin") {
        return GenshinRegister(message, discordIdUser);
    }

    // 4. COMANDO DE REGISTRO DO CS2
    if(FormattedMessage.startsWith("!registrar-cs")) {
        const args = message.content.split(" ");
        
        const authCode = args[1]?.trim();
        let knowMatch = args[2]?.trim(); 

        if (!authCode || !knowMatch) {
            return message.reply("[!] **Formato incorreto!** Você precisa informar os dois códigos.\n👉 Uso correto: `!registrar-cs <AuthCode> <MatchToken>`");
        }
        const extrairCSGO = knowMatch.match(/CSGO-[\w-]+/i);

        if (extrairCSGO) {
            knowMatch = extrairCSGO[0] 
        } else {
            return message.reply("[!] **Match Token inválido!** Certifique-se de que o código da partida contenha o padrão `CSGO-`.");
        }
        return registerCS(message, authCode, knowMatch);
    }

    if (FormattedMessage === "!statuscs") {
        return executeStatusCS(message, discordIdUser);
    }  

    if(FormattedMessage.startsWith("!leaderboard")) {
        return executeLeaderboard(message)
    }
    // 5 PAINEL DE CONTROLE DO ADMIN
    const MEU_ID_ADMIN = process.env.DISCORD_TOKEN;

    if (FormattedMessage === "!forçar-scan") {
        if (discordIdUser !== MEU_ID_ADMIN) return;
        const msg = await message.reply("⚙️ Forçando inicialização do motor da Valve...");
        const resultado = await forceScanCS2(client);
        msg.edit(`[OK] ${resultado}`);
        return;
    }
    if (FormattedMessage === "!pausar-poller") {
        if (discordIdUser !== MEU_ID_ADMIN) return;
        const resultado = pausePollerCS2();
        message.reply(`[OFF] ${resultado}`);
        return;
    }

    if (FormattedMessage === "!status-poller") {
        if (discordIdUser !== MEU_ID_ADMIN) return;
        const resultado = statusPollerCS2();
        message.reply(`[INFO] **Painel do Motor CS2**\n${resultado}`);
        return;
    }

    if (FormattedMessage === "!limpar-banco") {
        if (discordIdUser !== MEU_ID_ADMIN) return;
        
        const msg = await message.reply("🗑️ Iniciando protocolo de limpeza do banco de dados...");

        const { error } = await supabase
            .from("cs_matches")
            .delete()
            .not("discord_id", "is", null);

        if (error) {
            console.error("Erro ao limpar banco:", error);
            return msg.edit("[ERROR] Falha crítica ao tentar limpar a tabela `cs_matches`.");
        }

        return msg.edit("[WIPE] **WIPE COMPLETO!** A tabela `cs_matches` foi totalmente zerada. O ambiente está limpo para novos testes.");
    }
});
console.log("\n[DEBUG] Verificando Token do Discord:", process.env.DISCORD_TOKEN ? "✅ TOKEN PRESENTE NA MEMÓRIA" : "❌ TOKEN AUSENTE/UNDEFINED");
console.log("[DEBUG] Iniciando tentativa de conexão com o Gateway do Discord...");

client.on("debug", (info) => {
    console.log(`[DISCORD DEBUG] ${info}`);
});

console.log("\n[DEBUG] Verificando Token do Discord:", process.env.DISCORD_TOKEN ? "✅ TOKEN PRESENTE NA MEMÓRIA" : "❌ TOKEN AUSENTE/UNDEFINED");
console.log("[DEBUG] Iniciando tentativa de conexão com o Gateway do Discord...");


client.login(process.env.DISCORD_TOKEN)
.then(() => {
    console.log("[DEBUG] A promessa de login foi concluída com sucesso!");
})
.catch(erro => {
    console.error("\n[ERRO CRÍTICO] O Discord rejeitou o login. Motivo:", erro);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Rejeição de Promise não tratada:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[ANTI-CRASH] Exceção fatal capturada:', error);
});

// Remember

// (1) git add . | (2) git commit -m "digite aqui" | (3) git push -u origin main 