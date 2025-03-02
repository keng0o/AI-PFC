import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import React from "react";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          height: 60,
          paddingBottom: 10,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "ホーム",
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
          headerTitle: "AIトレーニングパートナー",
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: "トレーニング",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="heartbeat" color={color} />
          ),
          headerTitle: "トレーニング記録",
        }}
      />
      <Tabs.Screen
        name="simulation"
        options={{
          title: "体型予測",
          tabBarIcon: ({ color }) => <TabBarIcon name="child" color={color} />,
          headerTitle: "未来の体型シミュレーション",
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: "進捗",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="line-chart" color={color} />
          ),
          headerTitle: "進捗状況",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "プロフィール",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerTitle: "ユーザープロフィール",
        }}
      />
    </Tabs>
  );
}
