import { NativeModules, Platform } from 'react-native';

const { AutofillModule } = NativeModules;

export interface AutofillIntentData {
  autofillMode: boolean;
  packageName: string;
  webDomain: string;
}

export interface AutofillService {
  isAutofillAvailable(): Promise<boolean>;
  isAutofillEnabled(): Promise<boolean>;
  openAutofillSettings(): Promise<boolean>;
  disableAutofill(): Promise<boolean>;
  cancelAutofill(): Promise<boolean>;
  getAutofillIntentData(): Promise<AutofillIntentData>;
  fillCredentials(username: string, password: string): Promise<boolean>;
}

const autofillService: AutofillService = {
  isAutofillAvailable: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;
    
    try {
      return await AutofillModule.isAutofillAvailable();
    } catch (error) {
      console.error('Error checking autofill availability:', error);
      return false;
    }
  },

  isAutofillEnabled: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;
    
    try {
      return await AutofillModule.isAutofillEnabled();
    } catch (error) {
      console.error('Error checking autofill status:', error);
      return false;
    }
  },

  openAutofillSettings: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;
    
    try {
      return await AutofillModule.openAutofillSettings();
    } catch (error) {
      console.error('Error opening autofill settings:', error);
      return false;
    }
  },

  disableAutofill: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;
    
    try {
      return await AutofillModule.disableAutofill();
    } catch (error) {
      console.error('Error disabling autofill:', error);
      return false;
    }
  },

  cancelAutofill: async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;

    try {
      return await AutofillModule.cancelAutofill();
    } catch (error) {
      console.error('Error cancelling autofill:', error);
      return false;
    }
  },

  getAutofillIntentData: async (): Promise<AutofillIntentData> => {
    if (Platform.OS !== 'android') return { autofillMode: false, packageName: '', webDomain: '' };
    if (!AutofillModule) return { autofillMode: false, packageName: '', webDomain: '' };

    try {
      return await AutofillModule.getAutofillIntentData();
    } catch (error) {
      console.error('Error getting autofill intent data:', error);
      return { autofillMode: false, packageName: '', webDomain: '' };
    }
  },

  fillCredentials: async (username: string, password: string): Promise<boolean> => {
    if (Platform.OS !== 'android') return false;
    if (!AutofillModule) return false;

    try {
      return await AutofillModule.fillCredentials(username, password);
    } catch (error) {
      console.error('Error filling credentials:', error);
      return false;
    }
  }
};

export default autofillService;
