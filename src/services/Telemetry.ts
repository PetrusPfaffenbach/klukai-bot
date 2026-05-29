import { Client, TextChannel } from "discord.js";

export async function sendTelemetry(client: Client, errorMessage: string) {
    try {
        const channelID = process.env.DIAG_ID as string; // Seu canal de bots
        
        const LogChannel = (client.channels.cache.get(channelID) ||
                            client.channels.cache.find((c: any) => c.name === '『🤖』klukai-diagnostics')) as TextChannel;
                            
        if (LogChannel) {
            await LogChannel.send(`**[TELEMETRIA KLUKAI]**\n\`\`\`log\n${errorMessage}\n\`\`\``);
        } else {
            console.log("[Telemetry] Canal de log não encontrado no Discord.");
        }    
    } catch (e) {
        console.error("Falha ao enviar o log para o canal de debug do Discord:", e);
    }
}