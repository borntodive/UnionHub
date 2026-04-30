import {
  NavigationContainerRef,
  CommonActions,
} from "@react-navigation/native";
import { RootStackParamList } from "./types";

export const navigationRef =
  React.createRef<NavigationContainerRef<RootStackParamList>>();

export const navigate = (name: string, params?: any) => {
  if (navigationRef.current) {
    navigationRef.current.navigate(name as any, params);
  }
};

export const navigateBack = () => {
  if (navigationRef.current) {
    navigationRef.current.goBack();
  }
};

export const resetRoot = (state?: Parameters<CommonActions.ResetAction>[0]) => {
  if (navigationRef.current) {
    navigationRef.current.resetRoot(state);
  }
};

import React from "react";
