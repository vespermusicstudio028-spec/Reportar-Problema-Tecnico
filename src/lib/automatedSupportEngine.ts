import { ClientSupportMemory, ContextualReply, SupportIntent } from '../types/clientMemory';
import { recordIssueAndSolutionInMemory, saveSupportSession } from './clientMemoryService';
import { supabase } from './supabase';

/**
 * Classifica a intenção da mensagem enviada pelo cliente
 */
export function detectSupportIntent(text: string): SupportIntent {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 1. Retorno de problema recorrente
  if (
    lower.includes('voltou') ||
    lower.includes('continua') ||
    lower.includes('ainda esta') ||
    lower.includes('ainda ta') ||
    lower.includes('nao resolveu') ||
    lower.includes('nao funcionou') ||
    lower.includes('mesmo problema') ||
    lower.includes('fiz o que mandou')
  ) {
    return 'RETORNO_PROBLEMA';
  }

  // 2. Confirmação positiva
  if (
    lower === 'ok' ||
    lower === 'deu certo' ||
    lower.includes('funcionou') ||
    lower.includes('obrigado') ||
    lower.includes('valeu') ||
    lower.includes('tudo certo') ||
    lower.includes('voltou ao normal')
  ) {
    return 'CONFIRMACAO_OK';
  }

  // 3. Sinal / Travamento / Queda de conexão
  if (
    lower.includes('sinal') ||
    lower.includes('travando') ||
    lower.includes('trava') ||
    lower.includes('fora do ar') ||
    lower.includes('nao carrega') ||
    lower.includes('tela preta') ||
    lower.includes('canal') ||
    lower.includes('canais') ||
    lower.includes('caindo') ||
    lower.includes('buffering') ||
    lower.includes('lentidao') ||
    lower.includes('carregando')
  ) {
    return 'SINAL_TRAVAMENTO';
  }

  // 4. Áudio / Legenda
  if (
    lower.includes('sem audio') ||
    lower.includes('sem som') ||
    lower.includes('ingles') ||
    lower.includes('legenda') ||
    lower.includes('idioma') ||
    lower.includes('mudo')
  ) {
    return 'SEM_AUDIO_LEGENDA';
  }

  // 5. Teste Gratuito
  if (
    lower.includes('teste') ||
    lower.includes('testar') ||
    lower.includes('3 horas') ||
    lower.includes('3h') ||
    lower.includes('degustacao')
  ) {
    return 'TESTE_GRATIS';
  }

  // 6. Pagamento / Renovação / Pix / Comprovante
  if (
    lower.includes('renovar') ||
    lower.includes('renovacao') ||
    lower.includes('pagar') ||
    lower.includes('pagamento') ||
    lower.includes('pix') ||
    lower.includes('comprovante') ||
    lower.includes('vencimento') ||
    lower.includes('venceu') ||
    lower.includes('fatura') ||
    lower.includes('valor') ||
    lower.includes('chave pix')
  ) {
    return 'PAGAMENTO_RENOVACAO';
  }

  // 7. Novo Ponto / Tela Adicional
  if (
    lower.includes('ponto') ||
    lower.includes('tela adicional') ||
    lower.includes('mais uma tela') ||
    lower.includes('segundo aparelho') ||
    lower.includes('outra tv')
  ) {
    return 'NOVO_PONTO';
  }

  // 8. Configuração de aplicativo
  if (
    lower.includes('configurar') ||
    lower.includes('dns') ||
    lower.includes('login') ||
    lower.includes('senha') ||
    lower.includes('url') ||
    lower.includes('porta') ||
    lower.includes('instalar')
  ) {
    return 'CONFIGURACAO_APP';
  }

  // 9. Episódio / Filme / Série
  if (
    lower.includes('episodio') ||
    lower.includes('temporada') ||
    lower.includes('filme') ||
    lower.includes('serie') ||
    lower.includes('catalogo')
  ) {
    return 'EPISODIO_CONTEUDO';
  }

  return 'DUVIDA_GERAL';
}

/**
 * Gera a resposta inteligente e contextual baseando-se na memória individual do cliente
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
  const realPrice = clientDbData?.price ? Number(clientDbData.price).toFixed(2).replace('.', ',') : '35,00';
  const numScreens = Array.isArray(clientDbData?.access_points) ? clientDbData.access_points.length : 1;

  // 1. CASO: RETORNO DE PROBLEMA ("meu problema voltou", "continua ruim")
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

  // 2. CASO: SINAL E TRAVAMENTO
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

    const reply = `${greetings}\n\n📡 **Diagnóstico Rápido de Conexão:**\nNossos servidores centrais estão operando com 99.8% de estabilidade neste momento. Para resolver travamentos ou lentidão:\n\n1. **Troca de Player:** No menu do seu app, altere o reprodutor de vídeo para *VLC* ou *ExoPlayer* (Hardware).\n2. **Conexão:** Se o seu aparelho estiver no Wi-Fi 2.4GHz, tente conectar via cabo de rede ou na rede 5GHz.\n3. **Atualização da Lista:** No menu do app, clique em *Atualizar Conteúdo / Refresh* para sincronizar os canais.\n\nMe avise se o travamento ocorre em todos os canais ou apenas em algum canal específico! 📺`;

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

  // 3. CASO: PAGAMENTO E RENOVAÇÃO
  if (intent === 'PAGAMENTO_RENOVACAO') {
    const screensText = numScreens > 1 ? `${numScreens} Telas Simultâneas` : '1 Tela';
    const reply = `🤖 **Central de Pagamento & Renovação:**\n\nOlá, **${clientName}**! Consultei seus dados oficiais no sistema:\n\n📋 **Seu Plano Atual:** *${planName}* (${screensText})\n💰 **Valor Oficial:** *R$ ${realPrice}*\n\n👉 Para renovar agora mesmo com liberação rápida, você pode gerar a chave Pix ou pagar via Mercado Pago pelo botão interativo de renovação no atalho rápido do chat!\n\nApós o pagamento, basta clicar em **Enviar Comprovante** que nosso sistema faz a confirmação imediata. 💳✅`;

    const summary = `Consulta de pagamento/renovação. Informados valores reais cadastrados (${planName} - R$ ${realPrice}).`;

    await saveSupportSession({
      client_code: memory.client_code,
      client_name: clientName,
      topic: 'Pagamento e Renovação',
      status: 'resolvido',
      summary,
      detected_issue: 'Dúvida/solicitação de pagamento',
      applied_solution: 'Envio de dados reais de cobrança'
    });

    return {
      intent,
      replyText: reply,
      summary,
      detectedIssue: 'Consulta de pagamento',
      appliedSolution: 'Apresentação dos valores reais do plano cadastrado'
    };
  }

  // 4. CASO: TESTE GRATUITO (REGRAS REAIS)
  if (intent === 'TESTE_GRATIS') {
    const isAlreadyTested = memory.trial_status === 'expirado' || memory.trial_status === 'convertido';
    const isTrialActive = memory.trial_status === 'ativo';

    if (isTrialActive) {
      const reply = `🤖 Olá, **${clientName}**! Verifiquei no sistema que você possui um **Teste Gratuito de 3h ativo** neste momento!\n\nAproveite para navegar por todos os canais, filmes e séries. Caso queira transformar seu teste em assinatura permanente com desconto exclusivo, é só me avisar! 🍿📺`;
      return {
        intent,
        replyText: reply,
        summary: 'Cliente consultou teste grátis ativo no momento.'
      };
    }

    if (isAlreadyTested) {
      const reply = `🤖 Olá, **${clientName}**! Consultei seu cadastro e verifiquei que você **já realizou o teste gratuito de 3h** anteriormente.\n\nDe acordo com as diretrizes da plataforma, liberamos 1 teste de degustação por cliente. Mas você pode assinar agora com liberação imediata por apenas **R$ ${realPrice}** no plano *${planName}*! 🚀\n\nDeseja que eu envie o link de ativação imediata?`;
      return {
        intent,
        replyText: reply,
        summary: 'Cliente solicitou novo teste mas já havia usufruído do teste de 3h anteriormente.'
      };
    }

    const reply = `🤖 Olá, **${clientName}**! Você pode realizar um **Teste Grátis de 3h completo** sem compromisso!\n\nPara iniciar, clique no botão **Fazer Teste Grátis de 3h** na tela inicial do app ou me informe qual aparelho você deseja usar (Smart TV, Celular ou TV Box) que liberamos na hora! 🍿🎉`;
    return {
      intent,
      replyText: reply,
      summary: 'Orientado cliente sobre liberação do primeiro teste gratuito de 3h.'
    };
  }

  // 5. CASO: SEM ÁUDIO OU LEGENDA
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

  // 6. CASO: NOVO PONTO
  if (intent === 'NOVO_PONTO') {
    const reply = `🤖 Olá, **${clientName}**! Você pode adicionar mais telas à sua conta a qualquer momento.\n\n📺 Cada ponto adicional custa apenas **R$ 35,00** e você pode assistir em aparelhos diferentes simultaneamente.\n\nPara cadastrar o novo aparelho, basta clicar no atalho **➕ 1 Ponto** aqui no chat!`;
    return {
      intent,
      replyText: reply,
      summary: 'Orientações sobre solicitação e custos de ponto adicional.'
    };
  }

  // 7. CASO: CONFIRMAÇÃO DE SUCESSO
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

  // 8. CASO: DÚVIDA GERAL / PADRÃO
  const reply = `🤖 Olá, **${clientName}**! Recebi sua mensagem.\n\nEstou acompanhando seu atendimento em tempo real. Se sua dúvida for sobre **sinal**, **pagamento**, **configuração de aplicativo** ou **teste**, você pode usar os atalhos rápidos ou detalhar aqui que resolvo para você!\n\nNossa equipe humana também está conectada para acompanhar seu chamado. 🛠️✨`;

  return {
    intent: 'DUVIDA_GERAL',
    replyText: reply,
    summary: 'Atendimento inicial automático com saudação personalizada.'
  };
}
