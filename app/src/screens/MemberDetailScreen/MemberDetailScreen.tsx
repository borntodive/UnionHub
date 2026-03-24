import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
  AppState,
  AppStateStatus,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Award,
  Calendar,
  Edit3,
  Shield,
  AlertCircle,
  Check,
  X,
  ArrowLeft,
  FileText,
  ExternalLink,
} from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { usersApi } from "../../api/users";
import { useAuthStore } from "../../store/authStore";
import { RootStackParamList } from "../../navigation/types";
import { Ruolo, UserRole } from "../../types";

type MemberDetailRouteProp = RouteProp<RootStackParamList, "MemberDetail">;
type MemberDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getRoleLabel = (role: UserRole) => {
  switch (role) {
    case UserRole.SUPERADMIN:
      return "Super Admin";
    case UserRole.ADMIN:
      return "Administrator";
    case UserRole.USER:
      return "User";
    default:
      return role;
  }
};

const getRuoloLabel = (ruolo: Ruolo | null) => {
  switch (ruolo) {
    case Ruolo.PILOT:
      return "Pilot";
    case Ruolo.CABIN_CREW:
      return "Cabin Crew";
    default:
      return "Not specified";
  }
};

export const MemberDetailScreen: React.FC = () => {
  const navigation = useNavigation<MemberDetailNavigationProp>();
  const route = useRoute<MemberDetailRouteProp>();
  const { memberId } = route.params;
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const currentUser = useAuthStore((state) => state.user);
  const isAdmin =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.SUPERADMIN;
  const isSuperAdmin = currentUser?.role === UserRole.SUPERADMIN;
  const isOwnProfile = currentUser?.id === memberId;
  const canEdit = isAdmin || isOwnProfile;

  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState,
  );
  const [screenKey, setScreenKey] = useState(0);

  const {
    data: member,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["user", memberId],
    queryFn: () => usersApi.getUserById(memberId),
    staleTime: 0,
  });

  // Handle app state changes - force re-render when coming back to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        console.log("[MemberDetail] App came to foreground, forcing re-render");
        // Force multiple re-renders to ensure layout is recalculated
        setScreenKey((prev) => prev + 1);

        // Additional re-render after a short delay
        setTimeout(() => {
          setScreenKey((prev) => prev + 1);
          refetch();
        }, 50);

        // Final re-render after layout should be stable
        setTimeout(() => {
          setScreenKey((prev) => prev + 1);
        }, 200);
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, refetch]);

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", memberId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      Alert.alert("Success", "Member status updated successfully");
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update member",
      );
    },
  });

  const handleToggleActive = () => {
    if (!member) return;

    const action = member.isActive ? "deactivate" : "activate";
    Alert.alert("Confirm", `Are you sure you want to ${action} this member?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Confirm",
        onPress: () =>
          toggleActiveMutation.mutate({
            id: memberId,
            isActive: !member.isActive,
          }),
      },
    ]);
  };

  const handleEdit = () => {
    navigation.navigate("MemberEdit", { memberId });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <View style={styles.wrapper}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right", "top"]}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={styles.wrapper}>
        <StatusBar backgroundColor={colors.primary} barStyle="light-content" />
        <SafeAreaView
          style={styles.container}
          edges={["bottom", "left", "right", "top"]}
        >
          <View style={styles.errorContainer}>
            <AlertCircle size={48} color={colors.error} />
            <Text style={styles.errorText}>Failed to load member details</Text>
            <Button
              title="Go Back"
              onPress={() => navigation.goBack()}
              variant="outline"
            />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} key={screenKey}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <StatusBar barStyle="light-content" />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header - Same style as drawer screens */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Member Details</Text>
          {canEdit ? (
            <TouchableOpacity
              onPress={handleEdit}
              style={styles.editButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Edit3 size={20} color={colors.textInverse} />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView
          key={`scroll-${screenKey}`}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ minHeight: "100%" }}
        >
          {/* Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
                  !member.isActive && styles.avatarInactive,
                ]}
              >
                <Text style={styles.avatarText}>
                  {member.nome?.[0]}
                  {member.cognome?.[0]}
                </Text>
              </View>
              {!member.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>Inactive</Text>
                </View>
              )}
            </View>

            <Text style={styles.name}>
              {member.nome} {member.cognome}
            </Text>
            <Text style={styles.crewcode}>{member.crewcode}</Text>

            <View style={styles.roleContainer}>
              <View style={styles.roleBadge}>
                <Shield size={14} color={colors.primary} />
                <Text style={styles.roleText}>{getRoleLabel(member.role)}</Text>
              </View>
              <View
                style={[
                  styles.ruoloBadge,
                  {
                    backgroundColor:
                      member.ruolo === Ruolo.PILOT ? "#3b82f6" : "#8b5cf6",
                  },
                ]}
              >
                <Text style={styles.ruoloText}>
                  {getRuoloLabel(member.ruolo)}
                </Text>
              </View>
            </View>
          </Card>

          {/* Contact Info */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>

            <InfoRow
              icon={<Mail size={20} color={colors.primary} />}
              label="Email"
              value={member.email}
            />

            <InfoRow
              icon={<Phone size={20} color={colors.primary} />}
              label="Phone"
              value={member.telefono || "Not specified"}
            />
          </Card>

          {/* Professional Info */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Professional Information</Text>

            <InfoRow
              icon={<Award size={20} color={colors.primary} />}
              label="Grade"
              value={member.grade?.codice || "Not specified"}
            />

            <InfoRow
              icon={<Briefcase size={20} color={colors.primary} />}
              label="Contract"
              value={
                isSuperAdmin
                  ? member.contratto?.codice || "Not specified"
                  : member.contratto?.codice?.replace(/-(PI|CC)$/, "") ||
                    "Not specified"
              }
            />

            <InfoRow
              icon={<MapPin size={20} color={colors.primary} />}
              label="Base"
              value={member.base?.codice || "Not specified"}
            />
          </Card>

          {/* Special Flags */}
          {isAdmin && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Special Flags</Text>

              <View style={styles.flagsContainer}>
                <FlagItem label="ITUD" isActive={member.itud} />
                <FlagItem label="RSA" isActive={member.rsa} />
                <FlagItem label="RLS" isActive={member.rls} />
              </View>
            </Card>
          )}

          {/* Notes */}
          {isAdmin && member.note && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.noteText}>{member.note}</Text>
            </Card>
          )}

          {/* Subscription Date */}
          {member.dataIscrizione && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Membership Information</Text>
              <InfoRow
                icon={<Calendar size={20} color={colors.primary} />}
                label="Subscription Date"
                value={new Date(member.dataIscrizione).toLocaleDateString(
                  "it-IT",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              />
            </Card>
          )}

          {/* Registration Form PDF */}
          {member.registrationFormUrl && (
            <Card style={{ ...styles.sectionCard, ...styles.pdfCard }}>
              <Text style={styles.sectionTitle}>Registration Form</Text>
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={async () => {
                  // Open PDF in in-app browser (Safari View Controller)
                  // This prevents the white screen issue when returning to the app
                  const baseUrl = "http://localhost:3000";
                  const fullUrl = `${baseUrl}${member.registrationFormUrl}`;
                  try {
                    await WebBrowser.openBrowserAsync(fullUrl, {
                      presentationStyle:
                        WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                    });
                  } catch (error) {
                    // Fallback to Linking if WebBrowser fails
                    Linking.openURL(fullUrl).catch(() => {
                      Alert.alert("Error", "Could not open PDF");
                    });
                  }
                }}
              >
                <View style={styles.pdfIconContainer}>
                  <FileText size={24} color={colors.primary} />
                </View>
                <View style={styles.pdfInfo}>
                  <Text style={styles.pdfLabel}>Signed Membership Form</Text>
                  <Text style={styles.pdfHint}>Tap to view PDF</Text>
                </View>
                <ExternalLink size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </Card>
          )}

          {/* Account Information - Hidden for own profile */}
          {!isOwnProfile && (
            <Card style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Account Information</Text>

              <InfoRow
                icon={<Calendar size={20} color={colors.primary} />}
                label="Created"
                value={formatDate(member.createdAt)}
              />

              <InfoRow
                icon={<Calendar size={20} color={colors.primary} />}
                label="Last Updated"
                value={formatDate(member.updatedAt)}
              />
            </Card>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <View style={styles.actionsContainer}>
              <Button
                title={
                  member.isActive ? "Deactivate Member" : "Activate Member"
                }
                onPress={handleToggleActive}
                variant={member.isActive ? "secondary" : "primary"}
                loading={toggleActiveMutation.isPending}
                style={styles.actionButton}
              />
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
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

interface FlagItemProps {
  label: string;
  isActive?: boolean;
}

const FlagItem: React.FC<FlagItemProps> = ({ label, isActive }) => (
  <View style={[styles.flagItem, isActive && styles.flagItemActive]}>
    {isActive ? (
      <Check size={16} color={colors.success} />
    ) : (
      <X size={16} color={colors.textTertiary} />
    )}
    <Text style={[styles.flagText, isActive && styles.flagTextActive]}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  statusBarHack: {
    backgroundColor: colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    textAlign: "center",
  },
  // Header matching drawer style
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    minHeight: 56,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  profileCard: {
    margin: spacing.md,
    padding: spacing.lg,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.md,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInactive: {
    backgroundColor: colors.textTertiary,
  },
  avatarText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textInverse,
  },
  inactiveBadge: {
    position: "absolute",
    bottom: -4,
    alignSelf: "center",
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  inactiveText: {
    fontSize: typography.sizes.xs,
    color: colors.textInverse,
    fontWeight: typography.weights.medium,
  },
  name: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  crewcode: {
    fontSize: typography.sizes.base,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  roleContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary + "15",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  ruoloBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  ruoloText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textInverse,
  },
  sectionCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
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
  flagsContainer: {
    flexDirection: "row",
    gap: spacing.md,
  },
  flagItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  flagItemActive: {
    backgroundColor: colors.success + "15",
  },
  flagText: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  flagTextActive: {
    color: colors.success,
    fontWeight: typography.weights.medium,
  },
  noteText: {
    fontSize: typography.sizes.base,
    color: colors.text,
    lineHeight: 22,
  },
  actionsContainer: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    marginBottom: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  // PDF Section
  pdfCard: {
    backgroundColor: colors.primary + "08",
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pdfIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  pdfInfo: {
    flex: 1,
  },
  pdfLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  pdfHint: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
