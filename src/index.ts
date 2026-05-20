import "dotenv/config";
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, formatEmoji } from "discord.js";
import { SteamProfile } from "./services/steamServices";
import { perfilGenshin } from "./services/enkaServices";
import http from "http";
import { registerCS } from "./services/csServices";
import { supabase } from "./services/supabase";
import express from 'express';
import { buscarPartidaCS2, iniciarSteam } from './services/steamClient';
import { executeStatusCS } from "./commands/csStats";
import { steamRegister } from "./commands/steamRegister";
import { GenshinRegister } from "./commands/GenshinRegister";
import { startTrackerCS2 } from "./services/csPoller";
import { executeLeaderboard } from "./commands/Leaderboard";
import { executarDiagnosticoDeBoot } from "./services/systemCheck";



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

    // 2. COMANDOS DA SESSÃO STEAM
    if (FormattedMessage.startsWith("!registrar-steam") || FormattedMessage === "!perfil-steam") {
        // Agora qualquer um dos dois comandos entra aqui e vai lá pro arquivo de comando se resolver!
        return steamRegister(message, discordIdUser);
    }

    // 3. COMANDOS DA SESSÃO HOYOVERSE (GENSHIN POR ENQUANTO!)
    if (FormattedMessage.startsWith("!registrar-genshin") || FormattedMessage === "!perfil-genshin") {
        // Agora qualquer um dos dois comandos entra aqui e vai lá pro arquivo de comando se resolver!
        return GenshinRegister(message, discordIdUser);
    }

// 4. COMANDO DE REGISTRO DO CS2
    if(FormattedMessage.startsWith("!registrar-cs")) {
        const args = message.content.split(" ");
        
        const authCode = args[1];
        const knowMatch = args[2]; 

        if (!authCode || !knowMatch) {
            return message.reply("[!] **Formato incorreto!** Você precisa informar os dois códigos.\n👉 Uso correto: `!registrar-cs <AuthCode> <MatchToken>`");
        }

        return registerCS(message, authCode, knowMatch);
    }


    if (FormattedMessage === "!statuscs") {
        // Agora o index só chama a função e passa a bola para o arquivo do comando!
        return executeStatusCS(message, discordIdUser);
    }  

    if(FormattedMessage.startsWith("!leaderboard")) {
        return executeLeaderboard(message)
    }


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

// Remember

// (1) git add . | (2) git commit -m "digite aqui" | (3) git push -u origin main 