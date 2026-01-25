// Password category system with auto-categorization

export type CategoryType = 
  | 'google'
  | 'banking'
  | 'social'
  | 'work'
  | 'entertainment'
  | 'shopping'
  | 'other';

export interface Category {
  id: CategoryType;
  name: string;
  icon: string;
  gradient: [string, string];
  keywords: string[];
}

export const categories: Category[] = [
  {
    id: 'google',
    name: 'Google Services',
    icon: 'logo-google',
    gradient: ['#4285F4', '#DB4437'],
    keywords: ['google', 'gmail', 'drive', 'youtube', 'photos', 'maps', 'chrome', 'play','playstore'],
  },
  {
    id: 'banking',
    name: 'Banking & Finance',
    icon: 'card',
    gradient: ['#10b981', '#059669'],
    keywords: [
      'bank', 'banking', 'upi', 'paytm', 'phonepe', 'gpay', 'bhim', 'credit', 'debit', 'wallet', 'payment', 'paypal', 'stripe', 'venmo',
      // Indian Banks
      'hdfc', 'icici', 'sbi', 'axis', 'kotak', 'bob', 'baroda', 'pnb', 'punjab national', 'canara', 'union bank',
      'bank of india', 'idbi', 'indian bank', 'central bank', 'indian overseas', 'uco', 'yes bank', 'indusind',
      'idfc', 'bandhan', 'rbl', 'federal bank', 'south indian bank', 'karnataka bank',
      // International Banks
      'jpmorgan', 'goldman', 'morgan stanley', 'citibank', 'citi', 'hsbc', 'standard chartered', 'dbs',
    ],
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: 'people',
    gradient: ['#ec4899', '#8b5cf6'],
    keywords: ['instagram', 'insta', 'facebook', 'fb', 'twitter', 'x.com','x', 'linkedin', 'tiktok', 'snapchat', 'snap', 'reddit', 'pinterest', 'whatsapp', 'telegram', 'discord','quora'],
  },
  {
    id: 'work',
    name: 'Work & Productivity',
    icon: 'briefcase',
    gradient: ['#f59e0b', '#d97706'],
    keywords: [
      'slack', 'teams', 'zoom', 'office', 'microsoft', 'github', 'gitlab', 'jira', 'trello', 'notion', 'asana', 'dropbox', 'onedrive',
      // Consulting & Professional Services
      'deloitte', 'pwc', 'pricewaterhouse', 'ey', 'ernst', 'kpmg', 'accenture', 'mckinsey', 'bcg', 'boston consulting', 'bain',
      // Indian IT Companies
      'tcs', 'tata consultancy', 'infosys', 'wipro', 'hcl', 'tech mahindra',
      // Tech Companies
      'salesforce', 'oracle', 'sap', 'ibm', 'adobe',
    ],
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'play-circle',
    gradient: ['#ef4444', '#dc2626'],
    keywords: ['netflix', 'spotify', 'prime', 'hotstar','jiostar', 'disney', 'hulu', 'twitch', 'steam', 'playstation', 'xbox', 'nintendo', 'epic'],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'cart',
    gradient: ['#06b6d4', '#0891b2'],
    keywords: [
      'amazon', 'flipkart', 'ebay', 'shop', 'store', 'myntra', 'ajio', 'meesho', 
      // Food & Delivery
      'swiggy', 'zomato', 'dunzo', 'blinkit', 'grofers', 'zepto', 'bigbasket',
      // Transportation
      'uber', 'ola', 'rapido', 'irctc', 'railone', 'redbus',
    ],
  },
  {
    id: 'other',
    name: 'Other',
    icon: 'apps',
    gradient: ['#6366f1', '#4f46e5'],
    keywords: [],
  },
];

export const categorizeService = (serviceName: string): CategoryType => {
  const service = serviceName.toLowerCase().trim();
  
  for (const category of categories) {
    if (category.id === 'other') continue;
    
    for (const keyword of category.keywords) {
      if (service.includes(keyword)) {
        return category.id;
      }
    }
  }
  
  return 'other';
};

export const getCategoryById = (id: CategoryType): Category => {
  return categories.find(c => c.id === id) || categories[categories.length - 1];
};
