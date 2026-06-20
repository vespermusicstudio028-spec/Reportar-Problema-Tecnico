import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { 
  RefreshCcw,
  Tv, 
  Film, 
  Clapperboard, 
  UploadCloud, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  ChevronDown,
  History,
  User,
  LayoutDashboard,
  LogOut,
  Shield,
  Trash2,
  Bell,
  AlertTriangle,
  Key,
  Dices,
  MessageCircle,
  HelpCircle,
  Info,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  X,
  Search,
  PlusCircle,
  Clapperboard as SeriesIcon,
  Film as MovieIcon,
  XCircle,
  Lock,
  Gift
} from 'lucide-react';

const WEBHOOK_URL = 'https://sua-url-de-webhook-aqui.com/endpoint';

interface TMDBResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv';
}

interface ContentRequest {
  id: string;
  client_code: string;
  type: string;
  title: string;
  tmdb_id?: string;
  poster_url?: string;
  season?: string;
  episode?: string;
  status: string;
  created_at: string;
  year?: string;
}

type ContentType = 'Canal' | 'Filme' | 'Série' | null;
type ActiveView = 'dashboard' | 'history' | 'profile';

interface UserReport {
  id: string;
  type: string;
  name: string;
  issue: string;
  device: string;
  description: string;
  timestamp: string;
  client_code?: string;
}

const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=2094&auto=format&fit=crop', // default dark/blue
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop', // neon/cyberpunk
  'https://images.unsplash.com/photo-1550684376-efcbd6e3f031?q=80&w=2070&auto=format&fit=crop', // green matrix
  'https://images.unsplash.com/photo-1509653087866-91f6c2ab5a42?q=80&w=2070&auto=format&fit=crop', // steampunk/gears
  'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop', // digital retro
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop', // cinema retro
  'https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?q=80&w=1974&auto=format&fit=crop', // comic book style
];

const ISSUE_TYPES = [
  "Áudio em inglês",
  "Sem áudio",
  "Sem legenda",
  "Vídeo travando",
  "Episódio não abre",
  "Outro"
];

const DEVICES = [
  "TV",
  "Celular Android",
  "iPhone",
  "Computador",
  "TV Box",
  "Outro"
];

interface PollOption {
  id: string;
  text: string;
}

interface PollVote {
  id: string;
  announcement_id: string;
  option_id: string;
  client_code: string;
}

interface AnnouncementReaction {
  id: string;
  announcement_id: string;
  client_code: string;
  emoji: string;
}

interface AnnouncementView {
  id: string;
  announcement_id: string;
  client_code: string;
}

interface Announcement {
  id: string;
  category: string;
  name: string;
  status: string;
  message: string;
  expiryDate: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | null;
  pollOptions?: PollOption[] | null;
  createdAt?: string;
}

export default function App() {
  const [contentType, setContentType] = useState<ContentType>(null);
  const [trialState, setTrialState] = useState<'devices' | 'android' | 'smartv' | 'celular' | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  
  // User Reports History
  const [userReports, setUserReports] = useState<UserReport[]>([]);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [annReactions, setAnnReactions] = useState<AnnouncementReaction[]>([]);
  const [annViews, setAnnViews] = useState<AnnouncementView[]>([]);

  // Content Requests
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<'movie' | 'tv'>('movie');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TMDBResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTMDB, setSelectedTMDB] = useState<TMDBResult | null>(null);
  const [requestSeason, setRequestSeason] = useState('');
  const [requestEpisode, setRequestEpisode] = useState('');
  const [contentRequests, setContentRequests] = useState<ContentRequest[]>([]);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [quotaAlert, setQuotaAlert] = useState<'warning' | 'limit' | null>(null);

  const getClientQuota = (clientCode: string) => {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const requests = contentRequests.filter(req => 
      req.client_code === clientCode && new Date(req.created_at) >= last7Days
    );
    return {
      used: requests.length,
      remaining: Math.max(0, 2 - requests.length)
    };
  };

  // Carregar dados iniciais e escutar mudanças em tempo real
  useEffect(() => {
    const fetchData = async () => {
      const { data: ann } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
      if (ann) setAnnouncements(ann.map((a: any) => ({
        id: a.id, category: a.category, name: a.name, status: a.status, 
        message: a.message, expiryDate: a.expiry_date, mediaUrl: a.media_url, mediaType: a.media_type,
        pollOptions: a.poll_options, createdAt: a.created_at
      })));

      const { data: votes } = await supabase.from('poll_votes').select('*');
      if (votes) setPollVotes(votes);

      const { data: reactions } = await supabase.from('announcement_reactions').select('*');
      if (reactions) setAnnReactions(reactions);

      const { data: views } = await supabase.from('announcement_views').select('*');
      if (views) setAnnViews(views);

      const { data: mov } = await supabase.from('movie_updates').select('*').order('created_at', { ascending: false });
      if (mov) setMovieUpdates(mov.map((m: any) => ({ id: m.id, title: m.title })));

      const { data: ser } = await supabase.from('series_updates').select('*').order('created_at', { ascending: false });
      if (ser) setSeriesUpdates(ser.map((s: any) => ({ id: s.id, title: s.title })));

      const { data: cli } = await supabase.from('clients').select('*').order('added_at', { ascending: false });
      if (cli) setClients(cli.map((c: any) => ({
        id: c.id, name: c.name, code: c.code, canvasLink: c.canvas_link, email: c.email, phone: c.phone, addedAt: c.added_at, lastRecoveryAt: c.last_recovery_at
      })));

      const { data: rep } = await supabase.from('user_reports').select('*').order('timestamp', { ascending: false });
      if (rep) {
        setUserReports(rep.map((r: any) => ({
          id: r.id, type: r.type, name: r.name, issue: r.issue, device: r.device, description: r.description, timestamp: r.timestamp, client_code: r.client_code
        })));
        const reportCount = Math.max(0, rep.length - lastSeenReportsCount);
        setNewReportsCount(reportCount);
      }

      const { data: reqs } = await supabase.from('content_requests').select('*').order('created_at', { ascending: false });
      if (reqs) {
        setContentRequests(reqs);
        const count = Math.max(0, reqs.length - lastSeenRequestsCount);
        setNewRequestsCount(count);
      }
    };

    fetchData();

    const channel = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'movie_updates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'series_updates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_reports' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_requests' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reactions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_views' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_requests' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // States specific to 'Outro' selections
  const [issueType, setIssueType] = useState<string>('');
  const [issueTypeOther, setIssueTypeOther] = useState<string>('');
  
  const [device, setDevice] = useState<string>('');
  const [deviceOther, setDeviceOther] = useState<string>('');
  
  // Attachment state (to show filename)
  const [fileName, setFileName] = useState<string>('');

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Background rotation state
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex(prev => (prev + 1) % BACKGROUNDS.length);
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(interval);
  }, []);

  // Auth states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [lastSeenRequestsCount, setLastSeenRequestsCount] = useState(() => {
    return parseInt(localStorage.getItem('admin_last_seen_requests') || '0', 10);
  });
  const [newReportsCount, setNewReportsCount] = useState(0);
  const [lastSeenReportsCount, setLastSeenReportsCount] = useState(() => {
    return parseInt(localStorage.getItem('admin_last_seen_reports') || '0', 10);
  });
  const [isAdminLogged, setIsAdminLogged] = useState(() => {
    return localStorage.getItem('iptv_admin_logged') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('iptv_admin_logged', isAdminLogged.toString());
  }, [isAdminLogged]);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Announcement Form State
  const [annCategory, setAnnCategory] = useState('Canal');
  const [annName, setAnnName] = useState('');
  const [annStatus, setAnnStatus] = useState('Problemas Técnicos');
  const [annMessage, setAnnMessage] = useState('');
  const [annExpiry, setAnnExpiry] = useState('');
  const [annMedia, setAnnMedia] = useState<File | null>(null);
  const [annMediaName, setAnnMediaName] = useState('');

  const [pollOptionsInput, setPollOptionsInput] = useState<string[]>(['', '']);

  // Clients & Code Modal State
  const [adminTab, setAdminTab] = useState<'informes' | 'clientes' | 'atualizacoes' | 'pedidos' | 'suporte' | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showForgotCodeModal, setShowForgotCodeModal] = useState(false);
  const [forgotCodePhone, setForgotCodePhone] = useState('');
  const [isRecoveringCode, setIsRecoveringCode] = useState(false);
  const [showUpdatesModal, setShowUpdatesModal] = useState(false);
  const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState(false);
  interface CatalogUpdate {
    id: string;
    title: string;
  }
  const [movieUpdates, setMovieUpdates] = useState<CatalogUpdate[]>([]);
  const [seriesUpdates, setSeriesUpdates] = useState<CatalogUpdate[]>([]);
  const [newMovieTitle, setNewMovieTitle] = useState('');
  const [newSeriesTitle, setNewSeriesTitle] = useState('');

  const [accessCode, setAccessCode] = useState('');
  const [accessCodeError, setAccessCodeError] = useState('');
  const [showClientCode, setShowClientCode] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [clientLink, setClientLink] = useState('https://testetestettt.my.canva.site/sr-carlos');
  
  const [loggedClientCode, setLoggedClientCode] = useState(() => {
    return localStorage.getItem('iptv_access_code_v1') || '';
  });

  interface Client {
    id: string;
    name: string;
    code: string;
    canvasLink: string;
    email?: string;
    phone?: string;
    addedAt: string;
    lastRecoveryAt?: string;
  }
  const [clients, setClients] = useState<Client[]>([]);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Image Viewer State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ——— Push Notifications ———
  const VAPID_PUBLIC_KEY = 'BM9ySPx1kYmZJlNp9_qlkb66OTA8cuSqAL0g8YkC4AD6UcIJBI9YWZHypdOPlFc6miJtgmC591QtvAkLkouOD_s';
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isPushLoading, setIsPushLoading] = useState(false);


  // Converte base64url para Uint8Array (necessário para VAPID)
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  };

  // Registra o dispositivo para receber push
  const subscribeToPush = async (clientCode: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const sub = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      // Salva no Supabase (upsert pelo endpoint)
      await supabase.from('push_subscriptions').upsert({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        client_code: clientCode,
      }, { onConflict: 'endpoint' });
    } catch (err) {
      console.warn('[push] Erro ao registrar subscription:', err);
    }
  };

  // Pede permissão e registra subscription
  const requestPushPermission = async () => {
    if (!('Notification' in window)) return;
    setIsPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        const code = loggedClientCode || 'admin';
        await subscribeToPush(code);
      }
    } finally {
      setIsPushLoading(false);
    }
  };

  // Verifica estado atual da permissão
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Auto-registra quando o cliente faz login
  useEffect(() => {
    if (loggedClientCode && pushPermission === 'granted') {
      subscribeToPush(loggedClientCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedClientCode]);

  // --- TMDB Search Logic ---
  useEffect(() => {
    const fetchTMDB = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const bearerToken = import.meta.env.VITE_TMDB_API_KEY;
        if (!bearerToken || bearerToken === 'sua_chave_aqui' || bearerToken === 'your_tmdb_api_key') {
          console.warn('TMDB: Chave de API não configurada.');
          setSearchResults([]);
          setIsSearching(false);
          return;
        }

        const url = `https://api.themoviedb.org/3/search/${requestType}?language=pt-BR&query=${encodeURIComponent(searchQuery)}`;
        console.log('TMDB: Buscando em', url);
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error('TMDB: Erro HTTP', response.status, await response.text());
          setIsSearching(false);
          return;
        }

        const data = await response.json();
        console.log('TMDB: Resultados recebidos:', data.results?.length);
        
        if (data.results) {
          const results = data.results.slice(0, 6).map((item: any) => ({
            ...item,
            media_type: requestType
          }));
          setSearchResults(results);
        }
      } catch (err) {
        console.error('TMDB Error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchTMDB();
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchQuery, requestType]);

  const handleSubmitContentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTMDB && searchQuery.trim() === '') return;
    
    const clientCode = loggedClientCode || (isAdminLogged ? 'admin' : '');
    if (!clientCode) {
      setShowRequestModal(false);
      setShowCodeModal(true);
      return;
    }

    setIsSubmittingRequest(true);
    try {
      const posterUrl = selectedTMDB?.poster_path 
        ? `https://image.tmdb.org/t/p/w200${selectedTMDB.poster_path}` 
        : null;

      const title = selectedTMDB 
        ? (selectedTMDB.title || selectedTMDB.name || searchQuery) 
        : searchQuery;

      const releaseDate = selectedTMDB?.release_date || selectedTMDB?.first_air_date;
      const year = releaseDate ? releaseDate.substring(0, 4) : '';

      const { error } = await supabase.from('content_requests').insert([{
        client_code: clientCode,
        type: requestType === 'movie' ? 'Filme' : 'Série',
        title,
        tmdb_id: selectedTMDB?.id?.toString(),
        poster_url: posterUrl,
        season: requestType === 'tv' ? requestSeason : null,
        episode: requestType === 'tv' ? requestEpisode : null,
        year: year,
      }]);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(error.message || JSON.stringify(error));
      }

      setShowRequestModal(false);
      setSearchQuery('');
      setSelectedTMDB(null);
      setRequestSeason('');
      setRequestEpisode('');
      if (!isAdminLogged && loggedClientCode) {
        const quota = getClientQuota(loggedClientCode);
        const newUsed = quota.used + 1; // Including the one just sent
        if (newUsed === 1) {
          setQuotaAlert('warning');
        } else if (newUsed >= 2) {
          setQuotaAlert('limit');
        } else {
          alert('Pedido enviado com sucesso! Nossa equipe analisará em breve.');
        }
      } else {
        alert('Pedido enviado com sucesso! Nossa equipe analisará em breve.');
      }
    } catch (err: any) {
      alert('Erro ao enviar pedido: ' + (err.message || 'Erro desconhecido. Verifique o console.'));
      console.error(err);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleReset = () => {
    setContentType(null);
    setIssueType('');
    setIssueTypeOther('');
    setDevice('');
    setDeviceOther('');
    setFileName('');
    setSubmitStatus('idle');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    // Build payload JSON
    const payload: Record<string, any> = {
      tipoConteudo_Selecionado: contentType,
      tipoProblema: issueType === 'Outro' ? issueTypeOther : issueType,
      dispositivo: device === 'Outro' ? deviceOther : device,
    };

    // Extract all basic text/number fields automatically
    for (const [key, value] of formData.entries()) {
      if (key !== 'attachment' && key !== 'issueType' && key !== 'device' && key !== 'issueTypeOther' && key !== 'deviceOther' && key !== 'issueTypeGroup' && key !== 'deviceGroup') {
         // Only add to payload if it's string
         if (typeof value === 'string' && value.trim() !== '') {
           payload[key] = value;
         }
      }
    }

    // Handle file attachment manually to append as Base64 if needed
    const fileField = formData.get('attachment') as File | null;
    
    const sendData = async (data: any) => {
      try {
        // Save to Supabase
        await supabase.from('user_reports').insert([{
          type: data.tipoConteudo_Selecionado || '',
          name: data.nome || '',
          issue: data.tipoProblema || '',
          device: data.dispositivo || '',
          description: data.descricao || '',
          client_code: loggedClientCode || (isAdminLogged ? 'admin' : 'desconhecido')
        }]);

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
           console.warn('Webhook request failed, probably due to dummy URL.');
        }
      } catch (err) {
        console.error('Submission Error:', err);
      } finally {
        // Redirecionamento para o WhatsApp
        let waText = `*Novo Reporte de Problema*\n\n`;
        waText += `*Tipo:* ${data.tipoConteudo_Selecionado}\n`;
        if (data.nome) waText += `*Nome:* ${data.nome}\n`;
        if (data.temporada) waText += `*Temporada:* ${data.temporada}\n`;
        if (data.episodio) waText += `*Episódio:* ${data.episodio}\n`;
        waText += `*Problema:* ${data.tipoProblema}\n`;
        waText += `*Dispositivo:* ${data.dispositivo}\n`;
        if (data.descricao) waText += `*Descrição:* ${data.descricao}\n`;
        
        const waUrl = `https://wa.me/5521959368651?text=${encodeURIComponent(waText)}`;
        window.open(waUrl, '_blank');

        setSubmitStatus('success');
        setIsSubmitting(false);
      }
    };

    if (fileField && fileField.size > 0) {
      const reader = new FileReader();
      reader.onloadend = () => {
        payload.attachmentBase64 = reader.result;
        payload.attachmentName = fileField.name;
        sendData(payload);
      };
      reader.onerror = () => {
        sendData(payload);
      };
      reader.readAsDataURL(fileField);
    } else {
      sendData(payload);
    }
  };

  const renderContentSelection = () => {
    const activeAnnouncements = announcements.filter(a => new Date() <= new Date(a.expiryDate));
    const currentCode = loggedClientCode || (isAdminLogged ? 'admin' : null);

    if (trialState) {
      if (trialState === 'android') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">TV Android</h2>
              
              <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
                <p className="font-medium">
                  <strong className="text-white">Baixe agora o aplicativo do nosso STREAMING</strong> e comece a desfrutar de uma experiência de TV mais completa e emocionante!
                </p>
                
                <p>Baixe agora o aplicativo!</p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-6">
                  <p className="text-indigo-300 mb-2 font-medium italic">Clique no link abaixo para assistir o vídeo de como fazer o download:</p>
                  <a 
                    href="https://abre.ai/newhybridtcl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white font-bold underline hover:text-indigo-400 break-all"
                  >
                    https://abre.ai/newhybridtcl
                  </a>
                </div>

                <p>
                  <strong className="text-white">Aproveite nossos recursos:</strong> Mais de <span className="font-bold text-indigo-400">[2.700]</span> canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!
                </p>
                
                <p className="font-medium text-white pt-2 border-t border-slate-700/50 mt-4">
                  Se tiver alguma dúvida, entre em contato conosco!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('devices')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'celular') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider flex items-center justify-center gap-2">
                CELULAR 📳
              </h2>
              
              <div className="space-y-6 text-slate-300 text-sm md:text-base text-center">
                <p className="text-lg font-bold text-white">
                  Baixe agora o nosso aplicativo!
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-xl">
                  <p className="text-indigo-300 mb-2 italic">Faça o download agora:</p>
                  <a 
                    href="https://abre.ai/celutv" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-2xl font-black text-white underline hover:text-indigo-400"
                  >
                    abre.ai/celutv
                  </a>
                </div>

                <p className="text-sm bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <strong className="text-emerald-400 block mb-1">Segurança garantida:</strong> Nosso aplicativo é seguro e confiável.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('devices')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'smartv') {
        const smartTvBrands = [
          { id: 'F', name: 'LG' },
          { id: 'G', name: 'SAMSUNG' },
          { id: 'H', name: 'ROKU' },
          { id: 'i', name: 'OUTRO MODELO' }
        ];

        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto">
              <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
                <h2 className="text-2xl font-bold tracking-tight text-white drop-shadow-md uppercase mb-2">SMARTV</h2>
                <h3 className="text-lg md:text-xl font-bold tracking-tight text-indigo-300 drop-shadow-md uppercase">QUAL SERIA SUA SMARTV?</h3>
              </div>
              
              <div className="flex flex-col gap-3 md:gap-4 w-full relative z-10">
                {smartTvBrands.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => {
                      if (brand.name === 'LG') {
                        setTrialState('lg');
                      } else if (brand.name === 'SAMSUNG') {
                        setTrialState('samsung');
                      } else if (brand.name === 'ROKU') {
                        setTrialState('roku');
                      } else if (brand.name === 'OUTRO MODELO') {
                        setTrialState('outromodelo');
                      } else {
                        const waText = `*Teste Grátis 3h - The Best IPTV*\n\nGostaria de solicitar um teste.\nMeu dispositivo: *Smart TV - ${brand.name}*`;
                        const waUrl = `https://wa.me/5521959368651?text=${encodeURIComponent(waText)}`;
                        window.open(waUrl, '_blank');
                        setTrialState(null);
                      }
                    }}
                    className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
                  >
                    <span className="font-bold text-white text-lg tracking-wide">{brand.name}</span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setTrialState('devices')}
                  className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
                >
                  VOLTAR
                </button>
              </div>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'lg') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">SMARTV LG</h2>
              
              <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
                <p className="font-medium">
                  <strong className="text-white">Baixe agora o aplicativo do nosso STREAMING</strong> e comece a desfrutar de uma experiência de TV mais completa e emocionante!
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-6">
                  <p className="text-indigo-300 mb-2 font-medium italic">Clique aqui no link abaixo:</p>
                  <a 
                    href="https://abre.ai/lgvuplayer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white font-bold underline hover:text-indigo-400 break-all text-lg"
                  >
                    abre.ai/lgvuplayer
                  </a>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-center font-bold">
                  🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 <span className="text-red-400">ANUAL</span> 🚨
                </div>

                <p>
                  <strong className="text-white">Aproveite nossos recursos:</strong> Mais de <span className="font-bold text-indigo-400">[2.700]</span> canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!
                </p>
                
                <p className="font-medium text-white pt-2 border-t border-slate-700/50 mt-4 text-center">
                  Se tiver alguma dúvida, entre em contato conosco!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('smartv')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'samsung') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">SMARTV SAMSUNG</h2>
              
              <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
                <p className="font-medium">
                  <strong className="text-white">Baixe agora o aplicativo do nosso STREAMING</strong> e comece a desfrutar de uma experiência de TV mais completa e emocionante!
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-6">
                  <p className="text-indigo-300 mb-2 font-medium italic">Clique aqui no link abaixo:</p>
                  <a 
                    href="https://abre.ai/samsungvuplayer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white font-bold underline hover:text-indigo-400 break-all text-lg"
                  >
                    abre.ai/samsungvuplayer
                  </a>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-center font-bold">
                  🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 <span className="text-red-400">ANUAL</span> 🚨
                </div>

                <p>
                  <strong className="text-white">Aproveite nossos recursos:</strong> Mais de <span className="font-bold text-indigo-400">[2.700]</span> canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!
                </p>
                
                <p className="font-medium text-white pt-2 border-t border-slate-700/50 mt-4 text-center">
                  Se tiver alguma dúvida, entre em contato conosco!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('smartv')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'roku') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">SMARTV COM SISTEMA ROKU</h2>
              
              <div className="space-y-4 text-slate-300 text-sm md:text-base leading-relaxed">
                <p className="font-medium">
                  <strong className="text-white">Baixe agora o aplicativo do nosso STREAMING</strong> e comece a desfrutar de uma experiência de TV mais completa e emocionante!
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl my-6">
                  <p className="text-indigo-300 mb-2 font-medium italic">Clique aqui no link abaixo:</p>
                  <a 
                    href="https://abre.ai/rokuvuplayer" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-white font-bold underline hover:text-indigo-400 break-all text-lg"
                  >
                    abre.ai/rokuvuplayer
                  </a>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-200 text-center font-bold">
                  🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 <span className="text-red-400">ANUAL</span> 🚨
                </div>

                <p>
                  <strong className="text-white">Aproveite nossos recursos:</strong> Mais de <span className="font-bold text-indigo-400">[2.700]</span> canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!
                </p>
                
                <p className="font-medium text-white pt-2 border-t border-slate-700/50 mt-4 text-center">
                  Se tiver alguma dúvida, entre em contato conosco!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('smartv')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      if (trialState === 'outromodelo') {
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
          >
            <div className="w-full max-w-lg mx-auto bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-6 uppercase tracking-wider">OUTRO MODELO DE TV</h2>
              
              <div className="space-y-6 text-slate-300 text-sm md:text-base leading-relaxed text-center">
                <p className="text-red-300 font-bold bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                  Não é possível instalar o aplicativo diretamente em OUTRO modelo de TV.
                </p>

                <p className="font-medium text-white">
                  Mas não se preocupe! Você pode usar um dispositivo <span className="text-indigo-400 font-bold">TV Box</span> para acessar nossos conteúdos.
                </p>
                
                <div className="bg-indigo-500/10 border border-indigo-500/20 p-5 rounded-xl my-6 flex flex-col items-center">
                  <p className="text-indigo-300 mb-3 font-medium italic">Clique no link abaixo para adquirir um de nossos dispositivos TV Box:</p>
                  <a 
                    href="https://abre.ai/comprarboxtbii" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-colors break-all"
                  >
                    https://abre.ai/comprarboxtbii
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTrialState('smartv')}
                className="mt-8 flex items-center justify-center w-full p-4 gap-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </motion.div>
        );
      }

      // Default: 'devices'
      const trialDevices = [
        'TV Android (Play Store)',
        'Smart TV',
        'Celular',
        'TV Box',
        'Computador',
        'Mi Stick Tv'
      ];

      return (
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
              {trialDevices.map((device, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (device === 'TV Android (Play Store)') {
                      setTrialState('android');
                    } else if (device === 'Smart TV') {
                      setTrialState('smartv');
                    } else if (device === 'Celular') {
                      setTrialState('celular');
                    } else {
                      const waText = `*Teste Grátis 3h - The Best IPTV*\n\nGostaria de solicitar um teste.\nMeu dispositivo: *${device}*`;
                      const waUrl = `https://wa.me/5521959368651?text=${encodeURIComponent(waText)}`;
                      window.open(waUrl, '_blank');
                      setTrialState(null);
                    }
                  }}
                  className="flex items-center justify-center w-full p-4 gap-4 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/40 rounded-[1.5rem] transition-all group shadow-xl"
                >
                  <span className="font-bold text-white text-lg tracking-wide">{device}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setTrialState(null)}
                className="mt-4 flex items-center justify-center w-full p-4 gap-4 bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-700/80 rounded-[1.5rem] transition-all text-slate-300 hover:text-white font-bold"
              >
                VOLTAR
              </button>
            </div>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="min-h-full flex flex-col items-center justify-center py-4 md:p-4"
      >
        <div id="tour-announcements" className="w-full max-w-2xl mb-8">
          <button 
            type="button"
            onClick={() => setIsAnnouncementsOpen(!isAnnouncementsOpen)}
            className={`w-full flex items-center justify-between text-white font-bold mb-2 p-3 bg-slate-800/50 hover:bg-slate-800/80 rounded-xl transition-colors border ${activeAnnouncements.length > 0 ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse' : 'border-slate-700/50'}`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`${activeAnnouncements.length > 0 ? 'text-amber-400' : 'text-slate-400'}`} size={20} />
              Avisos Importantes {activeAnnouncements.length > 0 && <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">{activeAnnouncements.length}</span>}
            </div>
            <ChevronDown size={20} className={`min-w-5 shrink-0 transition-transform ${isAnnouncementsOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <AnimatePresence>
            {isAnnouncementsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {activeAnnouncements.length > 0 ? (
                    activeAnnouncements.map(ann => (
                      <div key={ann.id} className={`${ann.status === 'Problema Resolvido' ? 'bg-emerald-500/10 border-emerald-500/20' : `bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)] ${ann.category !== 'Enquete / Evento' ? 'animate-[pulse_3s_ease-in-out_infinite]' : ''}`} rounded-xl p-4 flex gap-4 items-start shadow-lg border`}>
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${ann.status === 'Removido' ? 'bg-red-500' : ann.status === 'Mudança' ? 'bg-amber-500' : ann.status === 'Problema Resolvido' ? 'bg-emerald-500' : 'bg-orange-500'}`} />
                        <div>
                          <h4 className={`font-bold leading-tight ${ann.status === 'Problema Resolvido' ? 'text-emerald-50' : 'text-amber-50'}`}>{ann.name} <span className={`font-normal text-xs ml-2 ${ann.status === 'Problema Resolvido' ? 'text-emerald-400/80' : 'text-amber-400/80'}`}>({ann.status})</span></h4>
                          <p className={`text-sm mt-1 leading-snug ${ann.status === 'Problema Resolvido' ? 'text-emerald-200/80' : 'text-amber-200/80'}`}>{ann.message}</p>
                          <p className={`text-[10px] mt-2 font-mono ${ann.status === 'Problema Resolvido' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>Expira em: {new Date(ann.expiryDate).toLocaleString()}</p>
                          {ann.mediaUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden border border-white/5 shadow-2xl relative group">
                              {ann.mediaType === 'image' ? (
                                <img 
                                  src={ann.mediaUrl} 
                                  alt="Evidência" 
                                  className="w-full max-h-64 object-cover cursor-zoom-in hover:scale-110 transition-transform duration-500"
                                  onClick={() => {
                                    setSelectedImage(ann.mediaUrl);
                                    handleRegisterView(ann.id);
                                  }}
                                />
                              ) : (
                                <video src={ann.mediaUrl} className="w-full max-h-64 object-cover" controls />
                              )}
                              <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded-md text-[10px] font-bold text-white/70 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                {ann.mediaType === 'image' ? 'CLIQUE PARA AMPLIAR' : 'VÍDEO'}
                              </div>
                            </div>
                          )}
                          {ann.pollOptions && ann.pollOptions.length > 0 && (() => {
                            const annVotes = pollVotes.filter(v => v.announcement_id === ann.id);
                            const totalVotes = annVotes.length;
                            const hasVoted = currentCode ? annVotes.some(v => v.client_code === currentCode) : false;
                            const myVote = currentCode ? annVotes.find(v => v.client_code === currentCode) : null;
                            return (
                              <div className="mt-4 space-y-2">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 mb-2">📊 Enquete</p>
                                {ann.pollOptions.map((opt: PollOption) => {
                                  const optVotes = annVotes.filter(v => v.option_id === opt.id).length;
                                  const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                  const isMyChoice = myVote?.option_id === opt.id;
                                  return (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      disabled={hasVoted}
                                      onClick={() => {
                                        if (!currentCode) {
                                          setShowCodeModal(true);
                                          return;
                                        }
                                        handleVote(ann.id, opt.id);
                                      }}
                                      className={`w-full text-left rounded-xl p-3 border transition-all relative overflow-hidden ${
                                        isMyChoice
                                          ? 'border-indigo-500/60 bg-indigo-500/15'
                                          : hasVoted
                                            ? 'border-slate-700/50 bg-slate-800/30 cursor-default'
                                            : 'border-slate-700/50 bg-slate-800/30 hover:border-indigo-500/40 hover:bg-indigo-500/5 cursor-pointer active:scale-[0.98]'
                                      }`}
                                    >
                                      {(hasVoted || !currentCode) && (
                                        <div
                                          className={`absolute inset-0 rounded-xl transition-all duration-500 ${
                                            isMyChoice ? 'bg-indigo-500/15' : 'bg-slate-700/15'
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      )}
                                      <div className="relative z-10 flex items-center justify-between">
                                        <span className={`text-sm font-medium ${
                                          isMyChoice ? 'text-indigo-200' : 'text-slate-300'
                                        }`}>
                                          {isMyChoice && '✓ '}{opt.text}
                                        </span>
                                        {(hasVoted || !currentCode) && (
                                          <span className={`text-xs font-bold ${
                                            isMyChoice ? 'text-indigo-300' : 'text-slate-500'
                                          }`}>
                                            {pct}%
                                          </span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                                <p className="text-[10px] text-slate-500 text-right">
                                  {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
                                  {!currentCode && ' · Faça login para votar'}
                                  {hasVoted && ' · Você já votou'}
                                </p>
                              </div>
                            );
                          })()}

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                            <div className="flex flex-wrap gap-1.5">
                              {['❤️', '👏', '🔥', '👌', '👍'].map(emoji => {
                                const reactionsForEmoji = annReactions.filter(r => r.announcement_id === ann.id && r.emoji === emoji).length;
                                const myReaction = currentCode ? annReactions.some(r => r.announcement_id === ann.id && r.client_code === currentCode && r.emoji === emoji) : false;
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      if (!currentCode) {
                                        setShowCodeModal(true);
                                        return;
                                      }
                                      handleReaction(ann.id, emoji);
                                    }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                      myReaction 
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
                                    }`}
                                  >
                                    <span className="text-[13px]">{emoji}</span>
                                    {reactionsForEmoji > 0 && <span>{reactionsForEmoji}</span>}
                                  </button>
                                )
                              })}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 ml-auto pl-2">
                              {(() => {
                                const totalViews = annViews.filter(v => v.announcement_id === ann.id).length;
                                const formattedViews = totalViews >= 1000 ? (totalViews / 1000).toFixed(1) + 'K' : totalViews;
                                const timeStr = ann.createdAt ? new Date(ann.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                  <>
                                    <span>{formattedViews}</span>
                                    <Eye size={12} className="mx-0.5" />
                                    {timeStr && <span>{timeStr}</span>}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 text-center">
                      <p className="text-slate-400 text-sm">Nenhum aviso importante ou problema técnico no momento.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div id="tour-report" className="w-full max-w-lg mx-auto">
          <div className="text-center space-y-2 mb-8 mt-4 relative z-10 flex flex-col items-center">
            <img src="/logo.png?v=2" alt="The Best IPTV" className="w-32 h-32 object-contain mb-4 drop-shadow-lg" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md">O que precisa de suporte?</h2>
            <p className="text-slate-300 font-medium text-sm md:text-base drop-shadow-md">Selecione o tipo de conteúdo com problema</p>
          </div>
          
          <div className="flex flex-col gap-4 w-full relative z-10">
            <div className="w-full mb-2">
              {(() => {
                const isQuotaReached = !isAdminLogged && loggedClientCode ? getClientQuota(loggedClientCode).used >= 2 : false;
                return (
                  <button
                    onClick={() => {
                      if (!loggedClientCode && !isAdminLogged) {
                        setShowCodeModal(true);
                      } else {
                        if (isQuotaReached) {
                          setQuotaAlert('limit');
                          return;
                        }
                        setShowRequestModal(true);
                      }
                    }}
                    className={`w-full relative overflow-hidden group rounded-2xl p-0.5 transition-all duration-300 ${
                      isQuotaReached 
                        ? 'bg-slate-700/50' 
                        : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40'
                    }`}
                  >
                    <div className={`absolute inset-0 ${isQuotaReached ? 'bg-transparent' : 'bg-white/20 group-hover:bg-white/0'} transition-colors duration-300`} />
                    <div className={`relative ${isQuotaReached ? 'bg-slate-900/95' : 'bg-slate-900/90 group-hover:bg-transparent'} backdrop-blur-sm px-6 py-4 rounded-[14px] flex items-center justify-between transition-colors duration-300`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl transition-transform ${isQuotaReached ? 'bg-slate-800/80' : 'bg-white/10 group-hover:scale-110'}`}>
                          {isQuotaReached ? <Lock className="text-slate-500 w-6 h-6" /> : <PlusCircle className="text-white w-6 h-6" />}
                        </div>
                        <div className="text-left">
                          <h3 className={`font-bold text-lg tracking-wide ${isQuotaReached ? 'text-slate-400' : 'text-white'}`}>
                            {isQuotaReached ? 'Pedidos Bloqueados' : 'Pedir Conteúdos'}
                          </h3>
                          <p className={`text-sm font-medium ${isQuotaReached ? 'text-slate-500' : 'text-white/70'}`}>
                            {isQuotaReached ? 'Aguarde 7 dias' : 'Filmes e Séries'}
                          </p>
                        </div>
                      </div>
                      {!isQuotaReached && <ChevronRight className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />}
                    </div>
                  </button>
                );
              })()}
            </div>

        {[
          { id: 'Canal', icon: <Tv size={28} className="w-7 h-7 text-indigo-300 group-hover:text-white" />, label: 'Canal' },
          { id: 'Filme', icon: <Film size={28} className="w-7 h-7 text-indigo-300 group-hover:text-white" />, label: 'Filme' },
          { id: 'Série', icon: <Clapperboard size={28} className="w-7 h-7 text-indigo-300 group-hover:text-white" />, label: 'Série' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (!loggedClientCode && !isAdminLogged) {
                setShowCodeModal(true);
                return;
              }
              setContentType(item.id as ContentType);
              setIssueType('');
              setDevice('');
            }}
            className="flex items-center w-full p-5 md:p-6 gap-6 bg-[#1a1d2e]/60 backdrop-blur-xl border border-white/5 hover:bg-white/10 hover:border-white/20 rounded-[1.5rem] transition-all group shadow-xl shadow-black/30"
          >
            <div className="flex items-center justify-center p-3 sm:p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-all shadow-lg group-hover:shadow-indigo-500/40 shrink-0">
              {item.icon}
            </div>
            <span className="font-bold text-white text-xl md:text-2xl tracking-wide">{item.label}</span>
          </button>
        ))}
        </div>
        </div>
    </motion.div>
    );
  };

  const renderFormFields = () => (
    <motion.form
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onSubmit={handleSubmit}
      className="h-full flex flex-col pt-4 md:pt-0"
    >
      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-white/5">
        <button 
          type="button"
          onClick={() => setContentType(null)}
          className="text-slate-400 hover:text-white transition-colors text-sm font-semibold uppercase tracking-wider flex items-center gap-1"
        >
          <ChevronRight size={16} className="rotate-180" /> Voltar
        </button>
        <span className="text-slate-600">•</span>
        <span className="text-indigo-400 text-sm font-semibold uppercase tracking-wider">Relatando problema em: {contentType}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 pb-8 lg:pb-0 overflow-y-auto pr-1">
        {/* Left Column */}
        <div className="space-y-6">
          {contentType === 'Série' ? (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 sm:col-span-6 space-y-2">
                <label htmlFor="nomeSerie" className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
                  📺 Nome da série
                </label>
                <input 
                  required 
                  id="nomeSerie" 
                  name="nome" 
                  type="text" 
                  placeholder="Ex: The Last of Us" 
                  className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-4 py-3 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="col-span-6 sm:col-span-3 space-y-2">
                <label htmlFor="temporada" className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
                  📅 Temp.
                </label>
                <input 
                  required 
                  id="temporada" 
                  name="temporada" 
                  type="text" 
                  placeholder="Ex: 1" 
                  className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-4 py-3 rounded-xl text-sm transition-all outline-none"
                />
              </div>
              <div className="col-span-6 sm:col-span-3 space-y-2">
                <label htmlFor="episodio" className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
                  🎬 Ep.
                </label>
                <input 
                  required 
                  id="episodio" 
                  name="episodio" 
                  type="text" 
                  placeholder="Ex: 3" 
                  className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-4 py-3 rounded-xl text-sm transition-all outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="nomeConteudo" className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
                📺 Nome do {contentType}
              </label>
              <input 
                required 
                id="nomeConteudo" 
                name="nome" 
                type="text" 
                placeholder={`Digite o nome do ${contentType?.toLowerCase()}`} 
                className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-4 py-3 rounded-xl text-sm transition-all outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tipo do Problema */}
            <div className="bg-black/20 p-4 rounded-xl border border-slate-800/50 flex flex-col">
              <p className="text-xs font-bold text-indigo-400 uppercase mb-3">❌ Tipo do problema</p>
              <div className="space-y-3 flex-1 flex flex-col">
                {ISSUE_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors group">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input 
                        type="radio" 
                        name="issueTypeGroup"
                        value={type} 
                        checked={issueType === type}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="peer appearance-none w-5 h-5 bg-[#15181e] border border-slate-700 rounded-md checked:bg-indigo-600 checked:border-indigo-500 transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2.75 7.5 5.5 10.25 11.25 3.5"></polyline>
                      </svg>
                    </div>
                    {type}
                  </label>
                ))}
                
                <div className="mt-auto pt-2">
                  <AnimatePresence>
                    {issueType === 'Outro' && (
                      <motion.input 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        required
                        type="text" 
                        name="issueTypeOther"
                        value={issueTypeOther}
                        onChange={(e) => setIssueTypeOther(e.target.value)}
                        placeholder="Descreva..." 
                        className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-3 py-2 rounded-lg text-sm transition-all outline-none"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Dispositivo */}
            <div className="bg-black/20 p-4 rounded-xl border border-slate-800/50 flex flex-col">
              <p className="text-xs font-bold text-indigo-400 uppercase mb-3">📱 Dispositivo</p>
              <div className="space-y-3 flex-1 flex flex-col">
                {DEVICES.map((dev) => (
                  <label key={dev} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors group">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input 
                        type="radio" 
                        name="deviceGroup"
                        value={dev} 
                        checked={device === dev}
                        onChange={(e) => setDevice(e.target.value)}
                        className="peer appearance-none w-5 h-5 bg-[#15181e] border border-slate-700 rounded-md checked:bg-indigo-600 checked:border-indigo-500 transition-colors cursor-pointer"
                      />
                      <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2.75 7.5 5.5 10.25 11.25 3.5"></polyline>
                      </svg>
                    </div>
                    {dev}
                  </label>
                ))}

                <div className="mt-auto pt-2">
                  <AnimatePresence>
                    {device === 'Outro' && (
                      <motion.input 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        required
                        type="text" 
                        name="deviceOther"
                        value={deviceOther}
                        onChange={(e) => setDeviceOther(e.target.value)}
                        placeholder="Descreva..." 
                        className="w-full bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 px-3 py-2 rounded-lg text-sm transition-all outline-none"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4 flex flex-col h-full lg:mb-1">
          <div className="flex-1 flex flex-col space-y-2">
            <label htmlFor="descricao" className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
              📝 Descreva o problema
            </label>
            <textarea 
              required 
              id="descricao" 
              name="descricao" 
              placeholder="Detalhes adicionais sobre o erro..." 
              className="flex-1 w-full min-h-[120px] lg:min-h-0 bg-[#15181e] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 p-4 rounded-xl resize-none text-sm transition-all outline-none"
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1 block">
              📸 Evidência (Foto/Vídeo)
            </label>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-700 bg-slate-800/10 rounded-xl cursor-pointer hover:bg-indigo-600/5 hover:border-indigo-500/50 transition-all relative overflow-hidden">
                <input 
                  type="file" 
                  id="attachment"
                  name="attachment"
                  accept="image/*,video/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFileName(e.target.files[0].name);
                    } else {
                      setFileName('');
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                  {fileName ? (
                    <>
                      <CheckCircle2 size={24} className="text-indigo-400 mb-1.5" />
                      <p className="text-xs text-indigo-300 truncate w-full max-w-[200px]">{fileName}</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud size={24} className="text-slate-500 mb-1.5" />
                      <p className="text-xs text-slate-500">Clique ou arraste para anexar</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !issueType || !device}
            className="w-full mt-6 py-4 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:from-indigo-600/50 disabled:to-indigo-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-xl shadow-indigo-500/10 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] lg:mt-auto shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar Reporte
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 bg-[#0c0e12]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-10 z-20 rounded-3xl"
    >
      <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
        <CheckCircle2 size={40} className="text-emerald-500" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Recebemos seu reporte!</h2>
      <p className="text-slate-400 mb-8 max-w-md">
        Nossa equipe técnica já foi notificada e está analisando o problema.<br/>Você receberá uma atualização em breve.
      </p>
      <button
        onClick={handleReset}
        className="px-8 py-3 bg-[#15181e] hover:bg-[#1a1d24] border border-slate-700 hover:border-slate-600 text-white rounded-full font-semibold transition-all"
      >
        Novo Chamado
      </button>
    </motion.div>
  );

  const renderHistoryView = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Meu Histórico</h2>
          <p className="text-slate-400 text-sm">Acompanhe seus reportes técnicos</p>
        </div>
        {userReports.length > 0 && (
          <button 
            onClick={() => {
              if (confirm('Deseja limpar todo o seu histórico de reportes?')) {
                setUserReports([]);
              }
            }}
            className="flex items-center gap-2 text-red-500 hover:text-red-400 text-sm font-semibold transition-colors bg-red-500/10 px-3 py-2 rounded-lg"
          >
            <Trash2 size={16} /> Limpar Tudo
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {userReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-black/10 rounded-3xl border border-dashed border-slate-800">
            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center text-slate-500">
              <History size={32} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Nenhum reporte encontrado</p>
              <p className="text-slate-500 text-sm">Seus problemas relatados aparecerão aqui.</p>
            </div>
          </div>
        ) : (
          userReports.map((report) => (
            <div key={report.id} className="bg-[#15181e] border border-slate-800 p-5 rounded-2xl space-y-3 relative overflow-hidden group hover:border-slate-700 transition-all shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                    report.type === 'Canal' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                    report.type === 'Filme' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                    'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}>
                    {report.type}
                  </span>
                  <p className="text-white font-bold">{report.name}</p>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">
                  {new Date(report.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Problema</p>
                  <p className="text-sm text-slate-300 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-500" /> {report.issue}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dispositivo</p>
                  <p className="text-sm text-slate-300 flex items-center gap-2">
                    <Tv size={14} className="text-indigo-400" /> {report.device}
                  </p>
                </div>
              </div>

              {report.description && (
                <div className="pt-2 border-t border-slate-800/50">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-slate-400 leading-relaxed italic">"{report.description}"</p>
                </div>
              )}

              <div className="absolute top-0 right-0 w-1 h-full bg-indigo-600/20 group-hover:bg-indigo-600 transition-all" />
            </div>
          ))
        )}
      </div>
    </motion.div>
  );

  const currentClient = clients.find(c => c.code === loggedClientCode);

  const renderProfileView = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col h-full"
    >
      <div className="mb-8 border-b border-white/5 pb-4">
        <h2 className="text-2xl font-bold text-white tracking-tight">Meu Perfil</h2>
        <p className="text-slate-400 text-sm">Gerencie suas informações de acesso</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-1 pb-4">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl relative overflow-hidden shadow-2xl shadow-indigo-600/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-inner">
              <User size={48} className="text-white" />
            </div>
            <div className="text-center md:text-left space-y-1">
              <h3 className="text-2xl font-bold text-white tracking-tight">{currentClient ? currentClient.name : 'Usuário The Best IPTV'}</h3>
              <p className="text-indigo-200/80 font-medium">{currentClient ? 'Cliente Final' : 'Conta Padrão'}</p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <span className={`w-2 h-2 rounded-full animate-pulse ${currentClient ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                <span className="text-xs text-white/70 font-semibold uppercase tracking-widest">{currentClient ? 'Acesso Ativo' : 'Não Logado'}</span>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#15181e] border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              <Info size={18} className="text-indigo-400" /> Sobre esta conta
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-sm">Tipo de Acesso</span>
                <span className="text-slate-300 text-sm font-medium">Cliente Final</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-sm">Status da Sessão</span>
                <span className="text-emerald-500 text-sm font-bold uppercase tracking-wider">OK</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 text-sm">Local Storage ID</span>
                <span className="text-slate-400 text-[10px] font-mono">iptv_user_v1</span>
              </div>
            </div>
          </div>

          <div className="bg-[#15181e] border border-slate-800 p-6 rounded-2xl space-y-4">
            <h4 className="text-white font-bold flex items-center gap-2">
              <HelpCircle size={18} className="text-indigo-400" /> Suporte & Ajuda
            </h4>
            <div className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                Caso precise de auxílio além dos reportes técnicos, você pode entrar em contato com nossa central de atendimento especializada.
              </p>
              <button 
                onClick={() => window.open('https://wa.me/5521959368651', '_blank')}
                className="w-full py-3 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} /> Central WhatsApp
              </button>
              {currentClient ? (
                <>
                  <button 
                    onClick={() => window.open(currentClient.canvasLink, '_blank')}
                    className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Tv size={18} /> Minha Área Exclusiva
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('iptv_access_code_v1');
                      setLoggedClientCode('');
                      setActiveView('dashboard');
                    }}
                    className="w-full py-3 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> Sair da Conta
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setShowCodeModal(true)}
                  className="w-full py-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Key size={18} /> Fazer Login (Código)
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div>
            <h5 className="text-amber-500 font-bold text-sm mb-1 uppercase tracking-wider">Segurança dos Dados</h5>
            <p className="text-xs text-slate-500 leading-relaxed">
              Suas informações de reporte são armazenadas localmente em seu navegador para seu controle privado. Ao limpar o cache do navegador ou trocar de dispositivo, o histórico local será removido.
            </p>
          </div>
        </div>

        {/* Bloco de Notificações Push */}
        {'Notification' in window && (
          <div className="p-6 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl space-y-3">
            <h4 className="text-white font-bold flex items-center gap-2">
              <Bell size={18} className="text-indigo-400" /> Notificações Push
            </h4>
            {pushPermission === 'granted' ? (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <p className="text-emerald-300 font-semibold text-sm">Notificações ativadas!</p>
                  <p className="text-emerald-500/70 text-xs">Você receberá avisos quando o admin publicar um novo informe.</p>
                </div>
              </div>
            ) : pushPermission === 'denied' ? (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <p className="text-red-300 text-xs">Notificações bloqueadas. Desbloqueie nas configurações do navegador.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Ative para receber alertas no seu celular/PC sempre que um novo informe ou evento for publicado — mesmo com o app fechado!
                </p>
                <button
                  onClick={requestPushPermission}
                  disabled={isPushLoading}
                  className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPushLoading ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
                  {isPushLoading ? 'Ativando...' : '🔔 Ativar Notificações'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderDashboard = () => (
    <AnimatePresence mode="wait">
      {submitStatus === 'success' ? (
        <div key="success" className="absolute inset-0">{renderSuccess()}</div>
      ) : !contentType ? (
        <div key="selection" className="flex-1 overflow-y-auto w-full">{renderContentSelection()}</div>
      ) : (
        <div key="form" className="flex-1 overflow-hidden w-full">{renderFormFields()}</div>
      )}
    </AnimatePresence>
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail === 'thebestiptv10@gmail.com' && loginPassword === '#Senhasecreta2e') {
      setIsAdminLogged(true);
      setLoginError('');
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setLoginError('Credenciais inválidas!');
    }
  };

  const handleAddAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const isServiceDown = annCategory === 'Serviço de Streaming' && annStatus === 'Problemas Técnicos';
    const isEnqueteEvento = annCategory === 'Enquete / Evento';
    
    // Se não for serviço fora do ar nem enquete, nome do conteúdo é obrigatório
    if (!isServiceDown && !isEnqueteEvento && !annName) return;
    if (!annMessage || !annExpiry) return;

    let mediaUrl: string | undefined = undefined;
    let mediaType: 'image' | 'video' | null = null;

    if (annMedia) {
      mediaType = annMedia.type.startsWith('image/') ? 'image' : 'video';
      mediaUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(annMedia);
      });
    }

    let finalPollOptions = null;
    if (annStatus === 'Enquete') {
      const validOptions = pollOptionsInput.filter(opt => opt.trim() !== '');
      if (validOptions.length >= 2) {
        finalPollOptions = validOptions.map(opt => ({
          id: Math.random().toString(36).substring(2, 9),
          text: opt.trim()
        }));
      }
    }

    try {
      const { error } = await supabase.from('announcements').insert([{
        category: annCategory,
        name: isServiceDown ? 'Serviço de Streaming' : (isEnqueteEvento && !annName ? annStatus : annName),
        status: annStatus,
        message: annMessage,
        expiry_date: new Date(annExpiry).toISOString(),
        media_url: mediaUrl,
        media_type: mediaType,
        poll_options: finalPollOptions
      }]);

      if (error) {
        alert('Erro ao publicar informe. O arquivo pode ser muito grande: ' + error.message);
        return;
      }

      setAnnName('');
      setAnnMessage('');
      setAnnExpiry('');
      setAnnMedia(null);
      setAnnMediaName('');
      setPollOptionsInput(['', '']);
    } catch (err: any) {
      alert('Erro inesperado ao publicar: ' + err.message);
    }
  };

  const handleDuplicateAnnouncement = (ann: Announcement) => {
    setAnnCategory(ann.category);
    setAnnStatus(ann.status);
    if (ann.name) setAnnName(ann.name);
    else setAnnName('');
    setAnnMessage(ann.message);
    setAnnExpiry(ann.expiryDate.slice(0, 16));
  };

  const handleDeleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
  };

  const handleResolveAnnouncement = async (id: string) => {
    await supabase.from('announcements').update({ status: 'Problema Resolvido' }).eq('id', id);
  };

  const handleVote = async (announcementId: string, optionId: string) => {
    const voterCode = loggedClientCode || (isAdminLogged ? 'admin' : '');
    if (!voterCode) return;
    const alreadyVoted = pollVotes.some(v => v.announcement_id === announcementId && v.client_code === voterCode);
    if (alreadyVoted) return;
    await supabase.from('poll_votes').insert([{
      announcement_id: announcementId,
      option_id: optionId,
      client_code: voterCode
    }]);
  };

  const handleRegisterView = async (annId: string) => {
    let viewerCode = loggedClientCode || (isAdminLogged ? 'admin' : '');
    if (!viewerCode) {
      let guestId = localStorage.getItem('guest_id');
      if (!guestId) {
        guestId = 'guest-' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('guest_id', guestId);
      }
      viewerCode = guestId;
    }

    // Camada 1: verificação imediata via localStorage (evita race conditions com fetch async)
    const localKey = `ann_viewed_${viewerCode}`;
    const localViewed: string[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (localViewed.includes(annId)) return; // já visualizou, para aqui

    // Marca como visto no localStorage imediatamente
    localViewed.push(annId);
    localStorage.setItem(localKey, JSON.stringify(localViewed));

    // Camada 2: atualiza o estado local para refletir na UI
    setAnnViews(prev => {
      const already = prev.some(v => v.announcement_id === annId && v.client_code === viewerCode);
      if (already) return prev;
      return [...prev, { id: 'temp-' + Date.now(), announcement_id: annId, client_code: viewerCode }];
    });

    // Camada 3: upsert no banco com ignoreDuplicates (constraint UNIQUE no banco garante unicidade)
    await supabase.from('announcement_views').upsert([{
      announcement_id: annId,
      client_code: viewerCode
    }], { onConflict: 'announcement_id,client_code', ignoreDuplicates: true });
  };

  useEffect(() => {
    if (!isAnnouncementsOpen) return;
    const activeAnnouncements = announcements.filter(a => new Date() <= new Date(a.expiryDate));
    activeAnnouncements.forEach(ann => {
      handleRegisterView(ann.id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAnnouncementsOpen]);

  const handleReaction = async (announcementId: string, emoji: string) => {
    const voterCode = loggedClientCode || (isAdminLogged ? 'admin' : '');
    if (!voterCode) return;
    const existingReaction = annReactions.find(r => r.announcement_id === announcementId && r.client_code === voterCode && r.emoji === emoji);

    if (existingReaction) {
      await supabase.from('announcement_reactions').delete().eq('id', existingReaction.id);
    } else {
      await supabase.from('announcement_reactions').insert([{
        announcement_id: announcementId,
        client_code: voterCode,
        emoji
      }]);
    }
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientCode || !clientLink) return;

    if (clients.some(c => c.code === clientCode)) {
      alert("Atenção: Este código já está em uso por outro cliente.");
      return;
    }

    // Atualização otimista na UI para aparecer na hora
    const tempClient = { 
      id: Date.now().toString(), 
      name: clientName, 
      code: clientCode, 
      canvasLink: clientLink, 
      addedAt: new Date().toISOString() 
    };
    setClients(prev => [tempClient, ...prev]);

    await supabase.from('clients').insert([{
      name: clientName,
      code: clientCode,
      canvas_link: clientLink
    }]);

    setClientName('');
    setClientCode('');
    setClientLink('https://testetestettt.my.canva.site/sr-carlos');
  };

  const handleSaveClient = async (updatedClient: Client) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: updatedClient.name,
          code: updatedClient.code,
          canvas_link: updatedClient.canvasLink,
          email: updatedClient.email,
          phone: updatedClient.phone,
        })
        .eq('id', updatedClient.id);

      if (error) throw error;
      setEditingClient(null);
    } catch (err: any) {
      alert('Erro ao salvar cliente: ' + (err.message || 'Erro desconhecido.'));
    }
  };

  const handleRecoverCode = async () => {
    if (!forgotCodePhone.trim()) {
      alert('Por favor, digite o seu telefone.');
      return;
    }
    
    setIsRecoveringCode(true);
    try {
      const { data: clientsData, error: searchError } = await supabase
        .from('clients')
        .select('*')
        .eq('phone', forgotCodePhone);

      if (searchError) throw searchError;

      if (!clientsData || clientsData.length === 0) {
        alert('Nenhum cliente encontrado com este número de telefone.');
        setIsRecoveringCode(false);
        return;
      }

      const client = clientsData[0];
      
      // Check 60 days limit
      if (client.last_recovery_at) {
        const lastRecoveryDate = new Date(client.last_recovery_at);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - lastRecoveryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 60) {
          const formattedDate = lastRecoveryDate.toLocaleDateString('pt-BR');
          throw new Error(`Você só pode solicitar um novo código a cada 60 dias. Sua última solicitação foi em ${formattedDate}. Por favor, aguarde mais ${60 - diffDays} dias.`);
        }
      }

      const newCode = Array.from({length: 6}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');

      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          code: newCode,
          last_recovery_at: new Date().toISOString()
        })
        .eq('id', client.id);

      if (updateError) throw updateError;

      // Enviar requisição para o backend Serverless (Vercel)
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.phone,
          code: newCode,
          name: client.name
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar SMS. O código foi gerado mas o SMS não chegou.');
      }

      alert('Seu novo código foi gerado e enviado por SMS!');
      setShowForgotCodeModal(false);
      setForgotCodePhone('');
    } catch (err: any) {
      alert('Erro ao recuperar código: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsRecoveringCode(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if(confirm('Tem certeza que deseja remover este cliente?')) {
      await supabase.from('clients').delete().eq('id', id);
    }
  };

  const handleWhatsAppMessage = (clientName: string, code: string) => {
    const message = `📢 COMUNICADO IMPORTANTE – THE BEST IPTV+ 📢\n\nOlá, caro cliente ${clientName}, tudo bem? 😊\n\nInformamos que o seu código de acesso foi atualizado. 🔄\n\n🆔 Seu novo código de cliente é: ${code}\n\nCom este código você poderá acessar o site e visualizar todas as informações da sua assinatura, dados da conta e demais recursos disponíveis. 📺✨\n\n⚠️ Guarde este código em local seguro.\n\nEm caso de dúvidas, entre em contato com nosso suporte. 🤝\n\nAgradecemos pela preferência! 💙\n\nTHE BEST IPTV+ 🚀📺`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const handleAccessWithCode = (e: React.FormEvent) => {
    e.preventDefault();
    const foundClient = clients.find(c => c.code === accessCode);
    if (foundClient) {
      localStorage.setItem('iptv_access_code_v1', accessCode);
      setLoggedClientCode(accessCode);
      setShowCodeModal(false);
      setAccessCode('');
      setAccessCodeError('');
      setActiveView('profile'); // Redireciona para o perfil para ele ver que logou
    } else {
      setAccessCodeError('Código inválido ou não encontrado.');
    }
  };

  const renderLoginModal = () => (
    <AnimatePresence>
      {showLoginModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto pt-20"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`bg-[#15181e] border border-slate-800 rounded-3xl p-6 md:p-8 w-full ${isAdminLogged ? 'max-w-2xl' : 'max-w-md'} shadow-2xl relative my-auto`}
          >
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            
            {isAdminLogged ? (
               <div className="space-y-6">
                 <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                   <div className="w-12 h-12 bg-indigo-600/20 rounded-full flex items-center justify-center shrink-0">
                     <LayoutDashboard size={24} className="text-indigo-400" />
                   </div>
                   <div className="flex-1">
                     <h2 className="text-xl font-bold text-white tracking-tight">Painel Admin</h2>
                     <p className="text-emerald-400 text-sm">Autenticado com sucesso</p>
                   </div>
                 </div>

                 <div className="space-y-3">
                   {/* Accordion: Informes */}
                   <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${adminTab === 'informes' ? 'bg-white/5 border-indigo-500/30' : 'bg-[#0c0e12] border-slate-800'}`}>
                     <button 
                       onClick={() => setAdminTab(adminTab === 'informes' ? null : 'informes')}
                       className="w-full flex items-center justify-between p-5 text-left transition-colors"
                     >
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl transition-all duration-300 ${adminTab === 'informes' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>
                           <Bell size={20} />
                         </div>
                         <div>
                           <span className="text-white font-bold block">Informes</span>
                           <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Gestão de comunicados</span>
                         </div>
                       </div>
                       <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${adminTab === 'informes' ? 'rotate-180 text-indigo-400' : ''}`} />
                     </button>
                     <AnimatePresence initial={false}>
                       {adminTab === 'informes' && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden"
                         >
                           <div className="p-5 pt-0 space-y-6">
                             <form onSubmit={handleAddAnnouncement} className="bg-[#0c0e12] p-5 rounded-2xl border border-slate-800 space-y-4">
                                <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                  <Bell size={16} className="text-indigo-400"/>
                                  Novo Informe
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold uppercase">Categoria</label>
                                    <select 
                                      value={annCategory} onChange={(e) => {
                                        setAnnCategory(e.target.value);
                                        if (e.target.value === 'Enquete / Evento') {
                                          setAnnStatus('Enquete');
                                        } else if (annStatus === 'Enquete' || annStatus === 'Evento') {
                                          setAnnStatus('Problemas Técnicos');
                                        }
                                      }}
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500"
                                    >
                                      <option>Canal</option><option>Filme</option><option>Série</option><option>Serviço de Streaming</option><option>Enquete / Evento</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold uppercase">Status/Motivo</label>
                                    <select 
                                      value={annStatus} onChange={(e) => setAnnStatus(e.target.value)}
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500"
                                    >
                                      {annCategory === 'Enquete / Evento' ? (
                                        <>
                                          <option>Enquete</option>
                                          <option>Evento</option>
                                        </>
                                      ) : (
                                        <>
                                          <option>Problemas Técnicos</option>
                                          <option>Mudança</option>
                                          <option>Removido</option>
                                        </>
                                      )}
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold uppercase">Nome do Conteúdo</label>
                                    <input 
                                      type="text"
                                      disabled={annCategory === 'Serviço de Streaming'}
                                      placeholder={annCategory === 'Serviço de Streaming' ? 'N/A' : (annCategory === 'Enquete / Evento' ? 'Ex: Melhor Filme do Ano (Opcional)' : 'Ex: HBO Brasil')}
                                      value={annCategory === 'Serviço de Streaming' ? '' : annName}
                                      onChange={(e) => setAnnName(e.target.value)}
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500 disabled:opacity-50"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500 font-bold uppercase">Data de Expiração</label>
                                    <input 
                                      type="datetime-local"
                                      required
                                      value={annExpiry}
                                      onFocus={() => {
                                        if (!annExpiry) {
                                          const now = new Date();
                                          const offset = now.getTimezoneOffset() * 60000;
                                          const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
                                          setAnnExpiry(localISOTime);
                                        }
                                      }}
                                      onChange={(e) => setAnnExpiry(e.target.value)}
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-slate-500 font-bold uppercase">Mensagem visível</label>
                                  <textarea 
                                    required value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} rows={2}
                                    placeholder="Descreva o que está acontecendo..."
                                    className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm resize-none outline-none focus:border-indigo-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-slate-500 font-bold uppercase">Anexo (Opcional)</label>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <label className="flex-1 flex items-center justify-center h-10 border border-dashed border-slate-700 bg-[#15181e] rounded-xl cursor-pointer hover:border-indigo-500 transition-colors">
                                        <input 
                                          type="file" 
                                          accept="image/*,video/*"
                                          className="hidden"
                                          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              setAnnMedia(e.target.files[0]);
                                              setAnnMediaName(e.target.files[0].name);
                                            }
                                          }}
                                        />
                                        <span className="text-xs text-slate-500 truncate px-2">
                                          {annMediaName || "Selecionar Foto ou Vídeo"}
                                        </span>
                                      </label>
                                      {annMedia && (
                                        <button 
                                          type="button" 
                                          onClick={() => { setAnnMedia(null); setAnnMediaName(''); }}
                                          className="p-2 text-red-500 hover:text-red-400"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* Preview da mídia selecionada */}
                                    {annMedia && (
                                      <div className="mt-1 rounded-xl overflow-hidden border border-slate-700/50 bg-black/40 relative">
                                        {annMedia.type.startsWith('image/') ? (
                                          <img 
                                            src={URL.createObjectURL(annMedia)} 
                                            alt="Preview" 
                                            className="w-full max-h-48 object-contain"
                                          />
                                        ) : (
                                          <video 
                                            src={URL.createObjectURL(annMedia)} 
                                            className="w-full max-h-48 object-contain" 
                                            controls 
                                          />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {annStatus === 'Enquete' && (
                                  <div className="space-y-3 bg-indigo-900/10 p-4 rounded-xl border border-indigo-500/20">
                                    <div className="flex justify-between items-center">
                                      <label className="text-xs text-indigo-300 font-bold uppercase">Opções da Enquete</label>
                                      <button 
                                        type="button" 
                                        onClick={() => setPollOptionsInput([...pollOptionsInput, ''])}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                                      >
                                        + Adicionar Opção
                                      </button>
                                    </div>
                                    {pollOptionsInput.map((opt, index) => (
                                      <div key={index} className="flex gap-2">
                                        <input 
                                          type="text" 
                                          placeholder={`Opção ${index + 1}`}
                                          value={opt}
                                          onChange={(e) => {
                                            const newOpts = [...pollOptionsInput];
                                            newOpts[index] = e.target.value;
                                            setPollOptionsInput(newOpts);
                                          }}
                                          className="flex-1 bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-indigo-500"
                                        />
                                        {pollOptionsInput.length > 2 && (
                                          <button 
                                            type="button" 
                                            onClick={() => {
                                              const newOpts = [...pollOptionsInput];
                                              newOpts.splice(index, 1);
                                              setPollOptionsInput(newOpts);
                                            }}
                                            className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                                          >
                                            ✕
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors">
                                  Publicar Informe
                                </button>
                              </form>

                              {/* Histórico de Informes */}
                              <div className="space-y-3">
                                <h3 className="text-white font-medium text-sm flex items-center justify-between">
                                  Histórico de Informes ({announcements.length})
                                </h3>
                                {announcements.length === 0 ? (
                                  <p className="text-slate-500 text-sm italic py-4 text-center bg-[#0c0e12] rounded-xl border border-dashed border-slate-800">
                                    Nenhum informe publicado.
                                  </p>
                                ) : (
                                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                    {announcements.map((ann) => (
                                      <div key={ann.id} className="p-4 rounded-xl border bg-[#0c0e12] border-slate-700 space-y-3">
                                        <div className="flex justify-between items-start gap-4">
                                          <div>
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700`}>
                                                {ann.category}
                                              </span>
                                              <span className={`text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                                ann.status === 'Removido' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                ann.status === 'Mudança' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                ann.status === 'Problema Resolvido' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                                              }`}>
                                                {ann.status}
                                              </span>
                                            </div>
                                            <p className="text-white font-bold text-sm">{ann.name}</p>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {ann.status !== 'Problema Resolvido' && (
                                              <button 
                                                title="Marcar como Resolvido"
                                                onClick={() => handleResolveAnnouncement(ann.id)} 
                                                className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                              >
                                                <CheckCircle2 size={16} />
                                              </button>
                                            )}
                                            <button 
                                              title="Enviar via WhatsApp"
                                              onClick={() => {
                                                const text = `📢 *${ann.name}*\n\n*Status:* ${ann.status}\n*Informe:* ${ann.message}\n\n_Expira em: ${new Date(ann.expiryDate).toLocaleString()}_`;
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                                              }} 
                                              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                            >
                                              <MessageCircle size={16} />
                                            </button>
                                            <button 
                                              title="Duplicar/Editar"
                                              onClick={() => handleDuplicateAnnouncement(ann)} 
                                              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            >
                                              <Copy size={16} />
                                            </button>
                                            <button 
                                              title="Excluir"
                                              onClick={() => handleDeleteAnnouncement(ann.id)} 
                                              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                              <Trash2 size={16} />
                                            </button>
                                          </div>
                                        </div>
                                        
                                        <p className="text-slate-400 text-xs line-clamp-2 italic">"{ann.message}"</p>
                                        
                                        {ann.mediaUrl && (
                                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-800 bg-black/20">
                                            {ann.mediaType === 'image' ? (
                                              <img 
                                                src={ann.mediaUrl} 
                                                alt="Anexo" 
                                                className="w-full h-24 object-cover cursor-zoom-in" 
                                                onClick={() => setSelectedImage(ann.mediaUrl!)}
                                              />
                                            ) : (
                                              <video src={ann.mediaUrl} className="w-full h-24 object-cover" controls />
                                            )}
                                          </div>
                                        )}

                                        {ann.pollOptions && ann.pollOptions.length > 0 && (() => {
                                          const annVotes = pollVotes.filter(v => v.announcement_id === ann.id);
                                          const totalVotes = annVotes.length;
                                          return (
                                            <div className="mt-2 space-y-1.5 bg-indigo-900/10 p-3 rounded-xl border border-indigo-500/15">
                                              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-1">📊 Enquete · {totalVotes} voto{totalVotes !== 1 ? 's' : ''}</p>
                                              {ann.pollOptions.map((opt: PollOption) => {
                                                const optVotes = annVotes.filter(v => v.option_id === opt.id).length;
                                                const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                                                return (
                                                  <div key={opt.id} className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-800/50 rounded-lg h-7 relative overflow-hidden">
                                                      <div className="absolute inset-0 bg-indigo-500/20 rounded-lg transition-all duration-500" style={{ width: `${pct}%` }} />
                                                      <span className="absolute inset-0 flex items-center px-2 text-[11px] text-slate-300 font-medium">{opt.text}</span>
                                                    </div>
                                                    <span className="text-[11px] text-indigo-300 font-bold w-10 text-right">{pct}%</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        })()}

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                          <span className="text-[10px] text-slate-600 uppercase font-bold">Expira em:</span>
                                          <span className="text-[10px] font-mono text-slate-500">{new Date(ann.expiryDate).toLocaleString()}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Accordion: Clientes */}
                   <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${adminTab === 'clientes' ? 'bg-white/5 border-blue-500/30' : 'bg-[#0c0e12] border-slate-800'}`}>
                     <button 
                       onClick={() => setAdminTab(adminTab === 'clientes' ? null : 'clientes')}
                       className="w-full flex items-center justify-between p-5 text-left transition-colors"
                     >
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl transition-all duration-300 ${adminTab === 'clientes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-800 text-slate-400'}`}>
                           <User size={20} />
                         </div>
                         <div>
                           <span className="text-white font-bold block">Clientes</span>
                           <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Base de usuários</span>
                         </div>
                       </div>
                       <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${adminTab === 'clientes' ? 'rotate-180 text-blue-400' : ''}`} />
                     </button>
                     <AnimatePresence initial={false}>
                       {adminTab === 'clientes' && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden"
                         >
                           <div className="p-5 pt-0 space-y-6">
                              {/* Formulário para Adicionar Cliente */}
                              <form onSubmit={handleAddClient} className="bg-[#0c0e12] p-5 rounded-2xl border border-slate-800 space-y-4">
                                <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                  <User size={16} className="text-blue-400"/> Novo Cliente
                                </h3>
                                <div className="space-y-3">
                                  <input
                                    type="text" required value={clientName} onChange={(e) => setClientName(e.target.value)}
                                    placeholder="Nome do cliente"
                                    className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-blue-500"
                                  />
                                  <div className="flex gap-2">
                                    <input
                                      type="text" required value={clientCode} onChange={(e) => setClientCode(e.target.value)}
                                      placeholder="Código de acesso único"
                                      className="flex-1 bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-blue-500"
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setClientCode(Array.from({length: 6}, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join(''))}
                                      className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors flex items-center justify-center border border-slate-700 hover:border-slate-600"
                                      title="Gerar código aleatório (letras e números)"
                                    >
                                      <RefreshCcw size={16} />
                                    </button>
                                  </div>
                                  <input
                                    type="url" required value={clientLink} onChange={(e) => setClientLink(e.target.value)}
                                    placeholder="Link do Canva do cliente"
                                    className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-blue-500"
                                  />
                                </div>
                                <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors">
                                  Cadastrar Cliente
                                </button>
                              </form>

                              <div className="space-y-3">
                                <h3 className="text-white font-medium text-sm flex items-center justify-between">
                                  Lista de Clientes ({clients.length})
                                </h3>
                                {clients.length === 0 ? (
                                  <p className="text-slate-500 text-sm italic">Nenhum cliente cadastrado.</p>
                                ) : (
                                  <div className="max-h-48 overflow-y-auto pr-2 space-y-2">
                                    {clients.map(client => (
                                      <div 
                                        key={client.id} 
                                        onClick={() => setEditingClient(client)}
                                        className="p-4 rounded-xl border bg-[#0c0e12] border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors flex justify-between items-center gap-4 group"
                                      >
                                        <div className="overflow-hidden">
                                          <p className="text-white font-bold text-sm truncate group-hover:text-indigo-400 transition-colors">{client.name}</p>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono group-hover:bg-slate-700 transition-colors">Código: {client.code}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center shrink-0">
                                          <button 
                                            type="button" 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteClient(client.id);
                                            }} 
                                            className="text-slate-500 hover:text-red-400 p-2 transition-colors flex items-center justify-center"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Accordion: Atualizações */}
                   <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${adminTab === 'atualizacoes' ? 'bg-white/5 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]' : 'bg-[#0c0e12] border-slate-800'}`}>
                     <button 
                       onClick={() => setAdminTab(adminTab === 'atualizacoes' ? null : 'atualizacoes')}
                       className="w-full flex items-center justify-between p-5 text-left transition-colors"
                     >
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl transition-all duration-300 ${adminTab === 'atualizacoes' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30' : 'bg-slate-800 text-slate-400'}`}>
                           <RefreshCcw size={20} />
                         </div>
                         <div>
                           <span className="text-white font-bold block">Atualizações</span>
                           <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Conteúdo do catálogo</span>
                         </div>
                       </div>
                       <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${adminTab === 'atualizacoes' ? 'rotate-180 text-amber-400' : ''}`} />
                     </button>
                     <AnimatePresence initial={false}>
                       {adminTab === 'atualizacoes' && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden"
                         >
                           <div className="p-5 pt-0 space-y-6">
                              <div className="space-y-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                      <Film size={16} className="text-amber-400" /> Filmes
                                    </h3>
                                    {movieUpdates.length > 0 && (
                                      <button 
                                        type="button" 
                                        onClick={async () => {
                                          if (window.confirm('Excluir TODOS os filmes da lista?')) {
                                            await supabase.from('movie_updates').delete().not('id', 'is', null);
                                          }
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 transition-colors"
                                      >
                                        <Trash2 size={12} /> Limpar Todos
                                      </button>
                                    )}
                                  </div>
                                  <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (newMovieTitle.trim()) {
                                      const titles = newMovieTitle
                                        .split('\n')
                                        .map(t => t.replace(/^[>\-🍿\*]\s*(Atualização de.*)?/i, '').replace(/^[>\-]\s*/, '').trim())
                                        .filter(t => t && !t.toLowerCase().includes('atualização de'));
                                      
                                      if (titles.length > 0) {
                                        await supabase.from('movie_updates').insert(titles.map(t => ({ title: t })));
                                        setNewMovieTitle('');
                                      }
                                    }
                                  }} className="flex flex-col gap-2">
                                    <textarea
                                      value={newMovieTitle} onChange={(e) => setNewMovieTitle(e.target.value)}
                                      placeholder="Ex:&#10;> Filme 1&#10;> Filme 2"
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-amber-500 resize-y"
                                      rows={3}
                                    />
                                    <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold transition-colors">Adicionar Filmes</button>
                                  </form>
                                  <div className="max-h-48 overflow-y-auto space-y-2 mt-4 pr-2">
                                    {movieUpdates.map(m => (
                                      <div key={m.id} className="flex items-center gap-2 bg-[#0c0e12] border border-slate-800 p-2 rounded-lg">
                                        <span className="flex-1 text-slate-300 text-sm truncate">{m.title}</span>
                                        <button type="button" onClick={async () => {
                                            const newTitle = window.prompt("Editar título do filme:", m.title);
                                            if (newTitle && newTitle !== m.title) {
                                                await supabase.from('movie_updates').update({ title: newTitle }).eq('id', m.id);
                                            }
                                        }} className="text-slate-500 hover:text-amber-400 p-1.5 transition-colors"><Pencil size={14}/></button>
                                        <button type="button" onClick={async () => {
                                            if (window.confirm('Tem certeza que deseja excluir?')) {
                                              await supabase.from('movie_updates').delete().eq('id', m.id);
                                            }
                                        }} className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={14}/></button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <h3 className="text-white font-medium text-sm flex items-center gap-2">
                                      <Tv size={16} className="text-purple-400" /> Séries
                                    </h3>
                                    {seriesUpdates.length > 0 && (
                                      <button 
                                        type="button" 
                                        onClick={async () => {
                                          if (window.confirm('Excluir TODAS as séries da lista?')) {
                                            await supabase.from('series_updates').delete().not('id', 'is', null);
                                          }
                                        }}
                                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-400/10 px-2 py-1 rounded border border-red-400/20 transition-colors"
                                      >
                                        <Trash2 size={12} /> Limpar Todas
                                      </button>
                                    )}
                                  </div>
                                  <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (newSeriesTitle.trim()) {
                                      const titles = newSeriesTitle
                                        .split('\n')
                                        .map(t => t.replace(/^[>\-🍿\*]\s*(Atualização de.*)?/i, '').replace(/^[>\-]\s*/, '').trim())
                                        .filter(t => t && !t.toLowerCase().includes('atualização de'));

                                      if (titles.length > 0) {
                                        await supabase.from('series_updates').insert(titles.map(t => ({ title: t })));
                                        setNewSeriesTitle('');
                                      }
                                    }
                                  }} className="flex flex-col gap-2">
                                    <textarea
                                      value={newSeriesTitle} onChange={(e) => setNewSeriesTitle(e.target.value)}
                                      placeholder="Ex:&#10;> Série 1&#10;> Série 2"
                                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-3 py-2 rounded-xl text-sm outline-none focus:border-purple-500 resize-y"
                                      rows={3}
                                    />
                                    <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold transition-colors">Adicionar Séries</button>
                                  </form>
                                  <div className="max-h-48 overflow-y-auto space-y-2 mt-4 pr-2">
                                    {seriesUpdates.map(s => (
                                      <div key={s.id} className="flex items-center gap-2 bg-[#0c0e12] border border-slate-800 p-2 rounded-lg">
                                        <span className="flex-1 text-slate-300 text-sm truncate">{s.title}</span>
                                        <button type="button" onClick={async () => {
                                            const newTitle = window.prompt("Editar título da série:", s.title);
                                            if (newTitle && newTitle !== s.title) {
                                                await supabase.from('series_updates').update({ title: newTitle }).eq('id', s.id);
                                            }
                                        }} className="text-slate-500 hover:text-purple-400 p-1.5 transition-colors"><Pencil size={14}/></button>
                                        <button type="button" onClick={async () => {
                                            if (window.confirm('Tem certeza que deseja excluir?')) {
                                              await supabase.from('series_updates').delete().eq('id', s.id);
                                            }
                                        }} className="text-slate-500 hover:text-red-400 p-1.5 transition-colors"><Trash2 size={14}/></button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Accordion: Pedidos de Conteúdos */}
                   <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${adminTab === 'pedidos' ? 'bg-white/5 border-indigo-500/30' : 'bg-[#0c0e12] border-slate-800'}`}>
                     <button 
                       onClick={() => {
                         if (adminTab !== 'pedidos') {
                           setLastSeenRequestsCount(contentRequests.length);
                           localStorage.setItem('admin_last_seen_requests', contentRequests.length.toString());
                           setNewRequestsCount(0);
                           setAdminTab('pedidos');
                         } else {
                           setAdminTab(null);
                         }
                       }}
                       className="w-full flex items-center justify-between p-5 text-left transition-colors"
                     >
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl transition-all duration-300 ${adminTab === 'pedidos' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'}`}>
                           <Clapperboard size={20} />
                         </div>
                         <div>
                           <span className="text-white font-bold flex items-center gap-2">
                             Pedidos
                             {contentRequests.length > 0 && (
                               <span className="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-indigo-500/20">
                                 {contentRequests.length}
                               </span>
                             )}
                           </span>
                           <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Solicitações de filmes e séries</span>
                         </div>
                       </div>
                       <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${adminTab === 'pedidos' ? 'rotate-180 text-indigo-400' : ''}`} />
                     </button>
                     <AnimatePresence initial={false}>
                       {adminTab === 'pedidos' && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden"
                         >
                           <div className="p-5 pt-0 space-y-4">
                             {contentRequests.length > 0 ? (
                               <div className="space-y-3">
                                 {contentRequests.map((req) => {
                                   const reqClient = clients.find(c => c.code === req.client_code);
                                   return (
                                     <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4">
                                       {req.poster_url ? (
                                         <img src={req.poster_url} alt="Poster" className="w-16 h-24 object-cover rounded-md flex-shrink-0 shadow-lg" />
                                       ) : (
                                         <div className="w-16 h-24 bg-slate-800 rounded-md flex items-center justify-center flex-shrink-0">
                                           {req.type === 'Filme' ? <MovieIcon size={24} className="text-slate-600"/> : <SeriesIcon size={24} className="text-slate-600"/>}
                                         </div>
                                       )}
                                       <div className="flex-1 min-w-0">
                                         <div className="flex justify-between items-start">
                                           <div>
                                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${req.type === 'Filme' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                               {req.type}
                                             </span>
                                             <h4 className="text-white font-bold mt-1 text-sm">{req.title}</h4>
                                             {(req.season || req.episode) && (
                                               <p className="text-slate-400 text-xs mt-1">
                                                 {req.season && `Temp: ${req.season} `} 
                                                 {req.episode && `Ep: ${req.episode}`}
                                               </p>
                                             )}
                                           </div>
                                           <div className="text-right">
                                             <div className="text-xs text-slate-500">Solicitado por:</div>
                                             <div className="text-sm font-medium text-white">{reqClient?.name || req.client_code}</div>
                                             {reqClient?.canvasLink && (
                                               <a href={reqClient.canvasLink} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 underline block mt-1">
                                                 Ver Canvas
                                               </a>
                                             )}
                                           </div>
                                         </div>
                                         <div className="mt-3 text-xs text-slate-500 flex justify-between items-center">
                                           <span>{new Date(req.created_at).toLocaleString()}</span>
                                           <div className="flex items-center gap-1">
                                             <a
                                               href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                                 `🎬 *PEDIDO DE CONTEÚDO - THE BEST IPTV*\n\nServidor: *CENTRAL*\n\n📌 ${req.type}: ${req.title}\n📌 Ano do conteúdo: ${req.year || ''}${req.type !== 'Filme' ? `\n📌 Temporada/Episódio: ${req.season || '-'}x${req.episode || '-'}` : ''}\n\nSolicito a adição deste conteúdo ao catálogo.\n\nObrigado! 🚀`
                                               )}`}
                                               target="_blank"
                                               rel="noopener noreferrer"
                                               className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1 rounded-md hover:bg-emerald-500/10 transition-colors flex items-center"
                                             >
                                               <MessageCircle size={14} className="inline mr-1" /> Enviar
                                             </a>
                                             <button
                                               type="button"
                                               onClick={async () => {
                                                 if (window.confirm('Marcar como atendido/remover?')) {
                                                   await supabase.from('content_requests').delete().eq('id', req.id);
                                                 }
                                               }}
                                               className="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors"
                                             >
                                               <Trash2 size={14} className="inline mr-1" /> Remover
                                             </button>
                                           </div>
                                         </div>
                                       </div>
                                     </div>
                                   );
                                 })}
                               </div>
                             ) : (
                               <div className="text-center py-6 border border-dashed border-slate-700/50 rounded-xl">
                                 <Clapperboard className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                                 <p className="text-slate-400 text-sm">Nenhum pedido no momento.</p>
                               </div>
                             )}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                   {/* Accordion: Suporte */}
                   <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${adminTab === 'suporte' ? 'bg-white/5 border-red-500/30' : 'bg-[#0c0e12] border-slate-800'}`}>
                     <button 
                       onClick={() => {
                         if (adminTab !== 'suporte') {
                           setLastSeenReportsCount(userReports.length);
                           localStorage.setItem('admin_last_seen_reports', userReports.length.toString());
                           setNewReportsCount(0);
                           setAdminTab('suporte');
                         } else {
                           setAdminTab(null);
                         }
                       }}
                       className="w-full flex items-center justify-between p-5 text-left transition-colors"
                     >
                       <div className="flex items-center gap-3">
                         <div className={`p-2 rounded-xl transition-all duration-300 ${adminTab === 'suporte' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-800 text-slate-400'}`}>
                           <AlertTriangle size={20} />
                         </div>
                         <div>
                           <span className="text-white font-bold flex items-center gap-2">
                             🛠️ Suporte
                             {newReportsCount > 0 && (
                               <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                                 {newReportsCount} novo{newReportsCount > 1 ? 's' : ''}
                               </span>
                             )}
                             {userReports.length > 0 && (
                               <span className="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded-full">
                                 {userReports.length}
                               </span>
                             )}
                           </span>
                           <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold">Problemas reportados pelos clientes</span>
                         </div>
                       </div>
                       <ChevronDown size={20} className={`text-slate-500 transition-transform duration-300 ${adminTab === 'suporte' ? 'rotate-180 text-red-400' : ''}`} />
                     </button>
                     <AnimatePresence initial={false}>
                       {adminTab === 'suporte' && (
                         <motion.div
                           initial={{ height: 0, opacity: 0 }}
                           animate={{ height: 'auto', opacity: 1 }}
                           exit={{ height: 0, opacity: 0 }}
                           transition={{ duration: 0.3, ease: 'easeInOut' }}
                           className="overflow-hidden"
                         >
                           <div className="p-5 pt-0 space-y-4">
                             {userReports.length > 0 ? (
                               <div className="space-y-3">
                                 {userReports.map((report) => {
                                   const reportClient = clients.find(c => c.code === report.client_code) || null;
                                   return (
                                     <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden group hover:border-slate-700 transition-all">
                                       <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                                         <div className="flex items-center gap-2 flex-wrap">
                                           <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                                             report.type === 'Canal' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                             report.type === 'Filme' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                             'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                           }`}>
                                             {report.type}
                                           </span>
                                           <span className="text-white font-bold text-sm">{report.name}</span>
                                         </div>
                                         <div className="text-right shrink-0">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Reportado por:</div>
                                            <div className="text-sm font-bold text-white">{reportClient?.name || report.client_code || 'Desconhecido'}</div>
                                            <div className="text-[10px] text-slate-600 font-mono mt-1">
                                              {new Date(report.timestamp).toLocaleString('pt-BR')}
                                            </div>
                                         </div>
                                       </div>

                                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                         <div className="space-y-1">
                                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Problema</p>
                                           <p className="text-sm text-slate-300 flex items-center gap-2">
                                             <AlertTriangle size={14} className="text-amber-500" /> {report.issue}
                                           </p>
                                         </div>
                                         <div className="space-y-1">
                                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Dispositivo</p>
                                           <p className="text-sm text-slate-300 flex items-center gap-2">
                                             <Tv size={14} className="text-indigo-400" /> {report.device}
                                           </p>
                                         </div>
                                       </div>

                                       {report.description && (
                                         <div className="pt-2 border-t border-slate-800/50 mb-3">
                                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Descrição</p>
                                           <p className="text-sm text-slate-400 leading-relaxed italic">"{report.description}"</p>
                                         </div>
                                       )}

                                       <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-800/50">
                                         <button
                                           type="button"
                                           onClick={async () => {
                                             if (window.confirm('Marcar como resolvido/remover este reporte?')) {
                                               await supabase.from('user_reports').delete().eq('id', report.id);
                                             }
                                           }}
                                           className="text-red-400 hover:text-red-300 font-bold px-2 py-1 rounded-md hover:bg-red-500/10 transition-colors text-xs flex items-center gap-1"
                                         >
                                           <Trash2 size={14} /> Remover
                                         </button>
                                       </div>

                                       <div className="absolute top-0 left-0 w-1 h-full bg-red-600/20 group-hover:bg-red-600 transition-all" />
                                     </div>
                                   );
                                 })}
                               </div>
                             ) : (
                               <div className="text-center py-6 border border-dashed border-slate-700/50 rounded-xl">
                                 <AlertTriangle className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
                                 <p className="text-slate-400 text-sm">Nenhum problema reportado no momento. 🎉</p>
                               </div>
                             )}
                           </div>
                         </motion.div>
                       )}
                     </AnimatePresence>
                   </div>

                 </div>

                 <button 
                    type="button"
                    onClick={() => {
                      setIsAdminLogged(false);
                      setShowLoginModal(false);
                    }}
                    className="w-full pt-4 border-t border-slate-800 text-slate-400 hover:text-white font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} /> Sair do Painel Admin
                </button>
               </div>
            ) : (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4">
                      <User size={32} className="text-indigo-400" />
                    </div>
                  </div>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Login Admin</h2>
                    <p className="text-slate-400 text-sm mt-1">Acesso exclusivo para administradores</p>
                  </div>
                  
                  {loginError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                      {loginError}
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block">E-mail</label>
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-[#0c0e12] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 rounded-xl text-sm outline-none transition-all"
                      placeholder="admin@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2 text-left">
                    <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Senha</label>
                    <div className="relative">
                      <input 
                        type={showAdminPassword ? "text" : "password"} 
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full bg-[#0c0e12] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 rounded-xl text-sm outline-none transition-all pr-12"
                        placeholder="••••••••"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Entrar <ChevronRight size={18} />
                  </button>
                </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderRequestModal = () => (
    <AnimatePresence>
      {showRequestModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60]"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="absolute inset-0 bg-[#0d0f18] flex flex-col overflow-hidden"
          >
            {/* Header full-screen */}
            <div className="flex items-center gap-4 px-4 py-4 border-b border-white/5 bg-slate-900/80 backdrop-blur-sm shrink-0">
              <button 
                onClick={() => setShowRequestModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
              >
                <ChevronRight className="rotate-180" size={22} />
              </button>
              <div className="flex items-center gap-2">
                <PlusCircle className="text-indigo-400" size={20} />
                <h3 className="text-lg font-bold text-white">Pedir Conteúdo</h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-lg mx-auto px-4 py-6">
              <form onSubmit={handleSubmitContentRequest} className="space-y-6">
                {/* Tipo de Conteúdo */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRequestType('movie')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      requestType === 'movie' 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' 
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <MovieIcon size={18} /> Filme
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('tv')}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      requestType === 'tv' 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50' 
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800'
                    }`}
                  >
                    <SeriesIcon size={18} /> Série
                  </button>
                </div>

                {/* Campo de Busca TMDB */}
                <div className="space-y-2 relative">
                  <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">
                    Nome do {requestType === 'movie' ? 'Filme' : 'Série'}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedTMDB(null); // Reset selection se o usuário voltar a digitar
                      }}
                      placeholder={`Digite para pesquisar o ${requestType === 'movie' ? 'filme' : 'série'}...`}
                      className="w-full bg-[#15181e] border border-slate-700 text-slate-50 pl-10 pr-4 py-3 rounded-xl focus:border-indigo-500 outline-none"
                      required
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" size={18} />
                    )}
                  </div>

                  {/* Autocomplete Dropdown */}
                  {searchResults.length > 0 && !selectedTMDB && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setSelectedTMDB(result);
                            setSearchQuery(result.title || result.name || '');
                            setSearchResults([]);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-700/50 transition-colors flex items-center gap-3 border-b border-slate-700/50 last:border-0"
                        >
                          {result.poster_path ? (
                            <img src={`https://image.tmdb.org/t/p/w92${result.poster_path}`} alt="Poster" className="w-10 h-14 object-cover rounded-md" />
                          ) : (
                            <div className="w-10 h-14 bg-slate-900 rounded-md flex items-center justify-center">
                              <Search className="text-slate-600" size={16} />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-sm">{result.title || result.name}</p>
                            <p className="text-xs text-slate-400">
                              {result.release_date ? result.release_date.split('-')[0] : result.first_air_date ? result.first_air_date.split('-')[0] : 'Data desconhecida'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Informações Extras para Séries */}
                {requestType === 'tv' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">Temporada (Opcional)</label>
                      <input 
                        type="text"
                        value={requestSeason}
                        onChange={(e) => setRequestSeason(e.target.value)}
                        placeholder="Ex: 1, 2, Todas"
                        className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-4 py-3 rounded-xl focus:border-indigo-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-bold">Episódio (Opcional)</label>
                      <input 
                        type="text"
                        value={requestEpisode}
                        onChange={(e) => setRequestEpisode(e.target.value)}
                        placeholder="Ex: 5, Todos"
                        className="w-full bg-[#15181e] border border-slate-700 text-slate-50 px-4 py-3 rounded-xl focus:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingRequest || (!selectedTMDB && searchQuery.trim() === '')}
                  className="w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                >
                  {isSubmittingRequest ? (
                    <><Loader2 className="animate-spin" size={20} /> Enviando Pedido...</>
                  ) : (
                    <><CheckCircle2 size={20} /> Solicitar Conteúdo</>
                  )}
                </button>
              </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderClientEditModal = () => {
    if (!editingClient) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setEditingClient(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0c0e12] border border-slate-700 w-full max-w-lg rounded-2xl p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingClient(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Informações do Cliente</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSaveClient(editingClient);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Código de Acesso</label>
                <input
                  type="text"
                  required
                  value={editingClient.code}
                  onChange={(e) => setEditingClient({ ...editingClient, code: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editingClient.email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  placeholder="cliente@email.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={editingClient.phone || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Link do Canva</label>
                <input
                  type="url"
                  required
                  value={editingClient.canvasLink}
                  onChange={(e) => setEditingClient({ ...editingClient, canvasLink: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center"
              >
                Salvar Alterações
              </button>
            </form>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderQuotaModal = () => (
    <AnimatePresence>
      {quotaAlert && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setQuotaAlert(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {quotaAlert === 'warning' ? (
              <div className="p-6">
                <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-4">Aviso Importante - The Best IPTV</h2>
                <div className="space-y-4 text-sm text-slate-300 text-center">
                  <p>Você possui apenas <strong className="text-white">1 solicitação de conteúdo restante</strong> nesta semana.</p>
                  <p>🎬 Aproveite para escolher o filme ou série que deseja adicionar ao catálogo.</p>
                  <p>Após utilizar esta solicitação, será necessário aguardar a liberação de novos pedidos na próxima semana.</p>
                  <p className="font-bold text-amber-400">Obrigado por utilizar a The Best IPTV! 🚀</p>
                </div>
                <button
                  onClick={() => setQuotaAlert(null)}
                  className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Entendi
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-white text-center mb-4">Limite de Solicitações Atingido</h2>
                <div className="space-y-4 text-sm text-slate-300 text-center">
                  <p>Você já utilizou suas <strong className="text-white">2 solicitações de conteúdo</strong> desta semana.</p>
                  <p>🗓️ Aguarde <strong className="text-white">7 dias</strong> para realizar novos pedidos de filmes ou séries.</p>
                  <p className="font-bold text-red-400">Obrigado pela compreensão! 🍿🚀</p>
                </div>
                <button
                  onClick={() => setQuotaAlert(null)}
                  className="mt-8 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderForgotCodeModal = () => (
    <AnimatePresence>
      {showForgotCodeModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowForgotCodeModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#0c0e12] border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <button 
              onClick={() => setShowForgotCodeModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="p-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                  <Lock className="text-indigo-400 w-8 h-8" />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold text-center text-white mb-2">Recuperar Código</h2>
              <p className="text-slate-400 text-center text-sm mb-8">
                Digite o seu número de Telefone ou WhatsApp para enviarmos um novo código de acesso por SMS.
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={forgotCodePhone}
                    onChange={(e) => setForgotCodePhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white px-4 py-3.5 rounded-xl outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-center text-lg"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <button
                  onClick={handleRecoverCode}
                  disabled={isRecoveringCode}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRecoveringCode ? 'Enviando SMS...' : 'Enviar por SMS'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderCodeModal = () => (
    <AnimatePresence>
      {showCodeModal && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#15181e] border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl relative my-auto"
          >
            {(
              <button 
                onClick={() => setShowCodeModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4">
                <Key size={32} className="text-indigo-400" />
              </div>
            </div>
            
            <form onSubmit={handleAccessWithCode} className="space-y-4">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Área do Cliente</h2>
                <p className="text-slate-400 text-sm mt-1">Insira seu código de acesso</p>
              </div>
              
              {accessCodeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                  {accessCodeError}
                </div>
              )}

              <div className="space-y-2 text-left">
                <label className="text-xs uppercase tracking-wider text-slate-500 font-bold block">Seu Código</label>
                <div className="relative">
                  <input 
                    type={showClientCode ? "text" : "password"} 
                    required
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="w-full bg-[#0c0e12] border border-slate-800 text-slate-50 placeholder-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-4 py-3 rounded-xl text-sm outline-none transition-all uppercase pr-12"
                    placeholder="Ex: SEUCODIGO123"
                    autoComplete="off"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowClientCode(!showClientCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showClientCode ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full mt-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                Acessar Painel <ChevronRight size={18} />
              </button>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowCodeModal(false);
                    setShowForgotCodeModal(true);
                  }}
                  className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Esqueci meu código
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-800/50 space-y-4">
              <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
                <span className="bg-[#15181e] px-3 text-slate-600 font-bold">Acesso Restrito</span>
              </div>
              
              <button 
                onClick={() => {
                  setShowCodeModal(false);
                  setShowLoginModal(true);
                }}
                className="w-full py-3 bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border border-slate-700/30 group"
              >
                <Shield size={14} className="group-hover:text-indigo-400 transition-colors" /> 
                Acesso Administrativo
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  const getMoviesText = () => `🍿 Atualização de *FILMES*\n\n` + movieUpdates.map(m => `> ${m.title}`).join('\n');
  const getSeriesText = () => `🍿 Atualização de *SÉRIES*\n\n` + seriesUpdates.map(s => `> ${s.title}`).join('\n');
  const getAllText = () => getMoviesText() + '\n\n' + getSeriesText();

  const renderUpdatesModal = () => (
    <AnimatePresence>
      {showUpdatesModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpdatesModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-[#fcfbf9] border border-slate-200 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl relative my-auto mx-auto max-h-[90vh] overflow-y-auto"
          >
            <button 
              onClick={() => setShowUpdatesModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Atualizações de Conteúdo</h2>
              <p className="text-slate-500 text-sm mt-1">Novidades mais recentes do catálogo</p>
            </div>
            
            <div className="space-y-6">
              {/* FILMES */}
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-amber-600 flex items-center gap-2">
                    <Film size={18} /> FILMES
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                        navigator.clipboard.writeText(getMoviesText());
                        alert('Copiado para a área de transferência!');
                      }} 
                      className="px-3 py-1.5 bg-slate-200/50 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-300/50">
                      <Copy size={14} /> Copiar
                    </button>
                    <button onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(getMoviesText())}`, '_blank');
                      }} 
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  {movieUpdates.length > 0 ? movieUpdates.map((item) => (
                    <div key={item.id} className="bg-white border border-amber-100 p-3 rounded-lg text-slate-700 text-sm shadow-sm">{item.title}</div>
                  )) : (
                    <div className="text-amber-600/70 text-sm italic">Nenhum filme novo no momento.</div>
                  )}
                </div>
              </div>

              {/* SÉRIES */}
              <div className="bg-purple-50/50 border border-purple-200/50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-purple-600 flex items-center gap-2 uppercase">
                    <Tv size={18} /> SÉRIES
                  </h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                        navigator.clipboard.writeText(getSeriesText());
                        alert('Copiado para a área de transferência!');
                      }} 
                      className="px-3 py-1.5 bg-slate-200/50 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-slate-300/50">
                      <Copy size={14} /> Copiar
                    </button>
                    <button onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(getSeriesText())}`, '_blank');
                      }} 
                      className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </div>
                </div>
                <div className="space-y-2 text-left">
                  {seriesUpdates.length > 0 ? seriesUpdates.map((item) => (
                    <div key={item.id} className="bg-white border border-purple-100 p-3 rounded-lg text-slate-700 text-sm shadow-sm">{item.title}</div>
                  )) : (
                    <div className="text-purple-600/70 text-sm italic">Nenhuma série nova no momento.</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-slate-400 mt-4 border-t border-slate-200 pt-4">
                <span className="flex-1">Copiar ou enviar via WhatsApp</span>
                <button onClick={() => {
                   navigator.clipboard.writeText(getAllText());
                   alert('Copiado para a área de transferência!');
                }} className="px-3 py-1.5 bg-slate-200/50 hover:bg-slate-200 text-slate-600 rounded-lg font-medium flex items-center gap-2 transition-colors border border-slate-300/50">
                  <Copy size={14} /> Copiar
                </button>
                <button onClick={() => {
                   window.open(`https://wa.me/?text=${encodeURIComponent(getAllText())}`, '_blank');
                }} className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-lg font-medium flex items-center gap-2 transition-colors">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  return (
    <div className="flex h-[100dvh] w-full text-[#e2e8f0] font-sans overflow-hidden relative">
      {/* Background Image & Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
        style={{ backgroundImage: `url('${BACKGROUNDS[bgIndex]}')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#090b0e]/70 via-[#151828]/60 to-[#040507]/90 backdrop-blur-md" />

      {/* Sidebar - Hidden on mobile, visible on md+ screens */}
      <aside className="hidden md:flex w-64 border-r border-slate-800/50 bg-[#0c0e12]/80 backdrop-blur-xl flex-col p-6 relative z-10">
        <div className="flex flex-col items-center justify-center mb-10 mt-2">
           <div className="mb-4 flex items-center justify-center drop-shadow-lg">
             <img src="/logo.png?v=2" alt="The Best IPTV Streaming" className="w-32 h-32 object-contain" />
           </div>
           <span className="text-base font-bold tracking-wider text-slate-300 uppercase shrink-0">Suporte Técnico</span>
        </div>
        
        <div className="mt-auto p-4 bg-[#1a1d24]/80 backdrop-blur-md border border-white/5 rounded-2xl">
          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Status do Servidor</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm font-semibold text-emerald-500">Operacional</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 pb-24 md:pb-8 overflow-hidden relative">
        <header className="flex justify-between items-start md:items-center mb-6 shrink-0 pt-2 md:pt-0">
          <div className="flex items-center gap-3 md:gap-4">
             <div className="md:hidden flex items-center justify-center drop-shadow-md mr-1">
               <img src="/logo.png?v=2" alt="Logo" className="w-12 h-12 object-contain" />
             </div>
             <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">Reportar<br className="md:hidden" />Problema Técnico</h1>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full md:w-auto mt-2 md:mt-0">
            <div className="flex items-center gap-2 md:gap-3 text-sm text-slate-400 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowUpdatesModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-emerald-300 hover:text-emerald-200 font-bold transition-all h-9"
              >
                <Clapperboard size={15} />
                <span className="hidden sm:inline">Atualizações</span>
              </button>
              <button
                id="tour-access-code"
                type="button"
                onClick={() => {
                  if (loggedClientCode || isAdminLogged) {
                    setActiveView(activeView === 'profile' ? 'dashboard' : 'profile');
                  } else {
                    setShowCodeModal(true);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 rounded-lg text-indigo-300 hover:text-indigo-200 font-bold transition-all h-9"
              >
                {(loggedClientCode || isAdminLogged) ? (
                  activeView === 'profile' ? <LayoutDashboard size={14} /> : <User size={14} />
                ) : (
                  <Key size={14} />
                )}
                <span className="hidden sm:inline">
                  {(loggedClientCode || isAdminLogged)
                    ? (activeView === 'profile' ? 'Início' : 'Meu Perfil')
                    : 'Acessar com meu código'}
                </span>
                <span className="sm:hidden">
                  {(loggedClientCode || isAdminLogged)
                    ? (activeView === 'profile' ? 'Início' : 'Perfil')
                    : 'Código'}
                </span>
              </button>
              <button 
                onClick={() => setShowLoginModal(true)}
                className="w-9 h-9 shrink-0 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 transition-colors relative"
              >
                 <User size={16} className={isAdminLogged ? "text-indigo-400" : "text-slate-400"} />
                 {(isAdminLogged && (newRequestsCount > 0 || newReportsCount > 0)) && (
                   <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-[#0d0f18] animate-pulse"></span>
                 )}
              </button>
            </div>
            
            {/* Teste Grátis (Desktop e Mobile) */}
            {activeView === 'dashboard' && !trialState && !contentType && (
              <div className="block w-full max-w-[420px] min-w-[200px]">
                <button
                  onClick={() => setTrialState('devices')}
                  className="w-full relative overflow-hidden group rounded-2xl p-0.5 transition-all duration-300 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 shadow-xl shadow-teal-500/20 hover:shadow-teal-500/40"
                >
                  <div className="absolute inset-0 bg-white/20 group-hover:bg-white/0 transition-colors duration-300" />
                  <div className="relative bg-slate-900/90 group-hover:bg-transparent backdrop-blur-sm px-3 md:px-6 py-3 md:py-4 rounded-[14px] flex items-center justify-between transition-colors duration-300">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="p-2 md:p-2.5 rounded-xl transition-transform bg-white/10 group-hover:scale-110">
                        <Gift className="text-white w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-[12px] md:text-[15px] tracking-wide text-white leading-tight">
                          Fazer um teste grátis de 3h
                        </h3>
                        <p className="text-[10px] md:text-xs font-medium text-white/70">
                          Selecione seu dispositivo
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all ml-1" />
                  </div>
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 flex flex-col min-h-0 bg-white/5 backdrop-blur-lg border border-white/10 rounded-3xl p-4 sm:p-6 md:p-8 overflow-hidden relative shadow-2xl shadow-black/50">
          <AnimatePresence mode="wait">
            {activeView === 'dashboard' ? (
              <div key="dashboard" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {renderDashboard()}
              </div>
            ) : activeView === 'history' ? (
              <div key="history" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {renderHistoryView()}
              </div>
            ) : (
              <div key="profile" className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {renderProfileView()}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
      {renderClientEditModal()}
      {renderQuotaModal()}
      {renderForgotCodeModal()}
      {renderCodeModal()}
      {renderRequestModal()}
      {renderUpdatesModal()}
      {renderLoginModal()}

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-[101]"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImage(null);
              }}
            >
              <X size={24} />
            </button>
            <img 
              src={selectedImage} 
              alt="Ampliada" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] cursor-zoom-out" 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
