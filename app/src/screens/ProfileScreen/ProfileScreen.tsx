import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Edit3,
} from 'lucide-react-native';

import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { usersApi } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import { RootStackParamList } from '../../navigation/types';
import { Ruolo, UserRole } from '../../types';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case UserRole.SUPERADMIN:
      return 'Super Admin';
    case UserRole.ADMIN:
      return 'Administrator';
    case UserRole.USER:
      return 'User';
    default:
      return role;
  }
};

const getRuoloLabel = (ruolo: Ruolo | null) => {
  switch (ruolo) {
    case Ruolo.PILOT:
      return 'Pilot';
    case Ruolo.CABIN_CREW:
      return 'Cabin Crew';
    default:
      return 'Not specified';
  }
};

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const insets = useSafeAreaInsets();

  const { data: userData, isLoading, refetch } = useQuery({
    queryKey: ['me'],
    queryFn: usersApi.getMe,
  });

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleEdit = () => {
    if (user?.id) {
      navigation.navigate('MemberEdit', { memberId: user.id });
    }
  };

  const currentUser = userData || user;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <TouchableOpacity 
            onPress={handleEdit}
            style={styles.editButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Edit3 size={20} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.nome?.[0]}{currentUser?.cognome?.[0]}
              </Text>
            </View>
          </View>
          <Text style={styles.name}>
            {currentUser?.nome} {currentUser?.cognome}
          </Text>
          <Text style={styles.crewcode}>{currentUser?.crewcode}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(currentUser?.role as UserRole)}</Text>
          </View>
        </Card>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <InfoRow
            icon={<Mail size={20} color={colors.primary} />}
            label="Email"
            value={currentUser?.email}
          />
          
          <InfoRow
            icon={<Phone size={20} color={colors.primary} />}
            label="Phone"
            value={currentUser?.telefono || 'Not specified'}
          />

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Professional Information</Text>
          
          <InfoRow
            icon={<Briefcase size={20} color={colors.primary} />}
            label="Role"
            value={getRuoloLabel(currentUser?.ruolo as Ruolo)}
          />
          
          <InfoRow
            icon={<Award size={20} color={colors.primary} />}
            label="Grade"
            value={currentUser?.grade?.nome || 'Not specified'}
          />
          
          <InfoRow
            icon={<Briefcase size={20} color={colors.primary} />}
            label="Contract"
            value={currentUser?.contratto ? 
              (currentUser.role === UserRole.SUPERADMIN ? currentUser.contratto.codice : currentUser.contratto.codice.replace(/-(PI|CC)$/, '')) 
              : 'Not specified'}
          />
          
          <InfoRow
            icon={<MapPin size={20} color={colors.primary} />}
            label="Base"
            value={currentUser?.base?.nome || 'Not specified'}
          />
        </Card>

        {/* Actions Card */}
        <Card style={styles.actionsCard}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <Button
            title="Change Password"
            onPress={handleChangePassword}
            variant="outline"
            size="md"
            style={styles.actionButton}
          />
        </Card>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={styles.infoContent}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  headerCard: {
    alignItems: 'center',
    padding: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  crewcode: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.sizes.base,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  actionsCard: {
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
});
