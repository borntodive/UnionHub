import { useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricType = 'fingerprint' | 'face' | 'iris' | 'none';

interface BiometricAuthState {
  isAvailable: boolean;
  biometricType: BiometricType;
  isAuthenticated: boolean;
  error: string | null;
}

export const useBiometricAuth = () => {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    biometricType: 'none',
    isAuthenticated: false,
    error: null,
  });

  // Check if biometric authentication is available
  const checkAvailability = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricType = 'none';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = 'face';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = 'fingerprint';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'iris';
      }

      setState({
        isAvailable: hasHardware && isEnrolled,
        biometricType,
        isAuthenticated: false,
        error: null,
      });

      return hasHardware && isEnrolled;
    } catch (error) {
      setState({
        isAvailable: false,
        biometricType: 'none',
        isAuthenticated: false,
        error: 'Errore nel controllo della biometrica',
      });
      return false;
    }
  }, []);

  // Authenticate with biometric
  const authenticate = useCallback(async (promptMessage?: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: promptMessage || 'Autenticazione richiesta',
        fallbackLabel: 'Usa password',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setState(prev => ({ ...prev, isAuthenticated: true, error: null }));
        return true;
      } else {
        setState(prev => ({ 
          ...prev, 
          isAuthenticated: false, 
          error: result.error === 'user_cancel' ? 'Autenticazione annullata' : 'Autenticazione fallita'
        }));
        return false;
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isAuthenticated: false, 
        error: 'Errore durante l\'autenticazione'
      }));
      return false;
    }
  }, []);

  // Reset authentication state
  const reset = useCallback(() => {
    setState(prev => ({ ...prev, isAuthenticated: false, error: null }));
  }, []);

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  // Get label for biometric type
  const getBiometricLabel = useCallback((): string => {
    switch (state.biometricType) {
      case 'face':
        return 'Face ID';
      case 'fingerprint':
        return 'Impronta digitale';
      case 'iris':
        return 'Riconoscimento iride';
      default:
        return 'Biometrica';
    }
  }, [state.biometricType]);

  return {
    ...state,
    checkAvailability,
    authenticate,
    reset,
    getBiometricLabel,
  };
};

export default useBiometricAuth;
