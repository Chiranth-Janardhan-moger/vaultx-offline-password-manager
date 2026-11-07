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
    name: 'Google',
    icon: 'logo-google',
    gradient: ['#4285F4', '#DB4437'],
    keywords: ['google', 'gmail', 'drive', 'youtube', 'photos', 'maps', 'chrome', 'play','playstore'],
  },
  {
    id: 'banking',
    name: 'Banking',
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
    name: 'Work',
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

export const DEFAULT_DELETE_CATEGORY_KEY = 'default_delete_category';
export const DEFAULT_DELETE_CATEGORY: CategoryType = 'google';

export const getEffectiveCategories = (
  deletedCategories?: string[],
  categoryOverrides?: { [categoryId: string]: string }
): Category[] => {
  const deleted = deletedCategories || [];
  const overrides = categoryOverrides || {};
  return categories
    .filter((cat) => !deleted.includes(cat.id))
    .map((cat) => ({
      ...cat,
      name: overrides[cat.id] || cat.name,
    }));
};

export const categorizeService = (
  serviceName: string,
  deletedCategories?: string[],
  fallbackCategory: CategoryType = 'google'
): CategoryType => {
  const service = serviceName.toLowerCase().trim();
  const deleted = deletedCategories || [];
  
  for (const category of categories) {
    if (category.id === 'other') continue;
    if (deleted.includes(category.id)) continue;
    
    for (const keyword of category.keywords) {
      if (keyword.length === 1) {
        if (service === keyword || service.split(/[\s_-]+/).includes(keyword)) {
          return category.id;
        }
      } else if (service.includes(keyword)) {
        return category.id;
      }
    }
  }
  
  if (deleted.includes('other')) {
    return fallbackCategory;
  }
  return 'other';
};

export const getCategoryById = (
  id: string,
  categoryOverrides?: { [categoryId: string]: string }
): Category => {
  const base = categories.find((c) => c.id === id) || categories[categories.length - 1];
  if (categoryOverrides && categoryOverrides[base.id]) {
    return { ...base, name: categoryOverrides[base.id] };
  }
  return base;
};
