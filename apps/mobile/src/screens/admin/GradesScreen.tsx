import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Award, Trash2, Edit3 } from "lucide-react-native";

import { colors, spacing, typography, borderRadius } from "../../theme";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { gradesApi } from "../../api/grades";
import { RootStackParamList } from "../../navigation/types";
import { Grade, Ruolo } from "../../types";

type GradesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getRuoloLabel = (ruolo: Ruolo) => {
  switch (ruolo) {
    case Ruolo.PILOT:
      return "Pilot";
    case Ruolo.CABIN_CREW:
      return "Cabin Crew";
    default:
      return ruolo;
  }
};

const getRuoloColor = (ruolo: Ruolo) => {
  switch (ruolo) {
    case Ruolo.PILOT:
      return "#3b82f6";
    case Ruolo.CABIN_CREW:
      return "#8b5cf6";
    default:
      return colors.textSecondary;
  }
};

export const GradesScreen: React.FC = () => {
  const navigation = useNavigation<GradesScreenNavigationProp>();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: grades,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["grades"],
    queryFn: gradesApi.getGrades,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => gradesApi.deleteGrade(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grades"] });
      Alert.alert("Success", "Grade deleted successfully");
    },
    onError: (error: any) => {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to delete grade",
      );
    },
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleAdd = () => {
    navigation.navigate("GradeForm", {});
  };

  const handleEdit = (grade: Grade) => {
    navigation.navigate("GradeForm", { gradeId: grade.id });
  };

  const handleDelete = (grade: Grade) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${grade.codice} - ${grade.nome}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(grade.id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Grade }) => (
    <Card style={styles.itemCard}>
      <View style={styles.itemContent}>
        <View style={styles.itemIcon}>
          <Award size={24} color={colors.primary} />
        </View>
        <View style={styles.itemInfo}>
          <Text style={styles.itemCode}>{item.codice}</Text>
          <Text style={styles.itemName}>{item.nome}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRuoloColor(item.ruolo) + "20" },
            ]}
          >
            <Text
              style={[styles.roleText, { color: getRuoloColor(item.ruolo) }]}
            >
              {getRuoloLabel(item.ruolo)}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Edit3 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.wrapper}>
      <View style={[styles.statusBarHack, { height: insets.top }]} />
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={colors.textInverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Grades</Text>
          <TouchableOpacity
            onPress={handleAdd}
            style={styles.addButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={24} color={colors.textInverse} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <FlatList
          data={grades || []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Award size={64} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No grades found</Text>
              <Text style={styles.emptySubtext}>
                Tap the + button to add a new grade
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
};

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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  itemName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  roleText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  itemActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.sizes.base,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
