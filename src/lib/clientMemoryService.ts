import { supabase } from './supabase';
import { ClientSupportMemory, ClientSupportSession, IssueRecord, SolutionRecord } from '../types/clientMemory';

/**
 * Normaliza e recupera ou inicializa a memória do cliente.
 * Cruza dados da tabela 'clients', 'user_reports' e 'payment_records'.
 */
export async function getOrCreateClientMemory(
  clientCode: string,
  fallbackName: string = 'Cliente'
): Promise<ClientSupportMemory | null> {
  if (!clientCode || !clientCode.trim()) return null;
  const cleanCode = clientCode.trim().toUpperCase();

  try {
    // 1. Verificar se já existe memória persistida
    const { data: existing, error: fetchErr } = await supabase
      .from('client_support_memory')
      .select('*')
      .eq('client_code', cleanCode)
      .maybeSingle();

    if (fetchErr) {
      console.warn('Erro ao consultar client_support_memory:', fetchErr);
    }

    // 2. Buscar dados cadastrais oficiais do cliente no banco (tabela clients)
    const { data: clientRecord } = await supabase
      .from('clients')
      .select('*')
      .eq('code', cleanCode)
      .maybeSingle();

    // Extrair dados dos pontos de acesso do cliente
    let detectedDevice = existing?.device || '';
    let detectedApp = existing?.active_app || clientRecord?.active_app || '';
    if (clientRecord?.access_points) {
      try {
        const points = Array.isArray(clientRecord.access_points)
          ? clientRecord.access_points
          : JSON.parse(clientRecord.access_points);
        if (points.length > 0 && points[0]) {
          if (!detectedApp && points[0].appName) detectedApp = points[0].appName;
        }
      } catch (e) {
        console.warn('Erro ao parsear access_points do cliente:', e);
      }
    }

    // 3. Se já existe memória, sincronizar com dados do cadastro (plano, valor, etc.)
    if (existing) {
      const issues = Array.isArray(existing.reported_issues) ? existing.reported_issues : [];
      const solutions = Array.isArray(existing.applied_solutions) ? existing.applied_solutions : [];
      const preferences = existing.preferences && typeof existing.preferences === 'object' ? existing.preferences : {};

      // Sincronizar se o cliente foi atualizado no cadastro
      let needsSync = false;
      const updates: any = {};

      if (clientRecord) {
        if (!existing.client_id && clientRecord.id) {
          updates.client_id = clientRecord.id;
          needsSync = true;
        }
        if (clientRecord.name && existing.client_name !== clientRecord.name) {
          updates.client_name = clientRecord.name;
          needsSync = true;
        }
        if (clientRecord.plan && existing.plan !== clientRecord.plan) {
          updates.plan = clientRecord.plan;
          needsSync = true;
        }
        if (clientRecord.expiration_date && existing.expiration_date !== clientRecord.expiration_date) {
          updates.expiration_date = clientRecord.expiration_date;
          needsSync = true;
        }
        if (detectedApp && !existing.active_app) {
          updates.active_app = detectedApp;
          needsSync = true;
        }
      }

      if (needsSync) {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from('client_support_memory')
          .update(updates)
          .eq('client_code', cleanCode);
      }

      return {
        ...existing,
        ...updates,
        reported_issues: issues,
        applied_solutions: solutions,
        preferences
      } as ClientSupportMemory;
    }

    // 4. Se não existe memória, criar nova consultando histórico prévio em user_reports
    const { data: previousReports } = await supabase
      .from('user_reports')
      .select('*')
      .eq('client_code', cleanCode)
      .order('timestamp', { ascending: false })
      .limit(5);

    const initialIssues: IssueRecord[] = [];
    if (previousReports && previousReports.length > 0) {
      previousReports.forEach((rep: any) => {
        initialIssues.push({
          id: rep.id,
          issue: `${rep.type || 'Problema'}: ${rep.issue || rep.name || 'Geral'}`,
          device: rep.device || undefined,
          timestamp: rep.timestamp || new Date().toISOString(),
          resolved: true,
          notes: rep.description || undefined
        });
        if (!detectedDevice && rep.device && rep.device !== 'Outro') {
          detectedDevice = rep.device;
        }
      });
    }

    const newMemoryPayload: any = {
      client_code: cleanCode,
      client_id: clientRecord?.id || null,
      client_name: clientRecord?.name || fallbackName,
      device: detectedDevice || (clientRecord?.access_points?.length ? 'Dispositivo Cadastrado' : ''),
      active_app: detectedApp || '',
      account_status: clientRecord?.status || 'ativo',
      trial_status: 'nunca_usou',
      payment_status: 'em_dia',
      plan: clientRecord?.plan || '',
      expiration_date: clientRecord?.expiration_date || null,
      reported_issues: initialIssues,
      applied_solutions: [],
      preferences: {},
      last_topic: initialIssues.length > 0 ? initialIssues[0].issue : 'Boas-vindas',
      last_service_date: new Date().toISOString(),
      last_service_summary: initialIssues.length > 0
        ? `Cliente com ${initialIssues.length} relato(s) técnico(s) anterior(es).`
        : 'Início de histórico do cliente.',
      total_services_count: initialIssues.length > 0 ? 1 : 0
    };

    const { data: created, error: insertErr } = await supabase
      .from('client_support_memory')
      .insert(newMemoryPayload)
      .select('*')
      .single();

    if (insertErr) {
      console.error('Erro ao criar client_support_memory:', insertErr);
      return {
        id: 'temp-' + cleanCode,
        ...newMemoryPayload,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return created as ClientSupportMemory;
  } catch (err) {
    console.error('Falha geral no clientMemoryService:', err);
    return null;
  }
}

/**
 * Atualiza campos específicos na memória do cliente
 */
export async function updateClientMemory(
  clientCode: string,
  partialData: Partial<ClientSupportMemory>
): Promise<ClientSupportMemory | null> {
  if (!clientCode) return null;
  const cleanCode = clientCode.trim().toUpperCase();

  try {
    const payload = {
      ...partialData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('client_support_memory')
      .update(payload)
      .eq('client_code', cleanCode)
      .select('*')
      .single();

    if (error) throw error;
    return data as ClientSupportMemory;
  } catch (err) {
    console.error('Erro ao atualizar memória do cliente:', err);
    return null;
  }
}

/**
 * Registra um problema e solução na memória persistente evitando repetições
 */
export async function recordIssueAndSolutionInMemory(
  clientCode: string,
  issueDescription: string,
  solutionDescription: string,
  device?: string,
  app?: string
): Promise<void> {
  const memory = await getOrCreateClientMemory(clientCode);
  if (!memory) return;

  const currentIssues = Array.isArray(memory.reported_issues) ? [...memory.reported_issues] : [];
  const currentSolutions = Array.isArray(memory.applied_solutions) ? [...memory.applied_solutions] : [];

  // Adicionar issue (máximo 15 no histórico)
  const newIssue: IssueRecord = {
    id: `iss-${Date.now()}`,
    issue: issueDescription,
    device: device || memory.device,
    timestamp: new Date().toISOString(),
    resolved: true
  };
  currentIssues.unshift(newIssue);
  if (currentIssues.length > 15) currentIssues.pop();

  // Adicionar solução (máximo 15 no histórico)
  const newSolution: SolutionRecord = {
    id: `sol-${Date.now()}`,
    solution: solutionDescription,
    issueRelated: issueDescription,
    timestamp: new Date().toISOString(),
    success: true
  };
  currentSolutions.unshift(newSolution);
  if (currentSolutions.length > 15) currentSolutions.pop();

  const updates: Partial<ClientSupportMemory> = {
    reported_issues: currentIssues,
    applied_solutions: currentSolutions,
    last_topic: issueDescription,
    last_service_date: new Date().toISOString(),
    total_services_count: (memory.total_services_count || 0) + 1
  };

  if (device && !memory.device) updates.device = device;
  if (app && !memory.active_app) updates.active_app = app;

  await updateClientMemory(clientCode, updates);
}

/**
 * Cria ou registra uma sessão de atendimento com resumo automático
 */
export async function saveSupportSession(session: {
  client_code: string;
  client_name: string;
  topic: string;
  status: 'resolvido' | 'pendente' | 'encaminhado';
  summary: string;
  detected_device?: string;
  detected_issue?: string;
  applied_solution?: string;
  messages_count?: number;
}): Promise<ClientSupportSession | null> {
  try {
    const { data, error } = await supabase
      .from('client_support_sessions')
      .insert({
        client_code: session.client_code.toUpperCase(),
        client_name: session.client_name,
        topic: session.topic,
        status: session.status,
        summary: session.summary,
        detected_device: session.detected_device || null,
        detected_issue: session.detected_issue || null,
        applied_solution: session.applied_solution || null,
        messages_count: session.messages_count || 1
      })
      .select('*')
      .single();

    if (error) throw error;

    // Atualizar último resumo na memória principal
    await updateClientMemory(session.client_code, {
      last_service_summary: session.summary,
      last_topic: session.topic,
      last_service_date: new Date().toISOString()
    });

    return data as ClientSupportSession;
  } catch (err) {
    console.error('Erro ao salvar sessão de atendimento:', err);
    return null;
  }
}

/**
 * Recupera o histórico de sessões anteriores de um cliente
 */
export async function getClientSupportSessions(clientCode: string): Promise<ClientSupportSession[]> {
  if (!clientCode) return [];
  try {
    const { data, error } = await supabase
      .from('client_support_sessions')
      .select('*')
      .eq('client_code', clientCode.toUpperCase())
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;
    return (data || []) as ClientSupportSession[];
  } catch (err) {
    console.error('Erro ao buscar sessões do cliente:', err);
    return [];
  }
}

/**
 * Redefine ou limpa o histórico da memória de um cliente (ação administrativa)
 */
export async function resetClientMemoryHistory(clientCode: string): Promise<boolean> {
  if (!clientCode) return false;
  try {
    const { error: memErr } = await supabase
      .from('client_support_memory')
      .update({
        reported_issues: [],
        applied_solutions: [],
        last_service_summary: 'Histórico reiniciado pelo administrador.',
        last_topic: 'Histórico limpo',
        updated_at: new Date().toISOString()
      })
      .eq('client_code', clientCode.toUpperCase());

    if (memErr) throw memErr;

    // Excluir sessões arquivadas do cliente se necessário
    await supabase
      .from('client_support_sessions')
      .delete()
      .eq('client_code', clientCode.toUpperCase());

    return true;
  } catch (err) {
    console.error('Erro ao redefinir memória do cliente:', err);
    return false;
  }
}
