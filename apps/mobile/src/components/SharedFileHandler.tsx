import React, { useEffect } from "react";
import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSharedFile } from "../hooks/useSharedFile";
import { useAuthStore } from "../store/authStore";
import { UserRole } from "../types";
import { RootStackParamList } from "../navigation/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SharedFileHandler: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { sharedFile, clearSharedFile } = useSharedFile();
  const user = useAuthStore((state) => state.user);

  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERADMIN;

  useEffect(() => {
    if (!sharedFile) return;

    if (!isAdmin) {
      Alert.alert(
        "Access Denied",
        "Only administrators can process registration forms.",
        [{ text: "OK", onPress: clearSharedFile }],
      );
      return;
    }

    clearSharedFile();
    navigation.navigate("MemberCreate", { sharedPdfUri: sharedFile.uri });
  }, [sharedFile, isAdmin]);

  return null;
};
