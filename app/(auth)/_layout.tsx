import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: "ログイン",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "新規登録",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          title: "パスワードリセット",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
