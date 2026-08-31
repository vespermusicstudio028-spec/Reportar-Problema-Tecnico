import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  AlertTriangle, 
  Send, 
  Image as ImageIcon, 
  Trash2, 
  Loader2, 
  MessageSquare,
  UploadCloud,
  User,
  Phone,
  Key,
  Check,
  Copy,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { TrialConfig, TrialDevice, TrialSubOption, TrialContentBlock } from '../types/trial';
import { supabase } from '../lib/supabase';

interface Props {
  config: TrialConfig;
  mode?: 'trial' | 'add_point';
  onClose: () => void;
  onOpenChat?: () => void;
  clientCode?: string;
  clientName?: string;
  onClientRegistered?: (client: {
    id: string;
    name: string;
    code: string;
    canvasLink: string;
    addedAt: string;
    phone?: string;
    email?: string;
    plan?: string;
    price?: number;
    activeApp?: string;
    accessPoints?: any[];
  }) => void;
  onPointAdded?: (client: any) => void;
}

export function TrialFlowRenderer({ config, mode = 'trial', onClose, onOpenChat, clientCode, clientName, onClientRegistered, onPointAdded }: Props) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string | null>(null);
  const [showAppDescription, setShowAppDescription] = useState(false);
  const [macCode, setMacCode] = useState('');
  const [deviceKey, setDeviceKey] = useState('');
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  // Estados do Modal de Identificação e Cadastro para Novos Clientes
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regError, setRegError] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [pendingContent, setPendingContent] = useState<TrialContentBlock | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const formatPhoneNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
    setImagePreview(null);
  };

  const selectedDevice = config.devices.find(d => d.id === selectedDeviceId);
  const selectedSubOption = selectedDevice?.subOptions?.find(s => s.id === selectedSubOptionId);

  // Adiciona +1 ponto de acesso (tela) diretamente ao cliente existente no Supabase
  const handleAddPointDirectly = async (content: TrialContentBlock, activeCode: string, activeName: string) => {
    if (isSending) return;
    setIsSending(true);

    try {
      const appName = content.macAppName || selectedSubOption?.name || content.title || selectedDevice?.name || 'Aplicativo';
      const deviceTitle = selectedDevice?.name || 'Dispositivo';

      // 1. Buscar dados atuais do cliente no Supabase
      const { data: clientData, error: clientFetchErr } = await supabase
        .from('clients')
        .select('*')
        .eq('code', activeCode)
        .maybeSingle();

      if (clientFetchErr) throw clientFetchErr;

      let existingScreens: any[] = [];
      if (clientData?.access_points) {
        existingScreens = Array.isArray(clientData.access_points)
          ? clientData.access_points
          : JSON.parse(clientData.access_points);
      }

      const newScreenNumber = (existingScreens.length || 0) + 1;
      const newPoint = {
        screenNumber: newScreenNumber,
        appName: appName,
        authType: (macCode.trim() ? 'mac' : (deviceKey.trim() ? 'key' : 'login')),
        macAddress: macCode.trim() || '',
        deviceKey: deviceKey.trim() || '',
        username: '',
        password: '',
        expiresAt: '',
        isLifetime: false
      };

      const updatedScreens = [...existingScreens, newPoint];

      // 2. Atualizar cliente com +1 ponto e mudar plano para R$ 70,00 (Sinal do Streaming)
      const { error: updateErr } = await supabase
        .from('clients')
        .update({
          access_points: updatedScreens,
          plan: 'Sinal do Streaming',
          price: 70
        })
        .eq('code', activeCode);

      if (updateErr) {
        console.error('Erro ao atualizar cliente com novo ponto:', updateErr);
      }

      // 3. Montar mensagem do cliente com o link de pagamento da ativação (R$ 35,00)
      const payLink = 'https://mpago.la/2UJjaQb';
      const payLabel = 'Pagar Ativação de +1 Ponto (R$ 35,00)';
      const payValue = 'R$ 35,00';
      const paymentMarker = `[PAYMENT_LINK:${payLink}|||${payLabel}|||${payValue}]`;

      let msgText = `➕ *Solicitação de Ponto Adicional (+1 Tela)*\n\n👤 *Cliente:* ${activeName}\n🔑 *Código:* ${activeCode}\n\n📺 *Novo Ponto (Tela ${newScreenNumber}):* ${deviceTitle}\n📲 *Aplicativo:* ${appName}\n🔢 *Código MAC:* ${macCode.trim() || 'Não informado'}\n🔑 *Device Key / Código:* ${deviceKey.trim() || 'Não informado'}\n\n💰 *Taxa de Ativação do Ponto Adicional:* R$ 35,00\n💰 *Valor das Próximas Renovações:* R$ 70,00 (${updatedScreens.length} Telas)\n\n${paymentMarker}`;

      if (imagePreview && attachedImage) {
        const payload = {
          fileName: attachedImage.name,
          fileSize: `${(attachedImage.size / 1024).toFixed(1)} KB`,
          fileData: imagePreview,
          caption: `Foto da tela do ${appName} (Novo Ponto - Tela ${newScreenNumber})`
        };
        msgText += `\n\n[PIX_COMPROVANTE:${JSON.stringify(payload)}]`;
      }

      // 4. Salvar mensagem do cliente no chat
      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: activeName,
        sender: 'client',
        message: msgText,
        read_by_admin: false,
        read_by_client: true
      });

      // 5. Salvar resposta automática do bot
      const autoReply = `🤖 **Novo Ponto Adicionado com Sucesso!** 🎉\n\nRecebemos os dados do seu novo aparelho (*${appName} - Tela ${newScreenNumber}*).\n\n💳 Para liberar o acesso deste novo ponto, realize o pagamento da taxa de ativação de **R$ 35,00** clicando no botão acima.\n\n✨ Seu plano foi atualizado para **R$ 70,00** (${updatedScreens.length} Telas) para as próximas renovações! Em instantes nosso suporte ativará seu novo aparelho. 🍿📺`;
      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: autoReply,
        read_by_admin: true,
        read_by_client: false
      });

      if (onPointAdded && clientData) {
        onPointAdded({
          ...clientData,
          plan: 'Sinal do Streaming',
          price: 70,
          access_points: updatedScreens,
          accessPoints: updatedScreens
        });
      }

      // 6. Abrir o chat
      if (onOpenChat) {
        onOpenChat();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao adicionar ponto adicional:', err);
      alert('Erro ao solicitar ponto adicional: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSending(false);
    }
  };

  // Ponto de entrada ao clicar em "Enviar Dados p/ Suporte"
  const handleInitiateSend = (content: TrialContentBlock) => {
    if (mode === 'add_point' && clientCode) {
      handleAddPointDirectly(content, clientCode, clientName || 'Cliente');
      return;
    }
    setPendingContent(content);
    setShowRegisterModal(true);
  };

  // Envia dados para o chat com código e nome existentes
  const handleSendToSupport = async (content: TrialContentBlock, activeCode: string, activeName: string) => {
    if (isSending) return;
    setIsSending(true);

    try {
      const appName = content.macAppName || selectedSubOption?.name || content.title || selectedDevice?.name || 'Aplicativo';
      const deviceTitle = selectedDevice?.name || 'Dispositivo';

      let msgText = `🎁 *Solicitação de Teste Grátis de 3h*\n\n📺 *Dispositivo:* ${deviceTitle}\n📲 *Aplicativo:* ${appName}\n🔢 *Código MAC:* ${macCode.trim() || 'Não informado'}\n🔑 *Device Key / Código:* ${deviceKey.trim() || 'Não informado'}`;

      if (imagePreview && attachedImage) {
        const payload = {
          fileName: attachedImage.name,
          fileSize: `${(attachedImage.size / 1024).toFixed(1)} KB`,
          fileData: imagePreview,
          caption: `Foto da tela do ${appName} (Teste Grátis 3h)`
        };
        msgText += `\n\n[PIX_COMPROVANTE:${JSON.stringify(payload)}]`;
      }

      // 1. Salvar mensagem do cliente no chat
      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: activeName,
        sender: 'client',
        message: msgText,
        read_by_admin: false,
        read_by_client: true
      });

      // 2. Disparar resposta automática imediata do bot
      const autoReply = `🤖 **Olá, ${activeName}!**\n\nRecebemos os dados do seu dispositivo (*${appName}*) para liberação do **Teste Grátis de 3h**! 🎉\n\nNossa equipe de suporte já está gerando sua lista de acesso e em instantes liberará seu login aqui no chat. 📺🍿`;
      await supabase.from('chat_messages').insert({
        client_code: activeCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: autoReply,
        read_by_admin: true,
        read_by_client: false
      });

      // 3. Abrir o chat para o cliente acompanhar
      if (onOpenChat) {
        onOpenChat();
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Erro ao enviar dados para o suporte:', err);
      alert('Erro ao enviar para o chat: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSending(false);
    }
  };

  // Cadastra o novo cliente no banco e envia o teste gerando código exclusivo
  const handleConfirmRegisterAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || regName.trim().length < 2) {
      setRegError('Por favor, informe seu nome completo.');
      return;
    }
    const cleanDigits = regPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setRegError('Por favor, informe um número de WhatsApp/telefone válido com DDD.');
      return;
    }

    setRegError('');
    setIsSending(true);

    try {
      // 1. Gerar código único alfanumérico no padrão do Código de Acesso Único do Painel
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let newCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      const { data: existingCodes } = await supabase.from('clients').select('code').eq('code', newCode);
      if (existingCodes && existingCodes.length > 0) {
        newCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      }

      // 2. Determinar se o dispositivo é Celular ou outro
      const content = pendingContent || selectedSubOption?.content || selectedDevice?.content || {};
      const appName = content.macAppName || selectedSubOption?.name || content.title || selectedDevice?.name || 'Aplicativo';
      const deviceTitle = selectedDevice?.name || 'Dispositivo';

      const isCelular = (selectedDevice?.id?.toLowerCase() === 'celular') ||
                        (selectedDevice?.name?.toLowerCase().includes('celular')) ||
                        (deviceTitle.toLowerCase().includes('celular')) ||
                        (selectedSubOption?.name?.toLowerCase().includes('celular'));
      const calculatedPrice = isCelular ? 35 : 40;
      const calculatedPlan = 'Sinal do Streaming';

      const clientAccessPoints = [{
        screenNumber: 1,
        appName: appName,
        authType: (macCode.trim() ? 'mac' : (deviceKey.trim() ? 'key' : 'login')),
        macAddress: macCode.trim() || '',
        deviceKey: deviceKey.trim() || '',
        username: '',
        password: '',
        expiresAt: '',
        isLifetime: false
      }];

      // 3. Salvar cliente na tabela 'clients' do Supabase (visível no painel do admin)
      const { data: insertedClient, error: clientInsertErr } = await supabase.from('clients').insert([{
        name: regName.trim(),
        phone: regPhone.trim(),
        code: newCode,
        canvas_link: 'https://thebestiptv.com',
        plan: calculatedPlan,
        price: calculatedPrice,
        active_app: appName,
        access_points: clientAccessPoints
      }]).select();

      if (clientInsertErr) {
        console.error('Erro ao registrar cliente em clients:', clientInsertErr);
      }

      // 4. Salvar no localStorage para manter a sessão do cliente
      localStorage.setItem('iptv_access_code_v1', newCode);
      localStorage.setItem('tbi_active_client_code', newCode);
      localStorage.setItem('tbi_active_client_name', regName.trim());
      localStorage.setItem('tbi_client_phone', regPhone.trim());

      // 5. Notificar componente pai (App.tsx)
      if (onClientRegistered) {
        onClientRegistered({
          id: insertedClient?.[0]?.id || Date.now().toString(),
          name: regName.trim(),
          code: newCode,
          phone: regPhone.trim(),
          canvasLink: 'https://thebestiptv.com',
          plan: calculatedPlan,
          price: calculatedPrice,
          activeApp: appName,
          accessPoints: clientAccessPoints,
          addedAt: new Date().toISOString()
        });
      }

      // 6. Formatar mensagem do teste com os dados do cliente e do app
      let msgText = `🎁 *Solicitação de Teste Grátis de 3h*\n\n👤 *Cliente Novo:* ${regName.trim()}\n📱 *WhatsApp:* ${regPhone.trim()}\n🔑 *Código de Acesso:* ${newCode}\n💰 *Valor do Plano:* R$ ${calculatedPrice},00 (${calculatedPlan})\n\n📺 *Dispositivo:* ${deviceTitle}\n📲 *Aplicativo:* ${appName}\n🔢 *Código MAC:* ${macCode.trim() || 'Não informado'}\n🔑 *Device Key / Código:* ${deviceKey.trim() || 'Não informado'}`;

      if (imagePreview && attachedImage) {
        const payload = {
          fileName: attachedImage.name,
          fileSize: `${(attachedImage.size / 1024).toFixed(1)} KB`,
          fileData: imagePreview,
          caption: `Foto da tela do ${appName} (Teste Grátis 3h - ${regName.trim()})`
        };
        msgText += `\n\n[PIX_COMPROVANTE:${JSON.stringify(payload)}]`;
      }

      // 6. Inserir mensagem no chat
      await supabase.from('chat_messages').insert({
        client_code: newCode,
        client_name: regName.trim(),
        sender: 'client',
        message: msgText,
        read_by_admin: false,
        read_by_client: true
      });

      // 7. Inserir resposta de boas-vindas do suporte técnico
      const autoReply = `🤖 **Olá, ${regName.trim()}! Seja muito bem-vindo(a) à The Best IPTV!** 🎉\n\n🔑 **Seu Código de Acesso Exclusivo é:** \`${newCode}\`\n*(Guarde este código para acessar suporte e novidades sempre que entrar no app!)*\n\nRecebemos os dados do seu dispositivo (*${appName}*) para liberação do seu **Teste Grátis de 3h**! 🍿📺\n\nNossa equipe já está gerando sua lista de acesso e em instantes liberará seu login e senha aqui no chat.`;
      await supabase.from('chat_messages').insert({
        client_code: newCode,
        client_name: 'Suporte The Best IPTV+',
        sender: 'admin',
        message: autoReply,
        read_by_admin: true,
        read_by_client: false
      });

      setCreatedCode(newCode);
      setShowRegisterModal(false);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Erro ao cadastrar e enviar teste:', err);
      setRegError('Erro ao processar: ' + (err.message || 'Tente novamente.'));
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyCode = () => {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  const handleSendTextToSupport = async (customText: string) => {
    // No fluxo de Teste Grátis, sempre pede identificação
    setPendingContent({ whatsappText: customText });
    setShowRegisterModal(true);
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Google Drive
    if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return { type: 'iframe', url: `https://drive.google.com/file/d/${match[1]}/preview` };
      }
    }
    
    // YouTube
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
      const videoId = url.includes('youtube.com/watch') 
        ? new URLSearchParams(url.split('?')[1]).get('v')
        : url.split('youtu.be/')[1]?.split('?')[0];
      if (videoId) {
        return { type: 'iframe', url: `https://www.youtube.com/embed/${videoId}` };
      }
    }

    return { type: 'video', url };
  };

  const renderModals = () => (
    <AnimatePresence>
      {/* Modal 1: Identificação e Cadastro do Novo Cliente */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="bg-[#121622] border border-indigo-500/30 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl relative text-left"
          >
            <button
              type="button"
              onClick={() => {
                setShowRegisterModal(false);
                setRegError('');
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-600/20">
              <Sparkles size={24} />
            </div>

            <h3 className="text-xl font-bold text-white mb-1.5">
              Identificação para Teste Grátis
            </h3>
            <p className="text-slate-400 text-xs md:text-sm mb-5 leading-relaxed">
              Preencha seu nome e WhatsApp para gerarmos seu <strong>código de acesso exclusivo</strong> e liberar seu teste no chat.
            </p>

            <form onSubmit={handleConfirmRegisterAndSend} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  👤 Seu Nome Completo
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  📱 WhatsApp / Telefone com DDD
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    required
                    placeholder="(XX) 99999-9999"
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhoneNumber(e.target.value))}
                    className="w-full bg-[#0b0e14] border border-slate-700/80 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {regError && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSending}
                className="w-full mt-2 py-3.5 px-6 font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Gerando Código & Enviando...</span>
                  </>
                ) : (
                  <>
                    <Key size={18} />
                    <span>Gerar Código & Enviar Dados</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modal 2: Código Gerado com Sucesso & Confirmação */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            className="bg-[#121622] border border-emerald-500/40 p-6 md:p-8 rounded-3xl w-full max-w-md shadow-2xl text-center relative"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={36} />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">
              Tudo Pronto, {regName || 'Cliente'}! 🎉
            </h3>
            <p className="text-slate-300 text-xs md:text-sm mb-6 leading-relaxed">
              Seu cadastro foi realizado e seus dados de teste já foram enviados diretamente para o nosso suporte técnico.
            </p>

            {/* Card do Código de Acesso */}
            <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-2xl p-4 mb-6 shadow-inner">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                Seu Código de Acesso Exclusivo:
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono font-black text-emerald-400 tracking-widest">
                  {createdCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all text-xs font-bold flex items-center gap-1"
                  title="Copiar Código"
                >
                  {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                💡 Guarde este código para acessar novidades e suporte sempre que entrar.
              </p>
            </div>

            {/* Botão para Abrir o Chat */}
            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                if (onOpenChat) {
                  onOpenChat();
                } else {
                  onClose();
                }
              }}
              className="w-full py-4 px-6 font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-teal-600 rounded-xl transition-all shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 text-sm active:scale-[0.99]"
            >
              <MessageSquare size={18} />
              <span>Abrir Chat com o Suporte Agora 🚀</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderContentBlock = (content: TrialContentBlock, onBack: () => void, isChangelogOpen?: boolean, toggleChangelog?: () => void) => {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
          {content.title && (
            <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">{content.title}</h2>
          )}
          
          <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
            {content.subtitle && (
              <p className="font-bold text-lg text-white text-center mb-4">{content.subtitle}</p>
            )}

            {/* Carrossel de Mídias */}
            {(() => {
              const items = content.mediaItems || [];
              if (items.length === 0 && content.mediaUrl && content.mediaType && content.mediaType !== 'none') {
                items.push({ id: 'legacy', url: content.mediaUrl, type: content.mediaType });
              }

              if (items.length === 0) return null;

              const activeItem = items[currentSlide];

              return (
                <div className="w-full mb-6">
                  <div className="w-full rounded-2xl overflow-hidden shadow-lg shadow-black/50 border border-white/10 relative">
                    {activeItem.type === 'image' ? (
                      <img src={activeItem.url} alt="Mídia" className="w-full h-auto object-cover" />
                    ) : (
                      (() => {
                        const embed = getEmbedUrl(activeItem.url);
                        if (!embed) return null;
                        if (embed.type === 'iframe') {
                          return (
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                              <iframe 
                                src={embed.url} 
                                className="absolute top-0 left-0 w-full h-full rounded-xl"
                                allow="autoplay; encrypted-media; fullscreen"
                                allowFullScreen
                              />
                            </div>
                          );
                        }
                        return <video src={embed.url} controls playsInline className="w-full h-auto object-cover rounded-xl" />;
                      })()
                    )}

                    {/* Navegação do Carrossel */}
                    {items.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : items.length - 1))}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-all border border-white/20 z-10"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          onClick={() => setCurrentSlide((prev) => (prev < items.length - 1 ? prev + 1 : 0))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-all border border-white/20 z-10"
                        >
                          <ChevronRight size={18} />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-2 py-1 rounded-full backdrop-blur-md">
                          {items.map((_, idx) => (
                            <div 
                              key={idx} 
                              className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentSlide ? 'bg-white scale-125' : 'bg-white/40'}`} 
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {content.topAlert && (
              <p className={`font-bold block mb-1 ${content.topAlert.type === 'danger' ? 'text-red-400' : 'text-indigo-400'}`}>
                {content.topAlert.text}
              </p>
            )}

            {content.textBlocks && content.textBlocks.map((p, i) => (
              <p key={i} className="font-medium text-white">{p}</p>
            ))}

            {content.links && content.links.map(link => (
              <div key={link.id} className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-4 text-center">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white font-bold underline hover:text-indigo-400 break-all text-lg"
                >
                  {link.label}
                </a>
              </div>
            ))}

            {content.changelog && (
              <div className="mt-6 mb-4">
                <button
                  onClick={toggleChangelog}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-colors border border-slate-700/50 flex justify-between items-center"
                >
                  <span>Descrição do Aplicativo</span>
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">v{content.changelog.version}</span>
                </button>

                <AnimatePresence>
                  {isChangelogOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-700/50 text-left text-sm space-y-3 mt-2">
                        <p className="font-bold text-amber-400 text-center">📢 ATUALIZAÇÃO IMPORTANTE</p>
                        <ul className="list-disc pl-5 space-y-1 text-slate-300">
                          {content.changelog.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {content.bottomAlert && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-center font-bold">
                {content.bottomAlert.text}
              </div>
            )}

            {content.showMacInput && (
              <div className="bg-slate-800/50 rounded-2xl p-5 mt-6 border border-slate-700/60 space-y-3.5 shadow-xl">
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                    {content.macAppName ? `Dados do Aplicativo - ${content.macAppName}` : 'Dados do Aplicativo (Opcional)'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {content.macAppName ? `Preencha os dados gerados pelo ${content.macAppName} para liberarmos seu teste.` : 'Preencha os dados abaixo ou anexe uma foto da tela do aplicativo para liberar.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Código MAC</label>
                  <input
                    type="text"
                    value={macCode}
                    onChange={(e) => setMacCode(e.target.value)}
                    placeholder="Ex: A1:B2:C3:D4:E5:F6"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 uppercase tracking-wider">Device Key / Código do App</label>
                  <input
                    type="text"
                    value={deviceKey}
                    onChange={(e) => setDeviceKey(e.target.value)}
                    placeholder="Ex: 123456"
                    className="w-full bg-[#0c0e12] border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase text-sm"
                  />
                </div>

                {/* Upload de Foto da Tela do App (Opcional) */}
                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    📸 Foto da Tela do Aplicativo (Opcional)
                  </label>
                  
                  {imagePreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-indigo-500/40 bg-slate-900/90 p-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img src={imagePreview} alt="Preview" className="w-12 h-12 object-cover rounded-lg border border-slate-700 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{attachedImage?.name || 'foto_tela.jpg'}</p>
                          <p className="text-[10px] text-emerald-400 font-semibold">Foto anexada com sucesso</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0"
                        title="Remover foto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full py-3.5 px-4 border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl bg-slate-900/50 hover:bg-indigo-600/5 cursor-pointer transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 text-slate-400 hover:text-indigo-300 text-xs">
                        <UploadCloud size={16} className="text-indigo-400" />
                        <span className="font-semibold">Clique para tirar foto ou anexar imagem da TV</span>
                      </div>
                    </label>
                  )}
                </div>

                {/* Botão Enviar Dados p/ Suporte */}
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleInitiateSend(content)}
                  className="mt-4 flex justify-center items-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all w-full shadow-lg shadow-emerald-500/25 active:scale-[0.99] disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Enviando para o Suporte...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Enviar Dados p/ Suporte</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {content.whatsappText && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => handleSendTextToSupport(content.whatsappText || 'Desejo suporte para ativar meu teste grátis.')}
                  className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                >
                  <MessageSquare size={18} />
                  <span>Falar com Suporte no Chat</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onBack}
            className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
          >
            VOLTAR
          </button>
        </div>

        {renderModals()}
      </motion.div>
    );
  };

  // 3. Renderizando o conteúdo de uma sub-opção selecionada
  if (selectedDevice && selectedDevice.type === 'suboptions' && selectedSubOption) {
    return renderContentBlock(selectedSubOption.content, () => setSelectedSubOptionId(null));
  }

  // 2. Renderizando as Sub-opções de um Dispositivo
  if (selectedDevice && selectedDevice.type === 'suboptions' && !selectedSubOptionId) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md uppercase mb-2">{selectedDevice.name}</h2>
            <h3 className="text-lg md:text-xl font-bold tracking-tight text-indigo-300 drop-shadow-md uppercase">SELECIONE UMA OPÇÃO</h3>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4 w-full relative z-10">
            {(selectedDevice.subOptions || []).filter(s => s.visible !== false).map(sub => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSelectedSubOptionId(sub.id)}
                className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
              >
                <span className="font-bold text-white text-lg tracking-wide">{sub.name}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedDeviceId(null)}
              className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
            >
              VOLTAR
            </button>
          </div>
        </div>
        {renderModals()}
      </motion.div>
    );
  }

  // 2. Renderizando o conteúdo de um Dispositivo direto (ex: Celular)
  if (selectedDevice && selectedDevice.type === 'content' && selectedDevice.content) {
    return renderContentBlock(selectedDevice.content, () => setSelectedDeviceId(null), showAppDescription, () => setShowAppDescription(!showAppDescription));
  }

  // 1. Renderizando a Lista de Dispositivos Principal
  return (
    <>
      {/* Alerta Global */}
      {config.globalAlert?.enabled && !alertDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0c0e12] border border-slate-700 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative"
          >
            <button 
              onClick={() => setAlertDismissed(true)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center ${config.globalAlert.type === 'danger' ? 'bg-red-500/20 text-red-500' : config.globalAlert.type === 'warning' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'}`}>
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{config.globalAlert.title}</h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed whitespace-pre-wrap">{config.globalAlert.text}</p>
            <button 
              onClick={() => setAlertDismissed(true)}
              className="w-full py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
            >
              Entendi
            </button>
          </motion.div>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div className="w-full max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md uppercase">QUAL É O SEU DISPOSITIVO PRINCIPAL ?</h2>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4 w-full relative z-10">
            {config.devices.filter(d => d.visible !== false).map(device => (
              <button
                key={device.id}
                type="button"
                onClick={() => setSelectedDeviceId(device.id)}
                className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
              >
                <span className="font-bold text-white text-lg tracking-wide">{device.name}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={onClose}
              className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
            >
              VOLTAR
            </button>
          </div>
        </div>
        {renderModals()}
      </motion.div>
    </>
  );
}
