import React from "react";
import { useTranslation } from "react-i18next";
import { TimeInput } from "../../../components/TimeInput";

interface SbhInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * SbhInput - Scheduled Block Hours input for Payslip Calculator.
 * Wraps TimeInput with maxHours=150 (typical flight hour limits).
 */
export const SbhInput: React.FC<SbhInputProps> = ({ value, onChange }) => {
  const { t } = useTranslation();

  return (
    <TimeInput
      label={t("payslip.scheduledBlockHours")}
      value={value}
      onChange={onChange}
      placeholder="--:--"
      maxHours={150}
    />
  );
};
