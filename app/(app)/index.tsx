import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Button from "../../src/components/common/Button";
import { useAuth } from "../../src/hooks/useAuth";

export default function Home() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    // 時間に応じた挨拶を設定
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("おはようございます");
    } else if (hour < 18) {
      setGreeting("こんにちは");
    } else {
      setGreeting("こんばんは");
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {greeting}、{user?.displayName || "ユーザー"}さん！
        </Text>
        <Text style={styles.subtitle}>今日も頑張りましょう！</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>目標の進捗状況</Text>
        <Button
          title="詳細を見る"
          onPress={() => router.push("/progress")}
          type="outline"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginTop: 4,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  trainingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  trainingDate: {
    color: "#555",
  },
  trainingName: {
    fontWeight: "500",
  },
});
