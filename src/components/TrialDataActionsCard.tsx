import React, { useState } from "react";
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
  Sparkles,
  Zap,
  CheckCircle2,
  X,
  Send,
  Monitor,
  Wifi,
  Globe,
  AlertCircle,
  Loader2
} from "lucide-react";
import { supabase } from "../lib/supabase";

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

export function extractTrialRequestData(
  text: string, 
  fallbackName?: string, 
  fallbackCode?: string,
  fallbackPhone?: string
): TrialExtractedInfo | null {
  if (!text) return null;

  const isTrialRequest = text.includes("Solicitacao de Teste Gratis") || 
                        text.includes("Solicitação de Teste Grátis") || 
                        text.includes("Teste Gratis de 3h") || 
                        text.includes("Teste Grátis de 3h") || 
                        text.includes("Solicitacao de Teste") ||
                        text.includes("Solicitação de Teste");
  const isPointRequest = text.includes("Solicitacao de Ponto Adicional") || 
                         text.includes("Solicitação de Ponto Adicional") || 
                         text.includes("Novo Ponto");
  const hasMacOrKey = /c[oó]digo mac|mac address|device key|endere[cç]o mac/i.test(text);

  if (!isTrialRequest && !isPointRequest && !hasMacOrKey) {
    return null;
  }

  const extractField = (patterns: RegExp[]): string | undefined => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const val = match[1].trim();
        if (val && !/^(n[aã]o informado|nenhum|null|undefined|-)$/i.test(val)) {
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
    /(?:🔑\s*|•\s*)?\*(?:C[oó]digo de Acesso|C[oó]digo):\*\s*([A-Za-z0-9]{4,10})/i,
    /(?:C[oó]digo de Acesso|C[oó]digo):\s*([A-Za-z0-9]{4,10})/i,
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
    /(?:🔢\s*|•\s*|\|\s*)?\*(?:C[oó]digo MAC|Endere[cç]o MAC|MAC Address|MAC):\*\s*`?([0-9a-zA-Z:-]{8,24})`?/i,
    /(?:C[oó]digo MAC|Endere[cç]o MAC|MAC Address|MAC):\s*`?([0-9a-zA-Z:-]{8,24})`?/i,
  ]);

  const deviceKey = extractField([
    /(?:🔑\s*|•\s*|\|\s*)?\*(?:Device Key \/ C[oó]digo|Device Key|DeviceKey|C[oó]digo do App|Senha do App|Key):\*\s*([^\n\r|]+)/i,
    /(?:Device Key \/ C[oó]digo|Device Key|DeviceKey|C[oó]digo do App|Senha do App|Key):\s*([^\n\r|]+)/i,
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

interface ConfirmTrialModalProps {
  clientCode: string;
  clientName: string;
  macCode?: string;
  deviceLabel?: string;
  onClose: () => void;
}

const ConfirmTrialModal: React.FC<ConfirmTrialModalProps> = ({ clientCode, clientName, macCode, deviceLabel, onClose }) => {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [dns, setDns] = useState("");
  const [porta, setPorta] = useState("8080");
  const [duracao, setDuracao] = useState("3 horas");
  const [isSending, setIsSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!login.trim() || !senha.trim()) {
      setError("Preencha pelo menos o Login e a Senha gerados no painel.");
      return;
    }
    setIsSending(true);
    setError("");

    const dnsLine = dns.trim() || "http://thebest.dns.net";
    const macLine = macCode ? "\n📟 *MAC Ativado:* `" + macCode + "`" : "";
    const deviceLine = deviceLabel ? "\n📺 *Aparelho:* " + deviceLabel : "";

    const msg = "✅ *Teste Grátis Gerado com Sucesso!*\n\n" +
      "🎉 Olá, **" + clientName + "**! Seu teste gratuito de **" + duracao + "** foi liberado! Aqui estão seus dados de acesso:\n\n" +
      "🌐 *Portal/DNS:* `" + dnsLine + "`\n" +
      "🔌 *Porta:* `" + porta + "`\n" +
      "👤 *Usuário:* `" + login.trim() + "`\n" +
      "🔐 *Senha:* `" + senha.trim() + "`" +
      macLine +
      deviceLine + "\n\n" +
      "📲 *Como usar:*\n" +
      "1. Abra o aplicativo no seu aparelho\n" +
      "2. Vá em *\"Adicionar Lista\"* ou *\"Configurações\"*\n" +
      "3. Insira o Portal/DNS, Usuário e Senha acima\n" +
      "4. Salve e aproveite! 🍿\n\n" +
      "⏳ *Duração do teste:* " + duracao + "\n" +
      "💬 Qualquer dúvida é só chamar aqui no chat. Bom streaming! 🚀";

    try {
      await supabase.from("chat_messages").insert({
        client_code: clientCode,
        client_name: "Suporte The Best IPTV+",
        sender: "admin",
        message: msg,
        read_by_admin: true,
        read_by_client: false
      });
      setDone(true);
      setTimeout(() => onClose(), 2500);
    } catch (err: any) {
      setError("Erro ao enviar mensagem: " + (err.message || "Tente novamente."));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0d1117] border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/50 w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-cyan-500/10 px-5 py-4 flex items-center justify-between border-b border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-300">Confirmar Teste Gerado</h3>
              <p className="text-[11px] text-slate-400">Insira os dados gerados no controle.vip</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700/60 text-slate-400 hover:text-white transition-all">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/20 text-emerald-400 animate-bounce">
              <CheckCircle2 size={36} />
            </div>
            <p className="text-emerald-300 font-bold text-lg">Dados enviados com sucesso!</p>
            <p className="text-slate-400 text-sm">O cliente recebeu os dados de acesso no chat. ✅</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 flex items-center gap-2 text-sm">
              <User size={14} className="text-amber-400 shrink-0" />
              <span className="text-slate-300 font-medium">{clientName}</span>
              <span className="text-slate-500 font-mono text-xs ml-auto">#{clientCode}</span>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User size={11} /> Login *
                  </label>
                  <input
                    type="text"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                    placeholder="usuario123"
                    className="w-full bg-slate-800/80 border border-slate-600/80 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Lock size={11} /> Senha *
                  </label>
                  <input
                    type="text"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="senha123"
                    className="w-full bg-slate-800/80 border border-slate-600/80 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Globe size={11} /> Portal / DNS
                </label>
                <input
                  type="text"
                  value={dns}
                  onChange={e => setDns(e.target.value)}
                  placeholder="http://thebest.dns.net (deixe vazio para usar o padrão)"
                  className="w-full bg-slate-800/80 border border-slate-600/80 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Wifi size={11} /> Porta
                  </label>
                  <input
                    type="text"
                    value={porta}
                    onChange={e => setPorta(e.target.value)}
                    placeholder="8080"
                    className="w-full bg-slate-800/80 border border-slate-600/80 rounded-xl px-3 py-2.5 text-white text-sm font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Monitor size={11} /> Duração
                  </label>
                  <select
                    value={duracao}
                    onChange={e => setDuracao(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-600/80 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all"
                  >
                    <option value="3 horas">3 horas</option>
                    <option value="6 horas">6 horas</option>
                    <option value="12 horas">12 horas</option>
                    <option value="24 horas">24 horas</option>
                    <option value="48 horas">48 horas</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-xs">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={isSending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-60 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30"
            >
              {isSending ? (
                <><Loader2 size={16} className="animate-spin" /> Enviando para o chat...</>
              ) : (
                <><Send size={16} /> Enviar Dados de Acesso ao Cliente</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface TrialDataActionsCardProps {
  data: TrialExtractedInfo;
  isClientSender?: boolean;
  clientCode?: string;
  clientName?: string;
}

export function TrialDataActionsCard({ data, isClientSender, clientCode, clientName }: TrialDataActionsCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCopy = (key: string, value: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const lines: string[] = [];
    if (data.name) lines.push("Nome: " + data.name);
    if (data.whatsapp) lines.push("WhatsApp: " + data.whatsapp);
    if (data.accessCode) lines.push("Código de Acesso: " + data.accessCode);
    if (data.device) lines.push("Dispositivo: " + data.device);
    if (data.appName) lines.push("Aplicativo: " + data.appName);
    if (data.macCode) lines.push("Código MAC: " + data.macCode);
    if (data.deviceKey) lines.push("Device Key / Código: " + data.deviceKey);
    if (data.plan) lines.push("Plano: " + data.plan);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedKey("all");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenPanel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const clipboard: string[] = [];
    if (data.name) clipboard.push("Nome: " + data.name);
    if (data.macCode) clipboard.push("MAC: " + data.macCode);
    if (clipboard.length > 0) {
      navigator.clipboard.writeText(clipboard.join("\n"));
    }
    window.open("https://controle.vip/users", "_blank", "noopener,noreferrer");
  };

  const items = [
    {
      key: "name",
      label: "Nome",
      value: data.name,
      icon: <User size={13} className="text-amber-400" />,
      badgeColor: "border-amber-500/30 bg-amber-500/10 text-amber-300"
    },
    {
      key: "whatsapp",
      label: "WhatsApp",
      value: data.whatsapp,
      icon: <Phone size={13} className="text-emerald-400" />,
      badgeColor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      isPhone: true
    },
    {
      key: "accessCode",
      label: "Cód. Acesso",
      value: data.accessCode,
      icon: <Key size={13} className="text-indigo-400" />,
      badgeColor: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono"
    },
    {
      key: "device",
      label: "Dispositivo",
      value: data.device,
      icon: <Tv size={13} className="text-cyan-400" />,
      badgeColor: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
    },
    {
      key: "appName",
      label: "Aplicativo",
      value: data.appName,
      icon: <Smartphone size={13} className="text-blue-400" />,
      badgeColor: "border-blue-500/30 bg-blue-500/10 text-blue-300 font-semibold"
    },
    {
      key: "macCode",
      label: "Código MAC",
      value: data.macCode,
      icon: <Hash size={13} className="text-pink-400" />,
      badgeColor: "border-pink-500/40 bg-pink-500/15 text-pink-300 font-mono font-bold"
    },
    {
      key: "deviceKey",
      label: "Device Key / Cód.",
      value: data.deviceKey,
      icon: <Lock size={13} className="text-purple-400" />,
      badgeColor: "border-purple-500/40 bg-purple-500/15 text-purple-300 font-mono font-bold"
    }
  ].filter(item => Boolean(item.value));

  if (items.length === 0) return null;

  const rawPhone = data.whatsapp ? data.whatsapp.replace(/\D/g, "") : "";

  return (
    <>
      <div className="mt-3 rounded-2xl overflow-hidden border border-amber-500/40 bg-[#0d121c] shadow-xl shadow-amber-950/20 text-left">
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

          <button
            type="button"
            onClick={handleCopyAll}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            title="Copiar todos os dados"
          >
            {copiedKey === "all" ? (
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

        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map(item => {
            const isCopied = copiedKey === item.key;
            return (
              <div
                key={item.key}
                className={"p-2 rounded-xl border flex items-center justify-between gap-2 transition-all " + (isCopied
                  ? "bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "bg-[#141a27] border-slate-700/80 hover:border-slate-600")}
              >
                <div className="min-w-0 flex items-center gap-2 flex-1">
                  <div className="p-1.5 rounded-lg bg-slate-800/80 shrink-0">
                    {item.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-none mb-0.5">
                      {item.label}
                    </span>
                    <span className={"text-xs block truncate " + item.badgeColor}>
                      {item.value}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {item.isPhone && rawPhone && (
                    <a
                      href={"https://wa.me/" + rawPhone}
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
                    className={"px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 active:scale-95 border " + (isCopied
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/30 font-black"
                      : "bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white border-slate-700 hover:border-indigo-500")}
                    title={"Copiar " + item.label}
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

        {clientCode && clientName && (
          <div className="px-2.5 pb-2.5 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleOpenPanel}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/80 to-indigo-600/80 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs border border-blue-500/40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-900/30"
              title="Abre o painel controle.vip e copia nome + MAC"
            >
              <Zap size={13} className="text-yellow-300" />
              🚀 Abrir Painel — Gerar Teste
              <ExternalLink size={11} className="text-blue-300 ml-0.5" />
            </button>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowConfirmModal(true); }}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs border border-emerald-500/40 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/30"
              title="Confirma os dados do teste e envia automaticamente para o cliente no chat"
            >
              <CheckCircle2 size={13} className="text-emerald-200" />
              ✅ Confirmar Teste Gerado
            </button>
          </div>
        )}

        {clientCode && clientName && (
          <div className="px-3.5 pb-3">
            <span className="text-[10px] text-slate-500 leading-relaxed">
              💡 <strong className="text-slate-400">Como usar:</strong> Clique em "Abrir Painel", crie o teste no controle.vip selecionando <span className="text-blue-400 font-mono">HYBRID</span> + ative "É usuário teste?" e coloque o nome e MAC. Depois clique em "Confirmar Teste Gerado" para enviar os dados de acesso ao cliente no chat.
            </span>
          </div>
        )}
      </div>

      {showConfirmModal && clientCode && clientName && (
        <ConfirmTrialModal
          clientCode={clientCode}
          clientName={clientName}
          macCode={data.macCode}
          deviceLabel={data.device || data.appName}
          onClose={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
}
