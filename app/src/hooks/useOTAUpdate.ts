import { useEffect, useState } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

interface UpdateInfo {
  isAvailable: boolean;
  manifest?: {
    extra?: {
      expoClient?: {
        version?: string;
      };
    };
    createdAt?: string;
  };
}

export function useOTAUpdate() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Controlla aggiornamenti quando l'app torna in foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        checkForUpdate();
      }
    });

    // Controlla subito all'avvio
    checkForUpdate();

    return () => {
      subscription.remove();
    };
  }, []);

  async function checkForUpdate() {
    if (isChecking) return;
    
    try {
      setIsChecking(true);
      
      if (!Updates.isEnabled) {
        console.log('OTA Updates not enabled');
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        setUpdateInfo(update);
        showUpdateAlert(update);
      }
    } catch (error) {
      console.error('Errore controllo aggiornamenti:', error);
    } finally {
      setIsChecking(false);
    }
  }

  function showUpdateAlert(update: UpdateInfo) {
    // Estrai informazioni dall'update
    const version = update.manifest?.extra?.expoClient?.version || 'nuova versione';
    const createdAt = update.manifest?.createdAt 
      ? new Date(update.manifest.createdAt).toLocaleDateString('it-IT')
      : 'oggi';

    Alert.alert(
      '📱 Aggiornamento disponibile',
      `È disponibile una nuova versione (${version}) del ${createdAt}.\n\n` +
      `Vuoi aggiornare ora? L'app si riavvierà automaticamente.`,
      [
        {
          text: 'Più tardi',
          style: 'cancel',
          onPress: () => {
            console.log('Utente ha posticipato l\'aggiornamento');
          }
        },
        {
          text: 'Aggiorna ora',
          style: 'default',
          onPress: async () => {
            await downloadAndInstallUpdate();
          }
        }
      ],
      { cancelable: false }
    );
  }

  async function downloadAndInstallUpdate() {
    try {
      Alert.alert(
        '⏳ Download in corso...',
        'Stiamo scaricando l\'aggiornamento. Attendi un momento.',
        [],
        { cancelable: false }
      );

      await Updates.fetchUpdateAsync();
      
      // Chiudi l'alert di download e riavvia
      Alert.alert(
        '✅ Aggiornamento completato',
        'L\'app si riavvierà per applicare le modifiche.',
        [
          {
            text: 'Riavvia',
            onPress: async () => {
              await Updates.reloadAsync();
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Errore download aggiornamento:', error);
      Alert.alert(
        '❌ Errore',
        'Non è stato possibile scaricare l\'aggiornamento. Riprova più tardi.'
      );
    }
  }

  // Funzione per forzare il controllo manuale
  async function checkForUpdateManual() {
    await checkForUpdate();
  }

  return {
    checkForUpdate: checkForUpdateManual,
    updateInfo,
    isChecking
  };
}
