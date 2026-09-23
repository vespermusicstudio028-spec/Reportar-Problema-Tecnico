export type ServerStatusKey =
  | 'operacional'
  | 'instabilidade'
  | 'desempenho_degradado'
  | 'manutencao_programada'
  | 'em_manutencao'
  | 'indisponivel'
  | 'interrupcao'
  | 'investigando';

export interface ServerStatusOption {
  key: ServerStatusKey;
  label: string;
  badge: string;
  dotColor: string;
  textColor: string;
  bgLightColor: string;
  borderCard: string;
  glowColor: string;
  defaultMessage: string;
  severity: 'normal' | 'aviso' | 'atencao' | 'critico' | 'info';
  iconName: 'CheckCircle2' | 'AlertCircle' | 'Activity' | 'Clock' | 'Wrench' | 'XCircle' | 'AlertTriangle' | 'Search';
}

export interface ServerStatusData {
  statusKey: ServerStatusKey;
  customMessage?: string;
  estimatedTime?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const SERVER_STATUS_OPTIONS: Record<ServerStatusKey, ServerStatusOption> = {
  operacional: {
    key: 'operacional',
    label: 'Operacional',
    badge: '100% Online',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-400',
    bgLightColor: 'bg-emerald-500/10',
    borderCard: 'border-emerald-500/30',
    glowColor: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    defaultMessage: 'Todos os servidores e transmissões estão funcionando normalmente.',
    severity: 'normal',
    iconName: 'CheckCircle2',
  },
  instabilidade: {
    key: 'instabilidade',
    label: 'Instabilidade',
    badge: 'Instável',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-400',
    bgLightColor: 'bg-amber-400/10',
    borderCard: 'border-amber-400/30',
    glowColor: 'shadow-[0_0_10px_rgba(251,191,36,0.5)]',
    defaultMessage: 'Identificamos instabilidades em alguns serviços. Nossa equipe está trabalhando para normalizar o sistema.',
    severity: 'aviso',
    iconName: 'AlertCircle',
  },
  desempenho_degradado: {
    key: 'desempenho_degradado',
    label: 'Desempenho degradado',
    badge: 'Lentidão',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-400',
    bgLightColor: 'bg-orange-500/10',
    borderCard: 'border-orange-500/30',
    glowColor: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]',
    defaultMessage: 'Desempenho reduzido em alguns recursos e transmissões. Nossa equipe está otimizando as rotas.',
    severity: 'atencao',
    iconName: 'Activity',
  },
  manutencao_programada: {
    key: 'manutencao_programada',
    label: 'Manutenção programada',
    badge: 'Agendada',
    dotColor: 'bg-sky-400',
    textColor: 'text-sky-400',
    bgLightColor: 'bg-sky-400/10',
    borderCard: 'border-sky-400/30',
    glowColor: 'shadow-[0_0_10px_rgba(56,189,248,0.5)]',
    defaultMessage: 'Manutenção programada previamente informada em andamento para melhorias na infraestrutura.',
    severity: 'info',
    iconName: 'Clock',
  },
  em_manutencao: {
    key: 'em_manutencao',
    label: 'Em manutenção',
    badge: 'Manutenção',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-400',
    bgLightColor: 'bg-orange-500/10',
    borderCard: 'border-orange-500/30',
    glowColor: 'shadow-[0_0_10px_rgba(249,115,22,0.5)]',
    defaultMessage: 'O servidor está passando por uma manutenção. Alguns recursos podem ficar temporariamente indisponíveis.',
    severity: 'atencao',
    iconName: 'Wrench',
  },
  indisponivel: {
    key: 'indisponivel',
    label: 'Indisponível',
    badge: 'Fora do Ar',
    dotColor: 'bg-red-500',
    textColor: 'text-red-400',
    bgLightColor: 'bg-red-500/10',
    borderCard: 'border-red-500/30',
    glowColor: 'shadow-[0_0_10px_rgba(239,68,68,0.5)]',
    defaultMessage: 'O servidor está temporariamente indisponível. Nossa equipe já está trabalhando para restabelecer o serviço.',
    severity: 'critico',
    iconName: 'XCircle',
  },
  interrupcao: {
    key: 'interrupcao',
    label: 'Interrupção',
    badge: 'Interrompido',
    dotColor: 'bg-rose-600',
    textColor: 'text-rose-400',
    bgLightColor: 'bg-rose-500/10',
    borderCard: 'border-rose-500/30',
    glowColor: 'shadow-[0_0_10px_rgba(225,29,72,0.5)]',
    defaultMessage: 'Serviço interrompido. Falha geral detectada e equipe técnica mobilizada para reativação com máxima prioridade.',
    severity: 'critico',
    iconName: 'AlertTriangle',
  },
  investigando: {
    key: 'investigando',
    label: 'Investigando problema',
    badge: 'Em Análise',
    dotColor: 'bg-yellow-400',
    textColor: 'text-yellow-400',
    bgLightColor: 'bg-yellow-400/10',
    borderCard: 'border-yellow-400/30',
    glowColor: 'shadow-[0_0_10px_rgba(250,204,21,0.5)]',
    defaultMessage: 'Problema sendo investigado. Nossa equipe técnica identificou uma anomalia e está verificando a causa.',
    severity: 'aviso',
    iconName: 'Search',
  },
};

export const DEFAULT_SERVER_STATUS: ServerStatusData = {
  statusKey: 'operacional',
  customMessage: '',
  estimatedTime: '',
  updatedAt: new Date().toISOString(),
};
