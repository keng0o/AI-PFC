import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { colors } from "../../constants/colors";

type ButtonProps = {
  title: string;
  onPress: () => void;
  type?: "primary" | "outline" | "secondary";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  type = "primary",
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.button,
    type === "outline" && styles.outlineButton,
    type === "secondary" && styles.secondaryButton,
    disabled && styles.disabledButton,
    style,
  ];

  const textStyles = [
    styles.text,
    type === "outline" && styles.outlineText,
    type === "secondary" && styles.secondaryText,
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={type === "outline" ? colors.primary : "white"}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 8,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondary,
  },
  disabledButton: {
    backgroundColor: colors.lightGray,
    borderColor: colors.lightGray,
  },
  text: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  outlineText: {
    color: colors.primary,
  },
  secondaryText: {
    color: "white",
  },
  disabledText: {
    color: colors.gray,
  },
});

export default Button;
