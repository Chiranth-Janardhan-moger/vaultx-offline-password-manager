type ServiceConfig = {
  name: string;
  icon: string;
  color: string;
};

const COMMON_SERVICES: Record<string, ServiceConfig> = {
  // Major Tech & Social
  google: { name: 'Google', icon: 'logo-google', color: '#4285F4' },
  gmail: { name: 'Gmail', icon: 'mail-outline', color: '#EA4335' },
  github: { name: 'GitHub', icon: 'logo-github', color: '#24292E' },
  gitlab: { name: 'GitLab', icon: 'git-branch', color: '#FC6D26' },
  bitbucket: { name: 'Bitbucket', icon: 'git-branch', color: '#0052CC' },
  facebook: { name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  fb: { name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
  instagram: { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  insta: { name: 'Instagram', icon: 'logo-instagram', color: '#E4405F' },
  twitter: { name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  'x.com': { name: 'Twitter', icon: 'logo-twitter', color: '#1DA1F2' },
  linkedin: { name: 'LinkedIn', icon: 'logo-linkedin', color: '#0A66C2' },
  youtube: { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  yt: { name: 'YouTube', icon: 'logo-youtube', color: '#FF0000' },
  whatsapp: { name: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366' },
  telegram: { name: 'Telegram', icon: 'paper-plane-outline', color: '#0088CC' },
  discord: { name: 'Discord', icon: 'logo-discord', color: '#5865F2' },
  slack: { name: 'Slack', icon: 'logo-slack', color: '#4A154B' },
  reddit: { name: 'Reddit', icon: 'logo-reddit', color: '#FF4500' },
  amazon: { name: 'Amazon', icon: 'logo-amazon', color: '#FF9900' },
  amaxon: { name: 'Amazon', icon: 'logo-amazon', color: '#FF9900' },
  aws: { name: 'AWS', icon: 'cloud-outline', color: '#FF9900' },
  apple: { name: 'Apple', icon: 'logo-apple', color: '#555555' },
  microsoft: { name: 'Microsoft', icon: 'logo-windows', color: '#00A4EF' },
  netflix: { name: 'Netflix', icon: 'tv-outline', color: '#E50914' },
  spotify: { name: 'Spotify', icon: 'musical-notes-outline', color: '#1DB954' },
  paypal: { name: 'PayPal', icon: 'wallet-outline', color: '#00457C' },
  stripe: { name: 'Stripe', icon: 'card-outline', color: '#635BFF' },

  // Enterprise & Business Software
  oracle: { name: 'Oracle', icon: 'server-outline', color: '#F80000' },
  sap: { name: 'SAP', icon: 'business-outline', color: '#008FD3' },
  'ge healthcare': { name: 'GE Healthcare', icon: 'medical-outline', color: '#005EB8' },
  'ge health care': { name: 'GE Healthcare', icon: 'medical-outline', color: '#005EB8' },
  ge: { name: 'GE', icon: 'business-outline', color: '#005EB8' },
  zoho: { name: 'Zoho', icon: 'grid-outline', color: '#E42528' },
  jira: { name: 'Jira', icon: 'checkbox-outline', color: '#0052CC' },
  confluence: { name: 'Confluence', icon: 'document-text-outline', color: '#172B4D' },
  figma: { name: 'Figma', icon: 'brush-outline', color: '#F24E1E' },
  notion: { name: 'Notion', icon: 'document-text-outline', color: '#000000' },
  linear: { name: 'Linear', icon: 'radio-button-on-outline', color: '#5E6AD2' },
  postman: { name: 'Postman', icon: 'paper-plane-outline', color: '#FF6C37' },
  sentry: { name: 'Sentry', icon: 'alert-circle-outline', color: '#362D59' },
  datadog: { name: 'Datadog', icon: 'analytics-outline', color: '#632CA6' },

  // Cloud, Database & Developer Infrastructure
  supabase: { name: 'Supabase', icon: 'flash-outline', color: '#3ECF8E' },
  superbase: { name: 'Supabase', icon: 'flash-outline', color: '#3ECF8E' },
  cloudflare: { name: 'Cloudflare', icon: 'cloud-outline', color: '#F38020' },
  docker: { name: 'Docker', icon: 'cube-outline', color: '#2496ED' },
  vercel: { name: 'Vercel', icon: 'triangle-outline', color: '#000000' },
  netlify: { name: 'Netlify', icon: 'globe-outline', color: '#00C7B7' },
  digitalocean: { name: 'DigitalOcean', icon: 'water-outline', color: '#0080FF' },
  heroku: { name: 'Heroku', icon: 'terminal-outline', color: '#430098' },
  mongodb: { name: 'MongoDB', icon: 'leaf-outline', color: '#47A248' },
  mongo: { name: 'MongoDB', icon: 'leaf-outline', color: '#47A248' },
  redis: { name: 'Redis', icon: 'layers-outline', color: '#DC382D' },
  postgresql: { name: 'PostgreSQL', icon: 'server-outline', color: '#336791' },
  postgres: { name: 'PostgreSQL', icon: 'server-outline', color: '#336791' },
  mysql: { name: 'MySQL', icon: 'server-outline', color: '#4479A1' },
  npm: { name: 'npm', icon: 'cube-outline', color: '#CB3837' },
  stackoverflow: { name: 'Stack Overflow', icon: 'help-circle-outline', color: '#F48024' },
  openai: { name: 'OpenAI', icon: 'sparkles-outline', color: '#10A37F' },
  chatgpt: { name: 'ChatGPT', icon: 'sparkles-outline', color: '#10A37F' },
  claude: { name: 'Claude', icon: 'sparkles-outline', color: '#D97706' },
  anthropic: { name: 'Anthropic', icon: 'sparkles-outline', color: '#D97706' },
  huggingface: { name: 'Hugging Face', icon: 'happy-outline', color: '#FFD21E' },

  // Transit, Travel & Utilities
  irctc: { name: 'IRCTC', icon: 'train-outline', color: '#FF6600' },
  irtc: { name: 'IRCTC', icon: 'train-outline', color: '#FF6600' },
  railone: { name: 'RailOne', icon: 'train-outline', color: '#005691' },
  'rail one': { name: 'RailOne', icon: 'train-outline', color: '#005691' },
  'indian oil': { name: 'Indian Oil', icon: 'flame-outline', color: '#F37021' },
  indianoil: { name: 'Indian Oil', icon: 'flame-outline', color: '#F37021' },
  iocl: { name: 'Indian Oil', icon: 'flame-outline', color: '#F37021' },
  lic: { name: 'LIC', icon: 'shield-checkmark-outline', color: '#003366' },

  // Banking & Indian Payment Services
  sbi: { name: 'SBI', icon: 'card-outline', color: '#280071' },
  hdfc: { name: 'HDFC Bank', icon: 'card-outline', color: '#004C8F' },
  icici: { name: 'ICICI Bank', icon: 'card-outline', color: '#F37023' },
  axis: { name: 'Axis Bank', icon: 'card-outline', color: '#97144D' },
  kotak: { name: 'Kotak Bank', icon: 'card-outline', color: '#ED1C24' },
  paytm: { name: 'Paytm', icon: 'wallet-outline', color: '#002E6E' },
  phonepe: { name: 'PhonePe', icon: 'wallet-outline', color: '#5F259F' },
  gpay: { name: 'Google Pay', icon: 'card-outline', color: '#4285F4' },
  cred: { name: 'CRED', icon: 'card-outline', color: '#1A1A1A' },
  zerodha: { name: 'Zerodha', icon: 'trending-up-outline', color: '#387ED1' },
  groww: { name: 'Groww', icon: 'trending-up-outline', color: '#00D09C' },
  upstox: { name: 'Upstox', icon: 'trending-up-outline', color: '#6938EF' },

  // Indian Services & Delivery
  swiggy: { name: 'Swiggy', icon: 'fast-food-outline', color: '#FC8019' },
  zomato: { name: 'Zomato', icon: 'restaurant-outline', color: '#CB202D' },
  zepto: { name: 'Zepto', icon: 'cart-outline', color: '#6004C8' },
  blinkit: { name: 'Blinkit', icon: 'cart-outline', color: '#F8CB46' },
  flipkart: { name: 'Flipkart', icon: 'cart-outline', color: '#2874F0' },
  myntra: { name: 'Myntra', icon: 'bag-handle-outline', color: '#FF3F6C' },
  uber: { name: 'Uber', icon: 'car-outline', color: '#000000' },
  ola: { name: 'Ola', icon: 'car-outline', color: '#A4C639' },
  airtel: { name: 'Airtel', icon: 'cellular-outline', color: '#E40000' },
  jio: { name: 'Jio', icon: 'cellular-outline', color: '#0A3A82' },
  digilocker: { name: 'DigiLocker', icon: 'lock-closed-outline', color: '#0072BC' },

  // Streaming, Media & Gaming
  twitch: { name: 'Twitch', icon: 'logo-twitch', color: '#9146FF' },
  steam: { name: 'Steam', icon: 'logo-steam', color: '#171A21' },
  playstation: { name: 'PlayStation', icon: 'logo-playstation', color: '#003791' },
  xbox: { name: 'Xbox', icon: 'logo-xbox', color: '#107C10' },
  dropbox: { name: 'Dropbox', icon: 'logo-dropbox', color: '#0061FF' },
  adobe: { name: 'Adobe', icon: 'color-palette-outline', color: '#FF0000' },
  medium: { name: 'Medium', icon: 'newspaper-outline', color: '#000000' },
  zoom: { name: 'Zoom', icon: 'videocam-outline', color: '#2D8CFF' },
};

const PALETTE = ['#6366f1', '#3b82f6', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const normalizeServiceName = (serviceName: string): string => {
  const key = serviceName.toLowerCase().trim();
  if (COMMON_SERVICES[key]) return COMMON_SERVICES[key].name;
  for (const [k, v] of Object.entries(COMMON_SERVICES)) {
    if (k.length > 2 && key.includes(k)) return v.name;
  }
  return serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
};

export const getServiceIcon = (serviceName: string): string => {
  const key = serviceName.toLowerCase().trim();
  if (COMMON_SERVICES[key]) return COMMON_SERVICES[key].icon;
  for (const [k, v] of Object.entries(COMMON_SERVICES)) {
    if (k.length > 2 && key.includes(k)) return v.icon;
  }
  if (key.includes('bank') || key.includes('card') || key.includes('pay') || key.includes('wallet')) return 'card-outline';
  if (key.includes('mail')) return 'mail-outline';
  if (key.includes('chat') || key.includes('message')) return 'chatbubble-outline';
  if (key.includes('cloud')) return 'cloud-outline';
  if (key.includes('server') || key.includes('db') || key.includes('data')) return 'server-outline';
  if (key.includes('code') || key.includes('dev')) return 'code-slash-outline';
  if (key.includes('train') || key.includes('rail')) return 'train-outline';
  if (key.includes('oil') || key.includes('gas') || key.includes('petrol')) return 'flame-outline';
  if (key.includes('health') || key.includes('hospital') || key.includes('care') || key.includes('med')) return 'medical-outline';
  if (key.includes('insur')) return 'shield-checkmark-outline';
  return 'globe-outline';
};

export const getServiceColor = (serviceName: string, _isDarkTheme = false): string => {
  const key = serviceName.toLowerCase().trim();
  if (COMMON_SERVICES[key]) return COMMON_SERVICES[key].color;
  for (const [k, v] of Object.entries(COMMON_SERVICES)) {
    if (k.length > 2 && key.includes(k)) return v.color;
  }
  return PALETTE[hashString(key) % PALETTE.length];
};
