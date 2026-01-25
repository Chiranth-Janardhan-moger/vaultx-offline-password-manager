import { useTheme } from '@/context/ThemeProvider';
import React from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  type?: 'default' | 'destructive';
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'OK',
  type = 'default',
}) => {
  const { colors, showBorders, enhancedContrast } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const alertStyles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      minWidth: 280,
      maxWidth: 340,
      borderWidth: showBorders ? (enhancedContrast ? 2 : 1) : 0,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.mutedText,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 24,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: colors.inputBg,
      borderWidth: showBorders ? 1 : 0,
      borderColor: colors.border,
    },
    confirmButton: {
      backgroundColor: type === 'destructive' ? '#ef4444' : colors.primary,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    confirmText: {
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[alertStyles.overlay, { opacity: opacityAnim }]}>
        <Animated.View
          style={[
            alertStyles.container,
            {
              transform: [
                {
                  scale: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          
          <View style={alertStyles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity
                style={[alertStyles.button, alertStyles.cancelButton]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={alertStyles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            
            {onConfirm && (
              <TouchableOpacity
                style={[alertStyles.button, alertStyles.confirmButton]}
                onPress={onConfirm}
                activeOpacity={0.7}
              >
                <Text style={alertStyles.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// Hook for easier usage
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    onCancel?: () => void;
    onConfirm?: () => void;
    cancelText?: string;
    confirmText?: string;
    type?: 'default' | 'destructive';
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = React.useCallback((config: Omit<typeof alertConfig, 'visible'>) => {
    setAlertConfig({ ...config, visible: true });
  }, []);

  const hideAlert = React.useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = React.useCallback(() => (
    <CustomAlert
      {...alertConfig}
      onCancel={() => {
        alertConfig.onCancel?.();
        hideAlert();
      }}
      onConfirm={() => {
        alertConfig.onConfirm?.();
        hideAlert();
      }}
    />
  ), [alertConfig, hideAlert]);

  return { showAlert, hideAlert, AlertComponent };
};