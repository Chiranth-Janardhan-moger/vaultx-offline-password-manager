// Service icon mapping - uses Ionicons (already included, no APK size increase)

// Normalize service names to handle variations (e.g., "insta" and "instagram" are the same)
export const normalizeServiceName = (serviceName: string): string => {
  const service = serviceName.toLowerCase().trim();
  
  // Social Media normalizations
  if (service.includes('instagram') || service === 'insta' || service === 'ig') return 'Instagram';
  if (service.includes('facebook') || service === 'fb') return 'Facebook';
  if (service.includes('twitter') || service === 'x.com' || service === 'x') return 'Twitter';
  if (service.includes('linkedin')) return 'LinkedIn';
  if (service.includes('youtube') || service === 'yt') return 'YouTube';
  if (service.includes('tiktok')) return 'TikTok';
  if (service.includes('snapchat') || service === 'snap') return 'Snapchat';
  if (service.includes('reddit')) return 'Reddit';
  if (service.includes('pinterest')) return 'Pinterest';
  if (service.includes('whatsapp')) return 'WhatsApp';
  if (service.includes('telegram')) return 'Telegram';
  if (service.includes('discord')) return 'Discord';
  if (service.includes('slack')) return 'Slack';
  
  // Tech & Development
  if (service.includes('github')) return 'GitHub';
  if (service.includes('gitlab')) return 'GitLab';
  if (service.includes('bitbucket')) return 'Bitbucket';
  if (service.includes('stackoverflow') || service.includes('stack overflow')) return 'Stack Overflow';
  
  // Google Services
  if (service.includes('google') && !service.includes('drive')) return 'Google';
  if (service.includes('gmail')) return 'Gmail';
  if (service.includes('drive') || service.includes('google drive')) return 'Google Drive';
  
  // Microsoft Services
  if (service.includes('microsoft')) return 'Microsoft';
  if (service.includes('outlook')) return 'Outlook';
  if (service.includes('office')) return 'Microsoft Office';
  
  // Apple Services
  if (service.includes('apple')) return 'Apple';
  if (service.includes('icloud')) return 'iCloud';
  
  // Major Tech Companies
  if (service.includes('meta')) return 'Meta';
  if (service.includes('tesla')) return 'Tesla';
  if (service.includes('netflix')) return 'Netflix';
  if (service.includes('adobe')) return 'Adobe';
  if (service.includes('salesforce')) return 'Salesforce';
  if (service.includes('oracle')) return 'Oracle';
  if (service.includes('sap')) return 'SAP';
  if (service.includes('ibm')) return 'IBM';
  if (service.includes('intel')) return 'Intel';
  if (service.includes('nvidia')) return 'NVIDIA';
  if (service.includes('amd')) return 'AMD';
  
  // Consulting & Professional Services
  if (service.includes('deloitte')) return 'Deloitte';
  if (service.includes('pwc') || service.includes('pricewaterhouse')) return 'PwC';
  if (service.includes('ey') || service.includes('ernst')) return 'EY';
  if (service.includes('kpmg')) return 'KPMG';
  if (service.includes('accenture')) return 'Accenture';
  if (service.includes('mckinsey')) return 'McKinsey';
  if (service.includes('bcg') || service.includes('boston consulting')) return 'BCG';
  if (service.includes('bain')) return 'Bain & Company';
  
  // Indian Companies
  if (service.includes('tcs') || service.includes('tata consultancy')) return 'TCS';
  if (service.includes('infosys')) return 'Infosys';
  if (service.includes('wipro')) return 'Wipro';
  if (service.includes('hcl')) return 'HCL';
  if (service.includes('tech mahindra')) return 'Tech Mahindra';
  if (service.includes('reliance')) return 'Reliance';
  if (service.includes('airtel')) return 'Airtel';
  if (service.includes('jio')) return 'Jio';
  
  // Railways & Transportation
  if (service.includes('irctc') || service.includes('indian railway')) return 'IRCTC';
  if (service.includes('railone')) return 'RailOne';
  if (service.includes('redbus')) return 'redBus';
  if (service.includes('rapido')) return 'Rapido';
  if (service.includes('uber')) return 'Uber';
  if (service.includes('ola')) return 'Ola';
  if (service.includes('swiggy')) return 'Swiggy';
  if (service.includes('zomato')) return 'Zomato';
  if (service.includes('dunzo')) return 'Dunzo';
  if (service.includes('blinkit') || service.includes('grofers')) return 'Blinkit';
  if (service.includes('zepto')) return 'Zepto';
  if (service.includes('bigbasket')) return 'BigBasket';
  if (service.includes('flipkart')) return 'Flipkart';
  
  // Banks & Financial
  if (service.includes('hdfc')) return 'HDFC Bank';
  if (service.includes('icici')) return 'ICICI Bank';
  if (service.includes('sbi') || service.includes('state bank')) return 'SBI';
  if (service.includes('axis')) return 'Axis Bank';
  if (service.includes('kotak')) return 'Kotak Bank';
  if (service.includes('bob') || service.includes('bank of baroda')) return 'Bank of Baroda';
  if (service.includes('pnb') || service.includes('punjab national')) return 'Punjab National Bank';
  if (service.includes('canara')) return 'Canara Bank';
  if (service.includes('union bank')) return 'Union Bank';
  if (service.includes('bank of india') && !service.includes('state')) return 'Bank of India';
  if (service.includes('idbi')) return 'IDBI Bank';
  if (service.includes('indian bank')) return 'Indian Bank';
  if (service.includes('central bank')) return 'Central Bank of India';
  if (service.includes('indian overseas')) return 'Indian Overseas Bank';
  if (service.includes('uco bank')) return 'UCO Bank';
  if (service.includes('yes bank')) return 'Yes Bank';
  if (service.includes('indusind')) return 'IndusInd Bank';
  if (service.includes('idfc')) return 'IDFC First Bank';
  if (service.includes('bandhan')) return 'Bandhan Bank';
  if (service.includes('rbl')) return 'RBL Bank';
  if (service.includes('federal bank')) return 'Federal Bank';
  if (service.includes('south indian bank')) return 'South Indian Bank';
  if (service.includes('karnataka bank')) return 'Karnataka Bank';
  if (service.includes('jpmorgan') || service.includes('jp morgan')) return 'JPMorgan';
  if (service.includes('goldman')) return 'Goldman Sachs';
  if (service.includes('morgan stanley')) return 'Morgan Stanley';
  if (service.includes('citibank') || service.includes('citi')) return 'Citibank';
  if (service.includes('hsbc')) return 'HSBC';
  if (service.includes('standard chartered')) return 'Standard Chartered';
  if (service.includes('dbs')) return 'DBS Bank';
  
  // Railways & Transportation
  if (service.includes('irctc') || service.includes('indian railway')) return 'IRCTC';
  if (service.includes('railone')) return 'RailOne';
  if (service.includes('redbus')) return 'redBus';
  if (service.includes('rapido')) return 'Rapido';
  if (service.includes('uber')) return 'Uber';
  if (service.includes('ola')) return 'Ola';
  if (service.includes('swiggy')) return 'Swiggy';
  if (service.includes('zomato')) return 'Zomato';
  if (service.includes('dunzo')) return 'Dunzo';
  if (service.includes('blinkit') || service.includes('grofers')) return 'Blinkit';
  if (service.includes('zepto')) return 'Zepto';
  if (service.includes('bigbasket')) return 'BigBasket';
  
  // E-commerce & Retail
  if (service.includes('walmart')) return 'Walmart';
  if (service.includes('target')) return 'Target';
  if (service.includes('costco')) return 'Costco';
  if (service.includes('alibaba')) return 'Alibaba';
  
  // Automotive
  if (service.includes('toyota')) return 'Toyota';
  if (service.includes('honda')) return 'Honda';
  if (service.includes('ford')) return 'Ford';
  if (service.includes('bmw')) return 'BMW';
  if (service.includes('mercedes')) return 'Mercedes-Benz';
  if (service.includes('audi')) return 'Audi';
  
  // Airlines & Travel
  if (service.includes('indigo')) return 'IndiGo';
  if (service.includes('air india')) return 'Air India';
  if (service.includes('spicejet')) return 'SpiceJet';
  if (service.includes('vistara')) return 'Vistara';
  if (service.includes('emirates')) return 'Emirates';
  if (service.includes('booking') || service.includes('booking.com')) return 'Booking.com';
  if (service.includes('airbnb')) return 'Airbnb';
  if (service.includes('makemytrip')) return 'MakeMyTrip';
  
  // Cloud & Storage
  if (service.includes('dropbox')) return 'Dropbox';
  if (service.includes('onedrive')) return 'OneDrive';
  if (service.includes('aws')) return 'AWS';
  
  // Payment & Finance
  if (service.includes('paypal')) return 'PayPal';
  if (service.includes('stripe')) return 'Stripe';
  if (service.includes('venmo')) return 'Venmo';
  if (service.includes('cashapp') || service.includes('cash app')) return 'Cash App';
  if (service.includes('phonepe') || service.includes('phone pe')) return 'PhonePe';
  if (service.includes('gpay') || service.includes('google pay') || service === 'g pay') return 'Google Pay';
  if (service.includes('paytm')) return 'Paytm';
  if (service.includes('upi')) return 'UPI';
  
  // Entertainment
  if (service.includes('netflix')) return 'Netflix';
  if (service.includes('spotify')) return 'Spotify';
  if (service.includes('twitch')) return 'Twitch';
  if (service.includes('steam')) return 'Steam';
  if (service.includes('playstation') || service === 'ps') return 'PlayStation';
  if (service.includes('xbox')) return 'Xbox';
  
  // Communication
  if (service.includes('zoom')) return 'Zoom';
  if (service.includes('skype')) return 'Skype';
  if (service.includes('teams')) return 'Microsoft Teams';
  
  // Shopping
  if (service.includes('amazon')) return 'Amazon';
  if (service.includes('ebay')) return 'eBay';
  
  // Return original with proper capitalization if no match
  return serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
};

export const getServiceIcon = (serviceName: string): string => {
  const service = serviceName.toLowerCase().trim();
  
  // Social Media
  if (service.includes('facebook') || service.includes('fb')) return 'logo-facebook';
  if (service.includes('instagram') || service.includes('insta')) return 'logo-instagram';
  if (service.includes('twitter') || service.includes('x.com')) return 'logo-twitter';
  if (service.includes('linkedin')) return 'logo-linkedin';
  if (service.includes('youtube')) return 'logo-youtube';
  if (service.includes('tiktok')) return 'logo-tiktok';
  if (service.includes('snapchat') || service.includes('snap')) return 'logo-snapchat';
  if (service.includes('reddit')) return 'logo-reddit';
  if (service.includes('pinterest')) return 'logo-pinterest';
  if (service.includes('whatsapp')) return 'logo-whatsapp';
  if (service.includes('telegram')) return 'paper-plane';
  if (service.includes('discord')) return 'logo-discord';
  if (service.includes('slack')) return 'logo-slack';
  
  // Tech & Development
  if (service.includes('github')) return 'logo-github';
  if (service.includes('gitlab')) return 'git-branch';
  if (service.includes('bitbucket')) return 'git-branch';
  if (service.includes('stackoverflow') || service.includes('stack overflow')) return 'logo-stackoverflow';
  if (service.includes('npm')) return 'logo-npm';
  if (service.includes('docker')) return 'logo-docker';
  
  // Google Services
  if (service.includes('google') || service.includes('gmail')) return 'logo-google';
  if (service.includes('drive')) return 'logo-google-playstore';
  
  // Microsoft Services
  if (service.includes('microsoft') || service.includes('outlook') || service.includes('office')) return 'logo-microsoft';
  
  // Apple Services
  if (service.includes('apple') || service.includes('icloud')) return 'logo-apple';
  
  // Major Tech Companies
  if (service.includes('meta')) return 'logo-facebook';
  if (service.includes('tesla')) return 'car-sport';
  if (service.includes('netflix')) return 'tv';
  if (service.includes('adobe')) return 'color-palette';
  if (service.includes('salesforce')) return 'cloud';
  if (service.includes('oracle') || service.includes('sap') || service.includes('ibm')) return 'server';
  if (service.includes('intel') || service.includes('nvidia') || service.includes('amd')) return 'hardware-chip';
  
  // Consulting & Professional Services  
  if (service.includes('deloitte') || service.includes('pwc') || service.includes('ey') || 
      service.includes('kpmg') || service.includes('accenture') || service.includes('mckinsey') || 
      service.includes('bcg') || service.includes('bain')) return 'briefcase';
  
  // Indian IT Companies
  if (service.includes('tcs') || service.includes('infosys') || service.includes('wipro') || 
      service.includes('hcl') || service.includes('tech mahindra')) return 'code-slash';
  
  // Telecom
  if (service.includes('reliance') || service.includes('airtel') || service.includes('jio')) return 'phone-portrait';
  
  // Food & Delivery
  if (service.includes('flipkart')) return 'cart';
  if (service.includes('swiggy') || service.includes('zomato')) return 'restaurant';
  if (service.includes('ola') || service.includes('uber')) return 'car';
  
  // Banks & Financial
  if (service.includes('hdfc') || service.includes('icici') || service.includes('sbi') || 
      service.includes('axis') || service.includes('kotak') || service.includes('bob') ||
      service.includes('pnb') || service.includes('canara') || service.includes('union bank') ||
      service.includes('bank of india') || service.includes('idbi') || service.includes('indian bank') ||
      service.includes('central bank') || service.includes('indian overseas') || service.includes('uco') ||
      service.includes('yes bank') || service.includes('indusind') || service.includes('idfc') ||
      service.includes('bandhan') || service.includes('rbl') || service.includes('federal bank') ||
      service.includes('south indian bank') || service.includes('karnataka bank') ||
      service.includes('jpmorgan') || service.includes('goldman') || service.includes('morgan stanley') || 
      service.includes('citi') || service.includes('hsbc') || service.includes('standard chartered') ||
      service.includes('dbs')) return 'business';
  
  // Railways & Transportation
  if (service.includes('irctc') || service.includes('railone') || service.includes('indian railway')) return 'train';
  if (service.includes('redbus')) return 'bus';
  if (service.includes('rapido')) return 'bicycle';
  if (service.includes('ola') || service.includes('uber')) return 'car';
  
  // Food & Delivery
  if (service.includes('swiggy') || service.includes('zomato')) return 'restaurant';
  if (service.includes('dunzo') || service.includes('blinkit') || service.includes('zepto') || 
      service.includes('bigbasket')) return 'basket';
  
  // E-commerce & Retail
  if (service.includes('walmart') || service.includes('target') || service.includes('costco') || 
      service.includes('alibaba')) return 'storefront';
  
  // Automotive
  if (service.includes('toyota') || service.includes('honda') || service.includes('ford') || 
      service.includes('bmw') || service.includes('mercedes') || service.includes('audi')) return 'car-sport';
  
  // Airlines & Travel
  if (service.includes('indigo') || service.includes('air india') || service.includes('spicejet') || 
      service.includes('vistara') || service.includes('emirates')) return 'airplane';
  if (service.includes('booking') || service.includes('airbnb') || service.includes('makemytrip')) return 'bed';
  
  // Cloud & Storage
  if (service.includes('dropbox')) return 'logo-dropbox';
  if (service.includes('onedrive')) return 'cloud';
  if (service.includes('aws') || service.includes('amazon')) return 'logo-amazon';
  
  // Payment & Finance
  if (service.includes('paypal')) return 'logo-paypal';
  if (service.includes('stripe')) return 'card';
  if (service.includes('phonepe') || service.includes('phone pe')) return 'phone-portrait';
  if (service.includes('gpay') || service.includes('google pay') || service.includes('g pay')) return 'logo-google';
  if (service.includes('paytm')) return 'wallet';
  if (service.includes('upi')) return 'swap-horizontal';
  if (service.includes('bank')) return 'business';
  if (service.includes('venmo') || service.includes('cashapp')) return 'cash';
  
  // Entertainment
  if (service.includes('netflix')) return 'tv';
  if (service.includes('spotify')) return 'musical-notes';
  if (service.includes('twitch')) return 'logo-twitch';
  if (service.includes('steam')) return 'logo-steam';
  if (service.includes('playstation') || service.includes('ps')) return 'logo-playstation';
  if (service.includes('xbox')) return 'logo-xbox';
  
  // Communication
  if (service.includes('zoom')) return 'videocam';
  if (service.includes('skype')) return 'logo-skype';
  if (service.includes('teams')) return 'people';
  
  // Shopping
  if (service.includes('amazon')) return 'logo-amazon';
  if (service.includes('ebay')) return 'pricetag';
  if (service.includes('shop') || service.includes('store')) return 'storefront';
  
  // Default icons based on keywords
  if (service.includes('mail') || service.includes('email')) return 'mail';
  if (service.includes('chat') || service.includes('message')) return 'chatbubbles';
  if (service.includes('game')) return 'game-controller';
  if (service.includes('work') || service.includes('office')) return 'briefcase';
  if (service.includes('school') || service.includes('edu')) return 'school';
  if (service.includes('health') || service.includes('medical')) return 'medical';
  
  // Default
  return 'globe-outline';
};

export const getServiceColor = (serviceName: string, isDarkTheme: boolean = false): string => {
  const service = serviceName.toLowerCase().trim();
  
  // Social Media Colors
  if (service.includes('facebook') || service.includes('fb')) return '#1877F2';
  if (service.includes('instagram') || service.includes('insta')) return '#E4405F';
  if (service.includes('twitter') || service.includes('x.com')) return '#1DA1F2';
  if (service.includes('linkedin')) return '#0A66C2';
  if (service.includes('youtube')) return '#FF0000';
  if (service.includes('tiktok')) return isDarkTheme ? '#FFFFFF' : '#000000';
  if (service.includes('snapchat') || service.includes('snap')) return '#FFFC00';
  if (service.includes('reddit')) return '#FF4500';
  if (service.includes('pinterest')) return '#E60023';
  if (service.includes('whatsapp')) return '#25D366';
  if (service.includes('telegram')) return '#0088cc';
  if (service.includes('discord')) return '#5865F2';
  if (service.includes('slack')) return '#4A154B';
  
  // Tech & Development
  if (service.includes('github')) return isDarkTheme ? '#FFFFFF' : '#181717';
  if (service.includes('gitlab')) return '#FC6D26';
  if (service.includes('stackoverflow') || service.includes('stack overflow')) return '#F58025';
  
  // Google Services
  if (service.includes('google') || service.includes('gmail')) return '#4285F4';
  
  // Microsoft Services
  if (service.includes('microsoft') || service.includes('outlook')) return '#0078D4';
  
  // Apple Services
  if (service.includes('apple') || service.includes('icloud')) return isDarkTheme ? '#FFFFFF' : '#000000';
  
  // Major Tech Companies
  if (service.includes('meta')) return '#0081FB';
  if (service.includes('tesla')) return '#CC0000';
  if (service.includes('adobe')) return '#FF0000';
  if (service.includes('salesforce')) return '#00A1E0';
  if (service.includes('oracle')) return '#F80000';
  if (service.includes('sap')) return '#0FAAFF';
  if (service.includes('ibm')) return '#054ADA';
  if (service.includes('intel')) return '#0071C5';
  if (service.includes('nvidia')) return '#76B900';
  if (service.includes('amd')) return '#ED1C24';
  
  // Consulting (Professional Blue/Gray)
  if (service.includes('deloitte')) return '#86BC25';
  if (service.includes('pwc')) return '#D04A02';
  if (service.includes('ey')) return '#FFE600';
  if (service.includes('kpmg')) return '#00338D';
  if (service.includes('accenture')) return '#A100FF';
  if (service.includes('mckinsey') || service.includes('bcg') || service.includes('bain')) return '#0066CC';
  
  // Indian IT Companies
  if (service.includes('tcs')) return '#0066CC';
  if (service.includes('infosys')) return '#007CC3';
  if (service.includes('wipro')) return '#6CB33F';
  if (service.includes('hcl')) return '#0066B2';
  if (service.includes('tech mahindra')) return '#ED1C24';
  
  // Telecom
  if (service.includes('reliance') || service.includes('jio')) return '#0066B2';
  if (service.includes('airtel')) return '#ED1C24';
  
  // Food & Delivery
  if (service.includes('flipkart')) return '#2874F0';
  if (service.includes('swiggy')) return '#FC8019';
  if (service.includes('zomato')) return '#E23744';
  if (service.includes('ola')) return '#00D100';
  if (service.includes('uber')) return '#000000';
  
  // Banks (Professional Blue)
  if (service.includes('hdfc')) return '#004C8F';
  if (service.includes('icici')) return '#F37021';
  if (service.includes('sbi')) return '#22409A';
  if (service.includes('axis')) return '#800000';
  if (service.includes('kotak')) return '#ED1C24';
  if (service.includes('bob') || service.includes('bank of baroda')) return '#F15A29';
  if (service.includes('pnb')) return '#EE2C3C';
  if (service.includes('canara')) return '#D32F2F';
  if (service.includes('union bank')) return '#0066B2';
  if (service.includes('bank of india')) return '#F37021';
  if (service.includes('idbi')) return '#00529B';
  if (service.includes('indian bank')) return '#0066CC';
  if (service.includes('central bank')) return '#003DA5';
  if (service.includes('indian overseas')) return '#0066B2';
  if (service.includes('uco')) return '#004C8F';
  if (service.includes('yes bank')) return '#003DA5';
  if (service.includes('indusind')) return '#D32F2F';
  if (service.includes('idfc')) return '#ED1C24';
  if (service.includes('bandhan')) return '#D32F2F';
  if (service.includes('rbl')) return '#003DA5';
  if (service.includes('federal bank')) return '#FFD700';
  if (service.includes('south indian bank')) return '#0066CC';
  if (service.includes('karnataka bank')) return '#D32F2F';
  if (service.includes('jpmorgan')) return '#0070CD';
  if (service.includes('goldman')) return '#0066CC';
  if (service.includes('morgan stanley')) return '#00529B';
  if (service.includes('citi')) return '#003DA5';
  if (service.includes('hsbc')) return '#DB0011';
  if (service.includes('standard chartered')) return '#0072CE';
  if (service.includes('dbs')) return '#D71921';
  
  // Railways & Transportation
  if (service.includes('irctc') || service.includes('railone')) return '#E74C3C';
  if (service.includes('redbus')) return '#D84E55';
  if (service.includes('rapido')) return '#FFC700';
  if (service.includes('uber')) return '#000000';
  if (service.includes('ola')) return '#00D100';
  
  // Food & Delivery
  if (service.includes('swiggy')) return '#FC8019';
  if (service.includes('zomato')) return '#E23744';
  if (service.includes('dunzo')) return '#0087FF';
  if (service.includes('blinkit')) return '#F8CB46';
  if (service.includes('zepto')) return '#8B4FE8';
  if (service.includes('bigbasket')) return '#84C225';
  
  // E-commerce
  if (service.includes('walmart')) return '#0071CE';
  if (service.includes('target')) return '#CC0000';
  if (service.includes('alibaba')) return '#FF6A00';
  
  // Automotive
  if (service.includes('tesla')) return '#CC0000';
  if (service.includes('toyota')) return '#EB0A1E';
  if (service.includes('honda')) return '#CC0000';
  if (service.includes('ford')) return '#003478';
  if (service.includes('bmw')) return '#1C69D4';
  if (service.includes('mercedes')) return '#00ADEF';
  if (service.includes('audi')) return '#BB0A30';
  
  // Airlines
  if (service.includes('indigo')) return '#0033A0';
  if (service.includes('air india')) return '#FF2E1F';
  if (service.includes('spicejet')) return '#ED1C24';
  if (service.includes('vistara')) return '#6F2C91';
  if (service.includes('emirates')) return '#D71921';
  if (service.includes('booking')) return '#003580';
  if (service.includes('airbnb')) return '#FF5A5F';
  if (service.includes('makemytrip')) return '#ED1C24';
  
  // Payment & Finance
  if (service.includes('paypal')) return '#00457C';
  if (service.includes('stripe')) return '#635BFF';
  if (service.includes('phonepe') || service.includes('phone pe')) return '#5f259f';
  if (service.includes('gpay') || service.includes('google pay') || service.includes('g pay')) return '#4285F4';
  if (service.includes('paytm')) return '#00BAF2';
  if (service.includes('upi')) return '#097939';
  
  // Entertainment
  if (service.includes('netflix')) return '#E50914';
  if (service.includes('spotify')) return '#1DB954';
  if (service.includes('twitch')) return '#9146FF';
  if (service.includes('steam')) return isDarkTheme ? '#FFFFFF' : '#171A21';
  
  // Default
  return '#6366f1';
};
