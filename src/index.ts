import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { SteamProfile } from "./services/steamServices";
import { perfilGenshin } from "./services/enkaServices";
import http from "http";
import { registerCS } from "./services/csServices";


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent 
    ]
});

// BANCO DE DADOS TEMPORÁRIO VIA ARRAY
const falseBanco = new Map<string, string>();
const falseBancoGenshin = new Map<string , string>();

client.once("ready", () => {
    console.log(`O motor da ${client.user?.tag} ligou com sucesso!`);
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
    if(FormattedMessage.startsWith("!registrar-steam")) {
        const regex = message.content.match(/\d{17}/);
        const steamIdExtract = regex ? regex[0] : null;
    
    if(!steamIdExtract) {
        return message.reply("SteamID64 não encontrado ou inválido!. Cole seu ID de 17 dígitos ou link completo do perfil");
    }
    falseBanco.set(discordIdUser , steamIdExtract);
    return message.reply(`**SUCESSO** Discord vinculado com o SteamID.`);
    }

    if(FormattedMessage === "!perfilsteam") {
        const steamIdSave = falseBanco.get(discordIdUser);

        if(!steamIdSave) {
            return message.reply("**[!]** Você ainda não se registrou! Digite \`!registrar <seu_link_steam>\`, para ver seu perfil!")
        }

        SteamProfile(message, steamIdSave);
    }

    // 3. COMANDOS DA SESSÃO HOYOVERSE (GENSHIN POR ENQUANTO!)
    
    if(FormattedMessage.startsWith("!registrar-genshin")) {
        const regex2 = message.content.match(/\d{8,10}/);
        const uidExtract = regex2 ? regex2[0] : null;
    
    if(!uidExtract) {
        return message.reply("[!] UID Inválido! Digite um UID válido do Genshin!")
    }
    falseBancoGenshin.set(discordIdUser, uidExtract);
    return message.reply(`**SUCESSO!** Registro da conta do genshin concluída`);
}
    
    if(FormattedMessage === "!perfilgenshin") {
        const savedUid = falseBancoGenshin.get(discordIdUser);
    
        if(!savedUid) {
            return message.reply("**[!]** Você ainda não registrou seu UID do Genshin! utilize \`!registrar_genshin <seu_uid>\` primeiro.")
        }
    
    perfilGenshin(message, savedUid);
    }

    /// 4. COMANDOS DA SESSÃO CS2 (EM DESENVOLVIMENTO!)
    if(FormattedMessage.startsWith("!registrar-cs")) {    
        const parts = message.content.split(" ");

        console.log("A Klukai enxergou as seguintes partes:", parts);

        const authCode = parts[1];
        const knowMatch = parts[2];

        if(!authCode || !knowMatch) {
            return message.reply(
                "[!] **Formato Inválido!** use o formato: \n" +
                "`!registrar-cs <AuthCode> <UltimaMatchCode>`"
            );
        }

        return registerCS(message, authCode, knowMatch);
    }
})

const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Klukai online RANDANDANDAN!");
}).listen(port, () => {
    console.log(`🌍 Servidor de verificação ativo na porta ${port}`);
});

// O login roda na raiz do projeto para dar a partida no bot
client.login(process.env.DISCORD_TOKEN);