import { ClientSupportMemory, ContextualReply, SupportIntent } from '../types/clientMemory';
import { recordIssueAndSolutionInMemory, saveSupportSession } from './clientMemoryService';
import { fetchStoreProducts } from './storeService';
import { supabase } from './supabase';

/**
 * Classifica a intenção da mensagem enviada pelo cliente.
 * A ordem dos ifs é importante: intenções mais específicas primeiro.
 */
export function detectSupportIntent(text: string): SupportIntent {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Retorno de problema recorrente
  if (
    lower.includes('ainda esta') ||
    lower.includes('ainda ta') ||
    lower.includes('nao resolveu') ||
    lower.includes('nao funcionou') ||
    lower.includes('nao adiantou') ||
    lower.includes('mesmo problema') ||
    lower.includes('fiz o que mandou') ||
    lower.includes('continua igual') ||
    lower.includes('persistindo') ||
    lower.includes('voltou o problema') ||
    lower.includes('problema voltou')
  ) {
    return 'RETORNO_PROBLEMA';
  }

  // 2. Confirmação positiva
  if (
    lower === 'ok' ||
    lower === 'deu certo' ||
    lower === 'beleza' ||
    lower === 'certo' ||
    lower === 'entendi' ||
    lower.includes('funcionou') ||
    lower.includes('obrigado') ||
    lower.includes('obrigada') ||
    lower.includes('valeu') ||
    lower.includes('tudo certo') ||
    lower.includes('voltou ao normal') ||
    lower.includes('resolveu') ||
    lower.includes('ta bom agora') ||
    lower.includes('ta otimo') ||
    lower.includes('ta funcionando')
  ) {
    return 'CONFIRMACAO_OK';
  }

  // 3. PAGAMENTO / RENOVAÇÃO — verificado ANTES de sinal para evitar conflito com 'canal'
  // Palavras de ação financeira/renovação têm prioridade máxima
  if (
    lower.includes('renovar') ||
    lower.includes('renovar canal') ||
    lower.includes('renovar canais') ||
    lower.includes('renovar o canal') ||
    lower.includes('renovar os canais') ||
    lower.includes('renovar meu canal') ||
    lower.includes('renovar minha assinatura') ||
    lower.includes('renovar o acesso') ||
    lower.includes('renovar o sinal') ||
    lower.includes('renovar meu sinal') ||
    lower.includes('renovacao') ||
    lower.includes('renovação') ||
    lower.includes('pagar') ||
    lower.includes('pagamento') ||
    lower.includes('pix') ||
    lower.includes('comprovante') ||
    lower.includes('vencimento') ||
    lower.includes('venceu') ||
    lower.includes('vencendo') ||
    lower.includes('fatura') ||
    lower.includes('chave pix') ||
    lower.includes('link de pagamento') ||
    lower.includes('link pagamento') ||
    lower.includes('como pagar') ||
    lower.includes('forma de pagamento') ||
    lower.includes('quero pagar') ||
    lower.includes('quero renovar') ||
    lower.includes('preciso renovar') ||
    lower.includes('meu acesso venceu') ||
    lower.includes('meu plano venceu') ||
    lower.includes('perdeu o acesso') ||
    lower.includes('sem acesso') ||
    lower.includes('acesso expirou') ||
    lower.includes('assinatura venceu') ||
    lower.includes('mensalidade')
  ) {
    return 'PAGAMENTO_RENOVACAO';
  }

  // 4. Loja / Produtos / Planos / Assinar
  if (
    lower.includes('loja') ||
    lower.includes('produto') ||
    lower.includes('produtos') ||
    lower.includes('plano') ||
    lower.includes('planos') ||
    lower.includes('assinar') ||
    lower.includes('assinatura') ||
    lower.includes('contratar') ||
    lower.includes('quero assinar') ||
    lower.includes('quero contratar') ||
    lower.includes('quero um plano') ||
    lower.includes('ver planos') ||
    lower.includes('ver produtos') ||
    lower.includes('tem promocao') ||
    lower.includes('promocao') ||
    lower.includes('oferta') ||
    lower.includes('desconto') ||
    lower.includes('quanto custa') ||
    lower.includes('qual o preco') ||
    lower.includes('qual o valor') ||
    lower.includes('o preco') ||
    lower.includes('o valor') ||
    lower.includes('tem pacote') ||
    lower.includes('quais sao os planos') ||
    lower.includes('ver oferta') ||
    lower.includes('ver opcoes')
  ) {
    return 'LOJA_PRODUTOS';
  }

  // 5. Sinal / Travamento / Queda de conexão
  // ATENÇÃO: 'canal' e 'canais' sozinhos NÃO disparam aqui — precisam de contexto de problema
  if (
    lower.includes('travando') ||
    lower.includes('trava') ||
    lower.includes('fora do ar') ||
    lower.includes('nao carrega') ||
    lower.includes('nao abre') ||
    lower.includes('tela preta') ||
    lower.includes('sem sinal') ||
    lower.includes('nao tem sinal') ||
    lower.includes('canal travando') ||
    lower.includes('canal cortando') ||
    lower.includes('canal caindo') ||
    lower.includes('canal sem imagem') ||
    lower.includes('canais travando') ||
    lower.includes('canais caindo') ||
    lower.includes('caindo') ||
    lower.includes('buffering') ||
    lower.includes('lentidao') ||
    lower.includes('picotando') ||
    lower.includes('cortando') ||
    lower.includes('freezando') ||
    lower.includes('congelando') ||
    lower.includes('congela') ||
    lower.includes('demora carregar') ||
    lower.includes('demora para abrir') ||
    lower.includes('fica travando') ||
    lower.includes('fica cortando') ||
    lower.includes('nao reproduz') ||
    lower.includes('erro de reproducao') ||
    lower.includes('lista nao carrega') ||
    (lower.includes('sinal') && !lower.includes('renovar o sinal') && !lower.includes('renovar meu sinal'))
  ) {
    return 'SINAL_TRAVAMENTO';
  }

  // 5. Áudio / Legenda
  if (
    lower.includes('sem audio') ||
    lower.includes('sem som') ||
    lower.includes('ingles') ||
    lower.includes('legenda') ||
    lower.includes('idioma') ||
    lower.includes('mudo') ||
    lower.includes('audio errado') ||
    lower.includes('dublado') ||
    lower.includes('nao tem som') ||
    lower.includes('som em ingles') ||
    lower.includes('faixa de audio')
  ) {
    return 'SEM_AUDIO_LEGENDA';
  }

  // 6. Dispositivo / Aparelho (cliente informando qual usa)
  if (
    lower.includes('smart tv') ||
    lower.includes('tv box') ||
    lower.includes('fire stick') ||
    lower.includes('firestick') ||
    lower.includes('chromecast') ||
    lower.includes('android tv') ||
    lower.includes('meu celular') ||
    lower.includes('no celular') ||
    lower.includes('no tablet') ||
    lower.includes('no computador') ||
    lower.includes('no pc') ||
    lower.includes('uso no') ||
    lower.includes('tenho uma') ||
    lower.includes('tenho um') ||
    (lower.includes('aparelho') && !lower.includes('segundo aparelho') && !lower.includes('outra tv'))
  ) {
    return 'DISPOSITIVO_APARELHO';
  }

  // 7. Teste Gratuito
  if (
    lower.includes('teste') ||
    lower.includes('testar') ||
    lower.includes('3 horas') ||
    lower.includes('3h') ||
    lower.includes('degustacao') ||
    lower.includes('degustação') ||
    lower.includes('gratis') ||
    lower.includes('gratuito') ||
    lower.includes('experimentar') ||
    lower.includes('quero testar') ||
    lower.includes('teste gratis')
  ) {
    return 'TESTE_GRATIS';
  }

  // (PAGAMENTO_RENOVACAO já verificado acima — antes de SINAL_TRAVAMENTO)

  // 9. Novo Ponto / Tela Adicional
  if (
    lower.includes('ponto') ||
    lower.includes('tela adicional') ||
    lower.includes('mais uma tela') ||
    lower.includes('segundo aparelho') ||
    lower.includes('outra tv') ||
    lower.includes('outra tela') ||
    lower.includes('mais um acesso') ||
    lower.includes('dois acessos') ||
    lower.includes('duas telas') ||
    lower.includes('adicionar aparelho')
  ) {
    return 'NOVO_PONTO';
  }

  // 10. Configuração de aplicativo
  if (
    lower.includes('configurar') ||
    lower.includes('dns') ||
    lower.includes('como configurar') ||
    lower.includes('como instalar') ||
    lower.includes('nao sei configurar') ||
    lower.includes('login') ||
    lower.includes('senha') ||
    lower.includes('url') ||
    lower.includes('porta') ||
    lower.includes('instalar') ||
    lower.includes('como usar') ||
    lower.includes('nao sei usar') ||
    lower.includes('como entrar') ||
    lower.includes('como acessar') ||
    lower.includes('usuario') ||
    lower.includes('user') ||
    lower.includes('pass') ||
    lower.includes('codigo de acesso') ||
    lower.includes('meu codigo')
  ) {
    return 'CONFIGURACAO_APP';
  }

  // 11. Episódio / Filme / Série / Conteúdo
  if (
    lower.includes('episodio') ||
    lower.includes('temporada') ||
    lower.includes('filme') ||
    lower.includes('serie') ||
    lower.includes('catalogo') ||
    lower.includes('catálogo') ||
    lower.includes('conteudo') ||
    lower.includes('programa') ||
    lower.includes('onde acho') ||
    lower.includes('onde tem') ||
    lower.includes('pedir filme') ||
    lower.includes('pedir serie') ||
    lower.includes('quero assistir') ||
    lower.includes('esta disponivel') ||
    lower.includes('tem na lista') ||
    lower.includes('documentario') ||
    lower.includes('novela') ||
    lower.includes('infantil') ||
    lower.includes('desenho')
  ) {
    return 'EPISODIO_CONTEUDO';
  }

  return 'DUVIDA_GERAL';
}

/**
 * Gera a resposta inteligente e contextual baseando-se na memória individual do cliente.
 * Consulta em tempo real: dados do cliente, plano, aparelho e produtos da loja.
 */
export async function processClientSupportMessage(
  clientMessage: string,
  memory: ClientSupportMemory
): Promise<ContextualReply> {
  const intent = detectSupportIntent(clientMessage);
  const clientName = memory.client_name || 'Cliente';
  const device = memory.device || '';
  const app = memory.active_app || '';
  const hasKnownDevice = Boolean(device && device !== 'Outro');
  const hasKnownApp = Boolean(app);

  // Consultar dados cadastrais atualizados do cliente no Supabase
  let clientDbData: any = null;
  try {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('code', memory.client_code)
      .maybeSingle();
    clientDbData = data;
  } catch (e) {
    console.warn('Erro ao consultar clients no engine:', e);
  }

  // Preço real e plano
  const planName = clientDbData?.plan || memory.plan || 'Mensal';
  const realPrice = clientDbData?.price
    ? Number(clientDbData.price).toFixed(2).replace('.', ',')
    : '35,00';
  const numScreens = Array.isArray(clientDbData?.access_points)
    ? clientDbData.access_points.length
    : 1;

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: LOJA / PRODUTOS / PLANOS
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'LOJA_PRODUTOS') {
    try {
      const products = await fetchStoreProducts(true); // apenas ativos/visíveis

      if (products.length === 0) {
        const reply = `🤖 Olá, **${clientName}**! Nossa loja está sendo atualizada com novos planos incríveis! 🛍️\n\nEm breve teremos todas as opções disponíveis para você. Por enquanto, você pode usar o atalho **🛍️ Loja** no chat para ver o que já está disponível!\n\nQualquer dúvida sobre valores ou planos, estou aqui para ajudar! 💬`;
        return { intent, replyText: reply, summary: 'Cliente perguntou sobre loja/planos. Loja sem produtos cadastrados no momento.' };
      }

      // Montar lista resumida dos produtos para o chat
      const productLines = products.slice(0, 5).map((p) => {
        const priceFormatted = Number(p.price).toFixed(2).replace('.', ',');
        const badge = p.badge ? ` ⭐ *${p.badge}*` : '';
        const screens = p.screens ? ` — ${p.screens}` : '';
        const features = Array.isArray(p.features) && p.features.length > 0
          ? `\n   ✅ ${p.features.slice(0, 2).join('\n   ✅ ')}`
          : '';
        return `📦 **${p.name}**${badge}\n   💰 R$ ${priceFormatted}${p.period}${screens}${features}`;
      }).join('\n\n');

      const moreText = products.length > 5 ? `\n\n📌 E mais ${products.length - 5} plano(s) disponível(is) na loja!` : '';

      const reply = `🤖 Olá, **${clientName}**! Aqui estão nossos planos e produtos disponíveis agora:\n\n${productLines}${moreText}\n\n👉 Para ver fotos, vídeos e descrições completas de cada plano, clique no botão **🛍️ Loja** no chat!\n\nPosso te ajudar a escolher o melhor plano para você? 😊`;

      await saveSupportSession({
        client_code: memory.client_code,
        client_name: clientName,
        topic: 'Consulta de Loja e Produtos',
        status: 'resolvido',
        summary: `Cliente consultou planos/produtos. Exibidos ${products.length} produto(s) da loja.`,
        detected_issue: 'Interesse em planos/produtos',
        applied_solution: 'Lista de produtos da loja enviada automaticamente'
      });

      return {
        intent,
        replyText: reply,
        summary: `Cliente consultou loja. ${products.length} produto(s) exibido(s).`
      };
    } catch (storeErr) {
      console.warn('Erro ao buscar produtos da loja no bot:', storeErr);
      const reply = `🤖 Olá, **${clientName}**! Para ver todos os nossos planos e produtos com preços, fotos e detalhes completos, clique no botão **🛍️ Loja** aqui no chat! 🛍️\n\nSe tiver alguma dúvida específica sobre valores ou planos, é só perguntar! 💬`;
      return { intent, replyText: reply, summary: 'Cliente consultou loja. Erro ao buscar produtos, enviado guia para botão Loja.' };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: DISPOSITIVO / APARELHO (cliente informando qual dispositivo usa)
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'DISPOSITIVO_APARELHO') {
    // Detectar o dispositivo mencionado na mensagem
    const lower = clientMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let detectedDevice = device;
    let detectedApp = app;

    if (lower.includes('smart tv') || lower.includes('tv samsung') || lower.includes('tv lg') || lower.includes('tv philips')) {
      detectedDevice = 'Smart TV';
    } else if (lower.includes('tv box') || lower.includes('tvbox') || lower.includes('box android')) {
      detectedDevice = 'TV Box';
    } else if (lower.includes('fire stick') || lower.includes('firestick') || lower.includes('fire tv')) {
      detectedDevice = 'Fire Stick';
    } else if (lower.includes('chromecast')) {
      detectedDevice = 'Chromecast';
    } else if (lower.includes('celular') || lower.includes('android') || lower.includes('iphone') || lower.includes('smartphone')) {
      detectedDevice = 'Celular';
    } else if (lower.includes('tablet') || lower.includes('ipad')) {
      detectedDevice = 'Tablet';
    } else if (lower.includes('computador') || lower.includes('pc') || lower.includes('notebook') || lower.includes('laptop')) {
      detectedDevice = 'Computador';
    }

    // Salvar dispositivo detectado na memória se for novo
    if (detectedDevice && detectedDevice !== device) {
      await recordIssueAndSolutionInMemory(
        memory.client_code,
        `Dispositivo identificado: ${detectedDevice}`,
        'Registro automático de dispositivo na memória',
        detectedDevice,
        detectedApp
      );
    }

    // Dicas específicas por dispositivo
    let deviceTip = '';
    if (detectedDevice === 'Smart TV') {
      deviceTip = `\n\n📺 **Dicas para Smart TV:**\n• Use o app *IPTV Smarters* ou *Smart IPTV* pela Samsung/LG Store\n• Para melhor qualidade, conecte via **cabo de rede** ao invés de Wi-Fi\n• Reinicie a TV pela tomada (não pelo controle) para limpar o cache`;
    } else if (detectedDevice === 'TV Box') {
      deviceTip = `\n\n📦 **Dicas para TV Box:**\n• Recomendamos os apps *Smarters Pro* ou *TiviMate*\n• Ative o modo **Developer Options** para melhor performance\n• Conecte via cabo de rede para eliminar instabilidade`;
    } else if (detectedDevice === 'Fire Stick') {
      deviceTip = `\n\n🔥 **Dicas para Fire Stick:**\n• Use o app *Downloader* para instalar o *IPTV Smarters* ou *TiviMate*\n• Em Configurações > Meu Fire TV > Sobre > Rede: verifique a velocidade\n• Habilite *Apps de Fontes Desconhecidas* nas configurações`;
    } else if (detectedDevice === 'Celular') {
      deviceTip = `\n\n📱 **Dicas para Celular:**\n• Use o app *IPTV Smarters Pro* (Android/iOS)\n• Em redes 4G/5G funciona perfeitamente\n• Para assistir em qualidade HD, use Wi-Fi 5GHz`;
    } else if (detectedDevice === 'Computador') {
      deviceTip = `\n\n💻 **Dicas para Computador:**\n• Use o player *VLC* ou o app *IPTV Smarters* pela web\n• URL M3U e código de acesso para configuração rápida\n• Funciona em qualquer navegador com o player correto`;
    }

    const savedDevice = detectedDevice || 'seu aparelho';
    const reply = `🤖 Ótimo, **${clientName}**! Registrei em seu perfil que você utiliza **${savedDevice}**. 📱✅\n\nIsso nos ajuda a personalizar todo o suporte para o seu dispositivo!${deviceTip}\n\nPosso te ajudar com mais alguma coisa? Se tiver problemas de sinal, configuração ou qualquer dúvida, é só falar! 😊`;

    return {
      intent,
      replyText: reply,
      summary: `Dispositivo identificado e registrado na memória: ${savedDevice}.`,
      updatedDevice: detectedDevice || undefined,
      updatedApp: detectedApp || undefined
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: RETORNO DE PROBLEMA (reincidência)
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'RETORNO_PROBLEMA') {
    const lastIssue = memory.reported_issues && memory.reported_issues.length > 0 ? memory.reported_issues[0] : null;
    const lastSol = memory.applied_solutions && memory.applied_solutions.length > 0 ? memory.applied_solutions[0] : null;

    let deviceContext = '';
    if (hasKnownDevice && hasKnownApp) {
      deviceContext = `no seu aplicativo *${app}* na sua *${device}*`;
    } else if (hasKnownApp) {
      deviceContext = `no aplicativo *${app}*`;
    } else if (hasKnownDevice) {
      deviceContext = `na sua *${device}*`;
    }

    let intro = `🤖 Olá, **${clientName}**! Entendi perfeitamente.`;
    if (lastIssue) {
      intro += ` Vi no seu histórico que você relatou anteriormente um problema de **${lastIssue.issue}** ${deviceContext}.`;
    } else {
      intro += ` Analisei seu histórico anterior ${deviceContext}.`;
    }

    if (lastSol) {
      intro += `\nComo a solução anterior (*${lastSol.solution}*) não sustentou a estabilidade, não vamos repetir os mesmos passos.`;
    }

    const reply = `${intro}\n\n🔧 **Próximo procedimento avançado recomendado:**\n1. Feche completamente o aplicativo e limpe o **cache** do aplicativo nas configurações do sistema.\n2. Reinicie seu **modem/roteador de internet** retirando da tomada por 30 segundos para renovar a rota de DNS.\n3. Se persistir, nossa equipe técnica já foi notificada para verificar a rota direta do seu servidor.\n\nVocê já testou reiniciar o modem ou gostaria que eu acionasse um técnico humano para inspecionar sua linha agora?`;

    const summary = `Cliente relatou reincidência de instabilidade. Sistema consultou memória prévia e forneceu procedimentos avançados sem repetir etapas básicas.`;

    await recordIssueAndSolutionInMemory(
      memory.client_code,
      'Reincidência de problema técnico',
      'Procedimento avançado de cache e reinício de rota',
      device,
      app
    );

    await saveSupportSession({
      client_code: memory.client_code,
      client_name: clientName,
      topic: 'Reincidência de Problema Técnico',
      status: 'pendente',
      summary,
      detected_device: device,
      detected_issue: 'Reincidência de sinal/travamento',
      applied_solution: 'Procedimento avançado de rota'
    });

    return {
      intent,
      replyText: reply,
      summary,
      detectedIssue: 'Reincidência de problema técnico',
      appliedSolution: 'Limpeza de cache e reinício de rota de rede'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: SINAL E TRAVAMENTO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'SINAL_TRAVAMENTO') {
    let deviceMention = '';
    if (hasKnownDevice && hasKnownApp) {
      deviceMention = `identifiquei que você está utilizando o aplicativo *${app}* no aparelho *${device}*.`;
    } else if (hasKnownDevice) {
      deviceMention = `identifiquei que seu dispositivo principal é *${device}*.`;
    } else if (hasKnownApp) {
      deviceMention = `identifiquei que você utiliza o aplicativo *${app}*.`;
    }

    const greetings = `🤖 Olá, **${clientName}**! Verifiquei seu acesso.${deviceMention ? ` Em meu sistema ${deviceMention}` : ''}`;

    const reply = `${greetings}\n\n📡 **Diagnóstico Rápido de Conexão:**\nNossos servidores centrais estão operando com 99.8% de estabilidade neste momento. Para resolver travamentos ou lentidão:\n\n1. **Troca de Player:** No menu do seu app, altere o reprodutor de vídeo para *VLC* ou *ExoPlayer (Hardware)*.\n2. **Conexão:** Se o seu aparelho estiver no Wi-Fi 2.4GHz, tente conectar via cabo de rede ou na rede 5GHz.\n3. **Atualização da Lista:** No menu do app, clique em *Atualizar Conteúdo / Refresh* para sincronizar os canais.\n\nMe avise se o travamento ocorre em todos os canais ou apenas em algum canal específico! 📺`;

    const summary = `Cliente relatou travamento ou instabilidade de sinal. Enviadas orientações de player e rede adaptadas ao dispositivo.`;

    await recordIssueAndSolutionInMemory(
      memory.client_code,
      'Sinal com travamento/instabilidade',
      'Orientação de Player e sincronização de rota',
      device,
      app
    );

    await saveSupportSession({
      client_code: memory.client_code,
      client_name: clientName,
      topic: 'Sinal e Conexão',
      status: 'resolvido',
      summary,
      detected_device: device,
      detected_issue: 'Travamento de sinal',
      applied_solution: 'Ajuste de player e conexão'
    });

    return {
      intent,
      replyText: reply,
      summary,
      detectedIssue: 'Travamento de sinal/canais',
      appliedSolution: 'Ajuste de player de vídeo e atualização de rota'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: PAGAMENTO E RENOVAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'PAGAMENTO_RENOVACAO') {
    const lower2 = clientMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const screensText = numScreens > 1 ? `${numScreens} Telas Simultâneas` : '1 Tela';

    // Detectar sub-contexto: o cliente quer renovar canal, app, ou apenas perguntar sobre pagamento?
    const querRenovarCanal =
      lower2.includes('canal') || lower2.includes('canais') || lower2.includes('renovar') || lower2.includes('renovacao');
    const querRenovarApp =
      lower2.includes('aplicativo') || lower2.includes('app') || lower2.includes('acesso') || lower2.includes('streaming');
    const querChavePix =
      lower2.includes('pix') || lower2.includes('chave') || lower2.includes('chave pix') || lower2.includes('como pagar') || lower2.includes('forma de pagamento');
    const querSaberValor =
      lower2.includes('valor') || lower2.includes('preco') || lower2.includes('quanto') || lower2.includes('fatura') || lower2.includes('mensalidade');

    let contextBlock = '';
    if (querChavePix) {
      contextBlock = `\n\n💳 **Para pagar via Pix:**\nUse o botão **🔄 Renovar** no atalho rápido do chat e siga as instruções para gerar a chave Pix ou acessar o link de pagamento. Após confirmar, clique em **📎 Enviar Comprovante** para liberação imediata!`;
    } else if (querSaberValor) {
      contextBlock = `\n\n💰 **Valor do seu plano:** *R$ ${realPrice}* (${planName} — ${screensText})`;
    }

    const reply =
      `🤖 Olá, **${clientName}**! Entendi que você quer **renovar ou resolver algo relacionado ao pagamento**. \n\n` +
      `📋 **Seus dados no sistema:**\n` +
      `• Plano: *${planName}* (${screensText})\n` +
      `• Valor: *R$ ${realPrice}*\n` +
      `${contextBlock}\n\n` +
      `🔄 **Escolha uma opção:**\n` +
      `1️⃣ **Renovar Canais / Sinal** — Use o botão **🔄 Renovar** no chat\n` +
      `2️⃣ **Renovar Aplicativo / Streaming** — Use o botão **🔄 Renovar** e selecione *Sinal do Streaming*\n` +
      `3️⃣ **Ver planos e promoções** — Clique em **🛍️ Loja** no chat\n` +
      `4️⃣ **Enviar comprovante** — Após pagar, clique em **📎 Enviar Comprovante** para liberação imediata\n\n` +
      `Posso te ajudar com mais alguma coisa? 😊`;

    const summary = `Consulta de pagamento/renovação. Cliente perguntou sobre ${querRenovarCanal ? 'renovação de canal' : querRenovarApp ? 'renovação de aplicativo' : 'pagamento'}. Plano: ${planName} - R$ ${realPrice}.`;

    await saveSupportSession({
      client_code: memory.client_code,
      client_name: clientName,
      topic: 'Pagamento e Renovação',
      status: 'resolvido',
      summary,
      detected_issue: 'Dúvida/solicitação de renovação ou pagamento',
      applied_solution: 'Apresentação das opções de renovação e dados reais do plano'
    });

    return {
      intent,
      replyText: reply,
      summary,
      detectedIssue: 'Consulta de pagamento/renovação',
      appliedSolution: 'Menu completo de opções de renovação e pagamento'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: TESTE GRATUITO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'TESTE_GRATIS') {
    const isAlreadyTested = memory.trial_status === 'expirado' || memory.trial_status === 'convertido';
    const isTrialActive = memory.trial_status === 'ativo';

    if (isTrialActive) {
      const reply = `🤖 Olá, **${clientName}**! Verifiquei no sistema que você possui um **Teste Gratuito de 3h ativo** neste momento! 🍿\n\nAproveite para navegar por todos os canais, filmes e séries. Caso queira transformar seu teste em assinatura permanente com desconto exclusivo, é só me avisar! 🎉`;
      return {
        intent,
        replyText: reply,
        summary: 'Cliente consultou teste grátis ativo no momento.'
      };
    }

    if (isAlreadyTested) {
      const reply = `🤖 Olá, **${clientName}**! Consultei seu cadastro e verifiquei que você **já realizou o teste gratuito de 3h** anteriormente.\n\nDe acordo com as diretrizes da plataforma, liberamos 1 teste de degustação por cliente. Mas você pode assinar agora com liberação imediata por apenas **R$ ${realPrice}** no plano *${planName}*! 🚀\n\nPara ver todos os planos disponíveis com preços e benefícios, clique em **🛍️ Loja** no chat!`;
      return {
        intent,
        replyText: reply,
        summary: 'Cliente solicitou novo teste mas já havia usufruído do teste de 3h anteriormente.'
      };
    }

    const reply = `🤖 Olá, **${clientName}**! Você pode realizar um **Teste Grátis de 3h completo** sem compromisso! 🎉\n\nPara iniciar, clique no botão **Fazer Teste Grátis de 3h** na tela inicial do app ou me informe qual aparelho você deseja usar (Smart TV, Celular ou TV Box) que liberamos na hora! 🍿`;
    return {
      intent,
      replyText: reply,
      summary: 'Orientado cliente sobre liberação do primeiro teste gratuito de 3h.'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: SEM ÁUDIO OU LEGENDA
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'SEM_AUDIO_LEGENDA') {
    const reply = `🤖 Olá, **${clientName}**! Para ajustar o idioma ou áudio:\n\n1. Durante a reprodução do canal ou filme, pressione o botão **OK** do controle.\n2. Procure o ícone de **Balão / Faixa de Áudio** (canto superior ou inferior direito).\n3. Alterne a faixa de áudio de *Inglês* para *Português (Brasil)*.\n4. Para legendas, você pode desativá-las no menu *Subtitles / Legendas*.\n\nFaça esse teste rápido e me confirme se o áudio ficou normal! 🔊`;
    return {
      intent,
      replyText: reply,
      summary: 'Orientação técnica para correção de faixa de áudio e legendas.',
      detectedIssue: 'Áudio em inglês ou sem som',
      appliedSolution: 'Ajuste de trilha de áudio no reprodutor'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: NOVO PONTO / TELA ADICIONAL
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'NOVO_PONTO') {
    const reply = `🤖 Olá, **${clientName}**! Você pode adicionar mais telas à sua conta a qualquer momento.\n\n📺 Cada ponto adicional custa apenas **R$ 35,00** e você pode assistir em aparelhos diferentes simultaneamente.\n\nPara cadastrar o novo aparelho, basta clicar no atalho **➕ 1 Ponto** aqui no chat! Ativação imediata após o pagamento. 🚀`;
    return {
      intent,
      replyText: reply,
      summary: 'Orientações sobre solicitação e custos de ponto adicional.'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: CONFIGURAÇÃO DE APLICATIVO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'CONFIGURACAO_APP') {
    const lower = clientMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let appTip = '';

    if (lower.includes('smarters') || lower.includes('iptv smarters')) {
      appTip = '\n\n📲 **No IPTV Smarters:**\nVá em → *Adicionar Usuário* → Selecione *URL Xtream Codes* → Insira o URL, usuário e senha que você recebeu no cadastro.';
    } else if (lower.includes('tivimate')) {
      appTip = '\n\n📲 **No TiviMate:**\nVá em → *Adicionar Lista* → Selecione *Xtream Codes* → Insira o URL e as credenciais de acesso.';
    } else if (lower.includes('m3u') || lower.includes('lista m3u')) {
      appTip = '\n\n📲 **Lista M3U:**\nVocê pode usar sua lista M3U diretamente em qualquer player compatível como *VLC*, *Kodi* ou *My IPTV Player*.';
    } else {
      appTip = '\n\n📲 Recomendamos os apps *IPTV Smarters Pro* ou *TiviMate* para melhor experiência.';
    }

    const reply = `🤖 Olá, **${clientName}**! Vou te ajudar com a configuração!${appTip}\n\n🔑 Suas credenciais de acesso (URL, usuário e senha) foram enviadas no momento do cadastro. Se precisar recuperá-las, use o atalho **🛠️ Suporte** no chat ou acesse **🌐 Minha Área**.\n\nMe informe qual app você está tentando configurar e te passo o passo a passo completo! 😊`;

    return {
      intent,
      replyText: reply,
      summary: 'Assistência de configuração de aplicativo solicitada.',
      detectedIssue: 'Dificuldade de configuração do app',
      appliedSolution: 'Orientações de configuração e credenciais de acesso'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: EPISÓDIO / CONTEÚDO / CATÁLOGO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'EPISODIO_CONTEUDO') {
    const reply = `🤖 Olá, **${clientName}**! Nosso catálogo possui milhares de filmes, séries, canais ao vivo, documentários e muito mais! 🎬🍿\n\n📌 **Para encontrar um conteúdo específico:**\n1. Abra o aplicativo e use a função **🔍 Pesquisar** (lupa)\n2. Digite o nome do filme, série ou canal que deseja\n3. Para séries, você encontrará todas as temporadas e episódios organizados\n\nSe o conteúdo que você procura não estiver disponível, você pode **solicitar** usando o atalho **🎬 Pedir Conteúdo** no chat! Analisamos e adicionamos regularmente. 🎯`;

    return {
      intent,
      replyText: reply,
      summary: 'Orientado sobre busca de conteúdo no catálogo e solicitação de títulos.',
      detectedIssue: 'Dúvida sobre catálogo/conteúdo',
      appliedSolution: 'Orientação de pesquisa e atalho para pedido de conteúdo'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: CONFIRMAÇÃO DE SUCESSO
  // ─────────────────────────────────────────────────────────────────────────
  if (intent === 'CONFIRMACAO_OK') {
    const reply = `🤖 Excelente notícia, **${clientName}**! Fico muito feliz que tudo esteja funcionando 100%! 🎉\n\nRegistrei em seu histórico que o atendimento foi concluído com sucesso. Qualquer dúvida ou necessidade técnica futura, estou sempre por aqui para te ajudar!\n\nTenha um ótimo entretenimento! 🍿📺`;

    await saveSupportSession({
      client_code: memory.client_code,
      client_name: clientName,
      topic: 'Atendimento Concluído',
      status: 'resolvido',
      summary: 'Cliente confirmou resolução com sucesso do problema anterior.'
    });

    return {
      intent,
      replyText: reply,
      summary: 'Atendimento concluído e resolvido com confirmação do cliente.'
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTENT: DÚVIDA GERAL / PADRÃO
  // ─────────────────────────────────────────────────────────────────────────
  const reply = `🤖 Olá, **${clientName}**! Recebi sua mensagem e estou aqui para ajudar! 😊\n\nVocê pode usar os atalhos rápidos abaixo para agilizar seu atendimento:\n\n🔄 **Renovar** — Renovar plano ou sinal\n🛍️ **Loja** — Ver planos e produtos disponíveis\n🛠️ **Suporte** — Problemas técnicos\n➕ **1 Ponto** — Adicionar nova tela\n🎬 **Pedir Conteúdo** — Solicitar filme ou série\n\nOu descreva aqui o que você precisa e resolvo rapidinho! Nossa equipe está sempre acompanhando. 🚀✨`;

  return {
    intent: 'DUVIDA_GERAL',
    replyText: reply,
    summary: 'Atendimento inicial automático com saudação personalizada e menu de atalhos.'
  };
}
