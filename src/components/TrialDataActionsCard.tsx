import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  User, 
  Phone, 
  Key, 
  Tv, 
  Smartphone, 
  Hash, 
  Lock, 
  ClipboardCopy, 
  ExternalLink,
  Sparkles
} from 'lucide-react';

export interface TrialExtractedInfo {
  isTrialOrPointRequest: boolean;
  name?: string;
  whatsapp?: string;
  accessCode?: string;
  device?: string;
  appName?: string;
  macCode?: string;
  deviceKey?: string;
  plan?: string;
  price?: string;
}

/**
 * Função utilitária que faz o parsing e extração inteligente dos campos
 * de uma mensagem de solicitação de Teste Grátis ou Ponto Adicional.
 */
export function extractTrialRequestData(
  text: string, 
  fallbackName?: string, 
  fallbackCode?: string,
  fallbackPhone?: string
): TrialExtractedInfo | null {
  if (!text) return null;

  const isTrialRequest = text.includes('Solicitação de Teste Grátis') || 
                        text.includes('Teste Grátis de 3h') || 
                        text.includes('Solicitação de Teste');
  const isPointRequest = text.includes('Solicitação de Ponto Adicional') || 
                         text.includes('Novo Ponto');
  const hasMacOrKey = /código mac|mac address|device key|endereço mac/i.test(text);

  if (!isTrialRequest && !isPointRequest && !hasMacOrKey) {
    return null;
  }

  // Extrai campo com regex flexível (com ou sem asteriscos / emojis)
  const extractField = (patterns: RegExp[]): string | undefined => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val && !/^(não informado|nenhum|null|undefined|-)$/i.test(val)) {
          return val;
        }
      }
    }
    return undefined;
  };

  const name = extractField([
    /(?:👤\s*|•\s*)?\*(?:Cliente Novo|Cliente|Nome):\*\s*([^\n\r]+)/i,
    /(?:Cliente Novo|Cliente|Nome):\s*([^\n\r]+)/i,
  ]) || fallbackName;

  const whatsapp = extractField([
    /(?:📱\s*|•\s*)?\*(?:WhatsApp|Telefone|Fone|Celular):\*\s*([^\n\r]+)/i,
    /(?:WhatsApp|Telefone|Fone|Celular):\s*([^\n\r]+)/i,
  ]) || fallbackPhone;

  const accessCode = extractField([
    /(?:🔑\s*|•\s*)?\*(?:Código de Acesso|Código):\*\s*([A-Za-z0-9]{4,10})/i,
    /(?:Código de Acesso|Código):\s*([A-Za-z0-9]{4,10})/i,
  ]) || fallbackCode;

  const device = extractField([
    /(?:📺\s*|•\s*)?\*(?:Dispositivo|Novo Ponto[^:*]*):\*\s*([^\n\r]+)/i,
    /(?:Dispositivo|Novo Ponto[^:*]*):\s*([^\n\r]+)/i,
  ]);

  const appName = extractField([
    /(?:📲\s*|•\s*)?\*(?:Aplicativo|App):\*\s*([^\n\r|]+)/i,
    /(?:Aplicativo|App):\s*([^\n\r|]+)/i,
  ]);

  const macCode = extractField([
    /(?:🔢\s*|•\s*|\|\s*)?\*(?:Código MAC|Endereço MAC|MAC Address|MAC):\*\s*`?([0-9a-zA-Z:-]{8,24})`?/i,
    /(?:Código MAC|Endereço MAC|MAC Address|MAC):\s*`?([0-9a-zA-Z:-]{8,24})`?/i,
  ]);

  const deviceKey = extractField([
    /(?:🔑\s*|•\s*|\|\s*)?\*(?:Device Key \/ Código|Device Key|DeviceKey|Código do App|Senha do App|Key):\*\s*([^\n\r|]+)/i,
    /(?:Device Key \/ Código|Device Key|DeviceKey|Código do App|Senha do App|Key):\s*([^\n\r|]+)/i,
  ]);

  const plan = extractField([
    /(?:💰\s*|•\s*)?\*(?:Valor do Plano|Plano):\*\s*([^\n\r]+)/i,
  ]);

  return {
    isTrialOrPointRequest: isTrialRequest || isPointRequest || hasMacOrKey,
    name,
    whatsapp,
    accessCode,
    device,
    appName,
    macCode,
    deviceKey,
    plan,
  };
}

interface TrialDataActionsCardProps {
  data: TrialExtractedInfo;
  isClientSender?: boolean;
}

export function TrialDataActionsCard({ data }: TrialDataActionsCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lines: string[] = [];
    if (data.name) lines.push(`Nome: ${data.name}`);
    if (data.whatsapp) lines.push(`WhatsApp: ${data.whatsapp}`);
    if (data.accessCode) lines.push(`Código de Acesso: ${data.accessCode}`);
    if (data.device) lines.push(`Dispositivo: ${data.device}`);
    if (data.appName) lines.push(`Aplicativo: ${data.appName}`);
    if (data.macCode) lines.push(`Código MAC: ${data.macCode}`);
    if (data.deviceKey) lines.push(`Device Key / Código: ${data.deviceKey}`);
    if (data.plan) lines.push(`Plano: ${data.plan}`);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedKey('all');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const items = [
    {
      key: 'name',
      label: 'Nome',
      value: data.name,
      icon: <User size={13} className="text-amber-400" />,
      badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      value: data.whatsapp,
      icon: <Phone size={13} className="text-emerald-400" />,
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      isPhone: true
    },
    {
      key: 'accessCode',
      label: 'Cód. Acesso',
      value: data.accessCode,
      icon: <Key size={13} className="text-indigo-400" />,
      badgeColor: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono'
    },
    {
      key: 'device',
      label: 'Dispositivo',
      value: data.device,
      icon: <Tv size={13} className="text-cyan-400" />,
      badgeColor: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    },
    {
      key: 'appName',
      label: 'Aplicativo',
      value: data.appName,
      icon: <Smartphone size={13} className="text-blue-400" />,
      badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold'
    },
    {
      key: 'macCode',
      label: 'Código MAC',
      value: data.macCode,
      icon: <Hash size={13} className="text-pink-400" />,
      badgeColor: 'border-pink-500/40 bg-pink-500/15 text-pink-300 font-mono font-bold'
    },
    {
      key: 'deviceKey',
      label: 'Device Key / Cód.',
      value: data.deviceKey,
      icon: <Lock size={13} className="text-purple-400" />,
      badgeColor: 'border-purple-500/40 bg-purple-500/15 text-purple-300 font-mono font-bold'
    }
  ].filter(item => Boolean(item.value));

  if (items.length === 0) return null;

  const rawPhone = data.whatsapp ? data.whatsapp.replace(/\D/g, '') : '';

  return (
    <div className="mt-3 rounded-2xl overflow-hidden border border-amber-500/40 bg-[#0d121c] shadow-xl shadow-amber-950/20 text-left">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-indigo-500/10 px-3.5 py-2.5 flex items-center justify-between border-b border-amber-500/25">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-amber-500/20 text-amber-400">
            <Sparkles size={14} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
              Ações Rápidas de Cópia (Admin)
            </span>
            <p className="text-[10px] text-slate-400">
              Copie individualmente cada dado da ativação com 1 clique
            </p>
          </div>
        </div>

        {/* Botão Copiar Tudo */}
        <button
          type="button"
          onClick={handleCopyAll}
          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
          title="Copiar todos os dados"
        >
          {copiedKey === 'all' ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-300">Tudo Copiado!</span>
            </>
          ) : (
            <>
              <ClipboardCopy size={13} />
              <span>Copiar Tudo</span>
            </>
          )}
        </button>
      </div>

      {/* Grid de Itens com Botão de Cópia Individual */}
      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map(item => {
          const isCopied = copiedKey === item.key;
          return (
            <div
              key={item.key}
              className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                isCopied 
                  ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                  : 'bg-[#141a27] border-slate-700/80 hover:border-slate-600'
              }`}
            >
              <div className="min-w-0 flex items-center gap-2 flex-1">
                <div className="p-1.5 rounded-lg bg-slate-800/80 shrink-0">
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none mb-0.5">
                    {item.label}
                  </span>
                  <span className={`text-xs block truncate ${item.badgeColor}`}>
                    {item.value}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {item.isPhone && rawPhone && (
                  <a
                    href={`https://wa.me/${rawPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-all text-[11px] flex items-center"
                    title="Abrir no WhatsApp"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}

                <button
                  type="button"
                  onClick={(e) => handleCopy(item.key, item.value!, e)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border ${
                    isCopied
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 font-black'
                      : 'bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border-slate-700 hover:border-indigo-500'
                  }`}
                  title={`Copiar ${item.label}`}
                >
                  {isCopied ? (
                    <>
                      <Check size={12} className="text-slate-950 stroke-[3]" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
