import { Tabs } from "expo-router";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { colors } from "../../src/constants/colors";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: "トレーニング",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="fitness-center" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "進捗",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="line-chart" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="simulation"
        options={{
          title: "シミュレーション",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="image" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "プロフィール",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
