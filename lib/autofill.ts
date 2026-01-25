import { NativeModules, Platform } from 'react-native';

const { AutofillModule } = NativeModules;

export interface AutofillService {
  isAutofillAvailable(): Promise<boolean>;
  isAutofillEnabled(): Promise<boolean>;
  openAutofillSettings(): Promise<boolean>;
  disableAutofill(): Promise<boolean>;
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
};

export default autofillService;
