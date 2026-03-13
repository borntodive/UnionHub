import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FileText, Upload, X } from 'lucide-react-native';
import { useSharedFile } from '../hooks/useSharedFile';
import { useAuthStore } from '../store/authStore';
import { usersApi } from '../api/users';
import { colors, spacing, typography, borderRadius } from '../theme';
import { UserRole, Ruolo } from '../types';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SharedFileHandler: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { sharedFile, isProcessing, clearSharedFile } = useSharedFile();
  const user = useAuthStore((state) => state.user);
  const [showModal, setShowModal] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    if (sharedFile && isAdmin) {
      handleSharedFile();
    } else if (sharedFile && !isAdmin) {
      Alert.alert(
        'Access Denied',
        'Only administrators can process registration forms.',
        [{ text: 'OK', onPress: clearSharedFile }]
      );
    }
  }, [sharedFile, isAdmin]);

  const handleSharedFile = async () => {
    if (!sharedFile) return;

    setShowModal(true);
    setExtracting(true);

    try {
      // Try to extract data from PDF
      // For now we assume it's a pilot form, could be made smarter
      const extracted = await usersApi.extractPdf(sharedFile.uri, Ruolo.PILOT);
      
      setExtracting(false);
      setShowModal(false);

      // Show confirmation and navigate
      Alert.alert(
        'PDF Received',
        `Registration form detected for: ${extracted.cognome || 'Unknown'} ${extracted.nome || ''}\n\nProceed to create new member?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              clearSharedFile();
            },
          },
          {
            text: 'Create Member',
            style: 'default',
            onPress: () => {
              clearSharedFile();
              
              // Navigate to MemberCreate with pre-filled data
              navigation.navigate('MemberCreate', {
                sharedPdfUri: sharedFile.uri,
                extractedData: extracted,
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error extracting PDF:', error);
      setExtracting(false);
      setShowModal(false);

      Alert.alert(
        'PDF Processing',
        'Could not automatically extract data from PDF. Proceed with manual entry?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              clearSharedFile();
            },
          },
          {
            text: 'Proceed',
            onPress: () => {
              clearSharedFile();
              
              // Navigate to MemberCreate with just the PDF
              navigation.navigate('MemberCreate', {
                sharedPdfUri: sharedFile.uri,
              });
            },
          },
        ]
      );
    }
  };

  if (!showModal) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showModal}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <FileText size={48} color={colors.primary} />
          </View>
          
          <Text style={styles.title}>PDF Received</Text>
          <Text style={styles.filename} numberOfLines={1}>
            {sharedFile?.name}
          </Text>

          {extracting ? (
            <>
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
              <Text style={styles.processingText}>Extracting data from PDF...</Text>
            </>
          ) : (
            <View style={styles.successIcon}>
              <Upload size={32} color={colors.success} />
              <Text style={styles.readyText}>Ready to process</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filename: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    maxWidth: '100%',
  },
  loader: {
    marginVertical: spacing.md,
  },
  processingText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
  },
  successIcon: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  readyText: {
    fontSize: typography.sizes.base,
    color: colors.success,
    fontWeight: typography.weights.medium,
  },
});
