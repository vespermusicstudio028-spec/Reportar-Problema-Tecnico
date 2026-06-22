export interface TrialLink {
  id: string;
  url: string;
  label: string;
  style?: 'primary' | 'outline' | 'text' | 'wa';
}

export interface TrialContentBlock {
  title?: string;
  subtitle?: string;
  textBlocks?: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'none';
  links?: TrialLink[];
  whatsappText?: string;
  topAlert?: { type: 'info' | 'warning' | 'danger'; text: string };
  bottomAlert?: { type: 'info' | 'warning' | 'danger'; text: string };
  changelog?: { version: string; items: string[] };
  showMacInput?: boolean;
}

export interface TrialSubOption {
  id: string;
  name: string;
  content: TrialContentBlock;
}

export interface TrialDevice {
  id: string;
  name: string;
  icon?: string;
  type: 'content' | 'suboptions';
  content?: TrialContentBlock;
  subOptions?: TrialSubOption[];
}

export interface TrialConfig {
  devices: TrialDevice[];
}

export const defaultTrialConfig: TrialConfig = {
  devices: [
    {
      id: 'android-tv',
      name: 'TV Android (Play Store)',
      type: 'content',
      content: {
        title: 'TV ANDROID',
        subtitle: 'Baixe agora o aplicativo!',
        textBlocks: [
          'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
          'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
          'Se tiver alguma dúvida, entre em contato conosco!'
        ],
        topAlert: { type: 'info', text: 'Clique no link abaixo para assistir o vídeo de como fazer o download:' },
        links: [{ id: '1', url: 'https://abre.ai/newhybridtcl', label: 'https://abre.ai/newhybridtcl', style: 'primary' }]
      }
    },
    {
      id: 'smartv',
      name: 'Smart TV',
      type: 'suboptions',
      subOptions: [
        {
          id: 'lg',
          name: 'LG',
          content: {
            title: 'SMARTV LG',
            textBlocks: [
              'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
              'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
              'Se tiver alguma dúvida, entre em contato conosco!'
            ],
            topAlert: { type: 'info', text: 'Clique aqui no link abaixo:' },
            bottomAlert: { type: 'danger', text: '🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 ANUAL 🚨' },
            links: [{ id: 'lg1', url: 'https://abre.ai/lgvuplayer', label: 'abre.ai/lgvuplayer', style: 'primary' }]
          }
        },
        {
          id: 'samsung',
          name: 'SAMSUNG',
          content: {
            title: 'SMARTV SAMSUNG',
            textBlocks: [
              'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
              'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
              'Se tiver alguma dúvida, entre em contato conosco!'
            ],
            topAlert: { type: 'info', text: 'Clique aqui no link abaixo:' },
            bottomAlert: { type: 'danger', text: '🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 ANUAL 🚨' },
            links: [{ id: 'sam1', url: 'https://abre.ai/samsungvuplayer', label: 'abre.ai/samsungvuplayer', style: 'primary' }]
          }
        },
        {
          id: 'roku',
          name: 'ROKU',
          content: {
            title: 'SMARTV COM SISTEMA ROKU',
            textBlocks: [
              'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
              'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
              'Se tiver alguma dúvida, entre em contato conosco!'
            ],
            topAlert: { type: 'info', text: 'Clique aqui no link abaixo:' },
            bottomAlert: { type: 'danger', text: '🚨 ESSE APLICATIVO TEM UMA MANUTENÇÃO DE CUSTO NO VALOR DE R$19,00 ANUAL 🚨' },
            links: [{ id: 'roku1', url: 'https://abre.ai/rokuvuplayer', label: 'abre.ai/rokuvuplayer', style: 'primary' }]
          }
        },
        {
          id: 'outro',
          name: 'OUTRO MODELO',
          content: {
            title: 'OUTRO MODELO DE TV',
            textBlocks: [
              'Não é possível instalar o aplicativo diretamente em OUTRO modelo de TV.',
              'Mas não se preocupe! Você pode usar um dispositivo TV Box para acessar nossos conteúdos.'
            ],
            topAlert: { type: 'info', text: 'Clique no link abaixo para adquirir um de nossos dispositivos TV Box:' },
            links: [{ id: 'out1', url: 'https://abre.ai/comprarboxtbii', label: 'https://abre.ai/comprarboxtbii', style: 'primary' }]
          }
        }
      ]
    },
    {
      id: 'celular',
      name: 'Celular',
      type: 'content',
      content: {
        title: 'CELULAR 📳',
        subtitle: 'Baixe agora o nosso aplicativo!',
        textBlocks: [
          'Segurança garantida: Nosso aplicativo é seguro e confiável.'
        ],
        topAlert: { type: 'info', text: 'Faça o download agora:' },
        links: [{ id: 'cel1', url: 'https://abrela.me/newhybrid', label: 'abrela.me/newhybrid', style: 'primary' }],
        warningAlert: 'Cod downloader: 4466913',
        changelog: {
          version: '1.6.0',
          items: [
            'Corrigido atualização canais ao vivo na barra de programação',
            'Corrigido ao sair da tela cheia o canal parava para alguns dispositivos',
            'Corrigido o problema de encerramento forçado',
            'Aplicativo quando encerrado agora volta para mesmo canal assistido quando aberto novamente'
          ]
        }
      }
    },
    {
      id: 'tvbox',
      name: 'TV Box',
      type: 'content',
      content: {
        title: 'TV BOX',
        textBlocks: [
          'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
          'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
          'Se tiver alguma dúvida, entre em contato conosco!'
        ],
        topAlert: { type: 'info', text: 'Clique no link abaixo para assistir o vídeo de como fazer o download:' },
        links: [{ id: 'box1', url: 'https://abre.ai/newhybridtvbox', label: 'https://abre.ai/newhybridtvbox', style: 'primary' }]
      }
    },
    {
      id: 'computador',
      name: 'Computador',
      type: 'content',
      content: {
        title: 'COMPUTADOR 💻',
        textBlocks: [
          'Acesse nosso conteúdo diretamente do seu navegador!',
          'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!'
        ],
        topAlert: { type: 'info', text: 'Acesse o link abaixo:' },
        links: [{ id: 'comp1', url: 'https://abre.ai/assista-agoraweb', label: 'abre.ai/assista-agoraweb', style: 'primary' }]
      }
    },
    {
      id: 'mistick',
      name: 'Mi Stick Tv',
      type: 'content',
      content: {
        title: 'MI STICK TV',
        textBlocks: [
          'Baixe agora o aplicativo do nosso STREAMING e comece a desfrutar de uma experiência de TV mais completa e emocionante!',
          'Aproveite nossos recursos: Mais de [2.700] canais de TV ao vivo, filmes e séries em HD, programação esportiva ao vivo e muito mais!',
          'Se tiver alguma dúvida, entre em contato conosco!'
        ],
        topAlert: { type: 'info', text: 'Clique no link abaixo para assistir o vídeo de como fazer o download:' },
        links: [{ id: 'mi1', url: 'https://abre.ai/newhybridtvbox', label: 'https://abre.ai/newhybridtvbox', style: 'primary' }]
      }
    }
  ]
};
