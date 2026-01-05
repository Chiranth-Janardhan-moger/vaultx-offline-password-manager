// Service icon mapping - uses Ionicons (already included, no APK size increase)
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
  
  // Cloud & Storage
  if (service.includes('dropbox')) return 'logo-dropbox';
  if (service.includes('onedrive')) return 'cloud';
  if (service.includes('aws') || service.includes('amazon')) return 'logo-amazon';
  
  // Payment & Finance
  if (service.includes('paypal')) return 'logo-paypal';
  if (service.includes('stripe')) return 'card';
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
  
  // Payment & Finance
  if (service.includes('paypal')) return '#00457C';
  if (service.includes('stripe')) return '#635BFF';
  
  // Entertainment
  if (service.includes('netflix')) return '#E50914';
  if (service.includes('spotify')) return '#1DB954';
  if (service.includes('twitch')) return '#9146FF';
  if (service.includes('steam')) return isDarkTheme ? '#FFFFFF' : '#171A21';
  
  // Default
  return '#6366f1';
};
