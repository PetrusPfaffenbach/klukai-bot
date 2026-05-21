export function analyzeDPS(avatarData: any) {
    // Força a conversão para número absoluto para evitar o bug de concatenação de Strings
    const taxaCritica = Number(avatarData.fightPropMap?.["20"] || 0.05) * 100;
    const danoCritico = Number(avatarData.fightPropMap?.["22"] || 0.50) * 100;

    const cvTotal = (taxaCritica * 2) + danoCritico;

    let isDps = false;
    let classificacao = "🛡️ Suporte (Foco em Utilidade)";
    let corDestaque = "#FFFFFF"; 

    if (cvTotal >= 260) {
        isDps = true;
        classificacao = "🔥 Hyper Carry (DPS Tier S)";
        corDestaque = "#FFD700"; 
    } else if (cvTotal >= 220) {
        isDps = true;
        classificacao = "⚔️ DPS Principal (Tier A)";
        corDestaque = "#FF4500"; 
    } else if (cvTotal >= 180) {
        isDps = true;
        classificacao = "⚖️ Sub-DPS (Híbrido)";
        corDestaque = "#00FFFF"; 
    }

    return {
        taxaCritica: taxaCritica.toFixed(1),
        danoCritico: danoCritico.toFixed(1),
        cvTotal: Math.floor(cvTotal),
        isDps,
        classificacao,
        corDestaque
    };
}