import apiClient from "./client";
import { PayslipSettings } from "../payslip/types";

export const payslipSettingsApi = {
  get: async (): Promise<PayslipSettings | null> => {
    const res = await apiClient.get<PayslipSettings | null>(
      "/users/me/payslip-settings",
    );
    return res.data;
  },

  put: async (settings: PayslipSettings): Promise<PayslipSettings> => {
    const res = await apiClient.put<PayslipSettings>(
      "/users/me/payslip-settings",
      settings,
    );
    return res.data;
  },
};
