export interface IssueRecord {
  id: string;
  issue: string;
  device?: string;
  timestamp: string;
  resolved: boolean;
  notes?: string;
}

export interface SolutionRecord {
  id: string;
  solution: string;
  issueRelated?: string;
  timestamp: string;
  success?: boolean;
}

export interface ClientSupportMemory {
  id: string;
  client_code: string;
  client_id?: string;
  client_name: string;
  device?: string;
  active_app?: string;
  account_status?: string;
  trial_status?: 'nunca_usou' | 'ativo' | 'expirado' | 'convertido';
  trial_start_date?: string;
  trial_end_date?: string;
  payment_status?: string;
  last_payment_date?: string;
  plan?: string;
  expiration_date?: string;
  reported_issues: IssueRecord[];
  applied_solutions: SolutionRecord[];
  preferences: Record<string, any>;
  last_topic?: string;
  last_service_date?: string;
  last_service_summary?: string;
  total_services_count: number;
  created_at: string;
  updated_at: string;
}

export interface ClientSupportSession {
  id: string;
  client_code: string;
  client_name: string;
  topic: string;
  status: 'resolvido' | 'pendente' | 'encaminhado';
  summary?: string;
  detected_device?: string;
  detected_issue?: string;
  applied_solution?: string;
  messages_count: number;
  created_at: string;
}

export type SupportIntent =
  | 'SINAL_TRAVAMENTO'
  | 'SEM_AUDIO_LEGENDA'
  | 'EPISODIO_CONTEUDO'
  | 'PAGAMENTO_RENOVACAO'
  | 'LOJA_PRODUTOS'
  | 'DISPOSITIVO_APARELHO'
  | 'TESTE_GRATIS'
  | 'NOVO_PONTO'
  | 'CONFIGURACAO_APP'
  | 'RETORNO_PROBLEMA'
  | 'CONFIRMACAO_OK'
  | 'DUVIDA_GERAL';

export interface ContextualReply {
  intent: SupportIntent;
  replyText: string;
  summary: string;
  detectedIssue?: string;
  appliedSolution?: string;
  updatedDevice?: string;
  updatedApp?: string;
}
