import React, { forwardRef, useState } from "react";
import { TextInput, TouchableOpacity } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { Input } from "./Input";
import { colors } from "../theme";

type InputProps = React.ComponentProps<typeof Input>;

interface PasswordInputProps extends Omit<
  InputProps,
  "secureTextEntry" | "rightIcon"
> {}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  (props, ref) => {
    const [visible, setVisible] = useState(false);

    const toggle = () => setVisible((v) => !v);

    const eyeIcon = (
      <TouchableOpacity
        onPress={toggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {visible ? (
          <EyeOff size={20} color={colors.textTertiary} />
        ) : (
          <Eye size={20} color={colors.textTertiary} />
        )}
      </TouchableOpacity>
    );

    return (
      <Input
        ref={ref}
        secureTextEntry={!visible}
        rightIcon={eyeIcon}
        {...props}
      />
    );
  },
);

export default PasswordInput;
