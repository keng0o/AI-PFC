import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/config/firebase";

// モチベーションメッセージのリスト
const motivationalMessages = [
  "今日の努力が明日の筋肉になる。",
  "結果は裏切らない。過程は苦しいが、成長は確実。",
  "痛みは一時的、諦めたときの後悔は永遠に続く。",
  "理想の体は言い訳ではなく、決断によって作られる。",
  "汗をかけば、それだけ成長する。限界を超えろ！",
  "小さな一歩の積み重ねが、大きな変化を生み出す。",
  "今日の自己ベストが、明日のウォームアップになる。",
  "トレーニングに言い訳は不要。やるかやらないか、それだけ。",
  "筋肉は裏切らない。あなたが努力した分だけ応えてくれる。",
  "強さとは、始める勇気と、諦めない意志。",
];

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [todaysMessage, setTodaysMessage] = useState("");
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [nextWorkoutSuggestion, setNextWorkoutSuggestion] = useState<any>(null);
  const [upcomingGoals, setUpcomingGoals] = useState<any[]>([]);
  const [latestSimulation, setLatestSimulation] = useState<any>(null);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    thisWeekWorkouts: 0,
    streakDays: 0,
  });

  const auth = getAuth();
  const router = useRouter();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    // ランダムなモチベーションメッセージを選択
    const randomIndex = Math.floor(Math.random() * motivationalMessages.length);
    setTodaysMessage(motivationalMessages[randomIndex]);

    if (userId) {
      setUserName(auth.currentUser?.displayName || "");
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchWorkouts(),
        fetchGoals(),
        fetchLatestSimulation(),
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkouts = async () => {
    if (!userId) return;

    try {
      const workoutsRef = collection(db, "workouts");
      const q = query(
        workoutsRef,
        where("userId", "==", userId),
        orderBy("date", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const workouts: any[] = [];
      querySnapshot.forEach((doc) => {
        workouts.push({ id: doc.id, ...doc.data() });
      });

      setRecentWorkouts(workouts);

      // 今週のワークアウト数をカウント
      const now = new Date();
      const startOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - now.getDay()
      );
      const thisWeekWorkouts = workouts.filter(
        (workout) => workout.date.toDate() >= startOfWeek
      ).length;

      // ストリークを計算（連続でトレーニングした日数）
      let streakDays = 0;
      const workoutDates = workouts.map((w) => {
        const date = w.date.toDate();
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      });

      // 重複する日付を削除（1日に複数のワークアウトがある場合）
      const uniqueDates = [...new Set(workoutDates)];
      uniqueDates.sort().reverse(); // 最新の日付順にソート

      // 連続した日のストリークを計算
      let prevDate: Date | null = null;
      for (let i = 0; i < uniqueDates.length; i++) {
        const currentDateStr = uniqueDates[i];
        const [year, month, day] = currentDateStr
          .split("-")
          .map((n) => parseInt(n));
        const currentDate = new Date(year, month, day);

        if (i === 0) {
          // 最初のワークアウト
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffTime = Math.abs(today.getTime() - currentDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 1) {
            // 今日または昨日のワークアウト
            streakDays = 1;
            prevDate = currentDate;
            continue;
          } else {
            break; // ストリーク終了
          }
        }

        if (prevDate) {
          const prevDay = prevDate.getDate();
          const currentDay = currentDate.getDate();

          if (prevDay - currentDay === 1) {
            // 連続した日
            streakDays++;
            prevDate = currentDate;
          } else {
            break; // ストリーク終了
          }
        }
      }

      // 次回のトレーニング提案
      if (workouts.length > 0) {
        // 前回のワークアウトと違う部位を提案
        const lastWorkout = workouts[0];
        let lastExercises = new Set();

        lastWorkout.exercises.forEach((ex: any) => {
          // 簡易的に種目から部位を推定
          let muscleGroup = "その他";

          if (ex.name.includes("ベンチ") || ex.name.includes("プッシュ")) {
            muscleGroup = "胸";
          } else if (
            ex.name.includes("スクワット") ||
            ex.name.includes("レッグ")
          ) {
            muscleGroup = "脚";
          } else if (ex.name.includes("デッド") || ex.name.includes("ロー")) {
            muscleGroup = "背中";
          } else if (ex.name.includes("カール") || ex.name.includes("アーム")) {
            muscleGroup = "腕";
          } else if (
            ex.name.includes("ショルダー") ||
            ex.name.includes("プレス")
          ) {
            muscleGroup = "肩";
          } else if (ex.name.includes("アブ") || ex.name.includes("クランチ")) {
            muscleGroup = "腹筋";
          }

          lastExercises.add(muscleGroup);
        });

        // トレーニング候補
        const muscleGroups = ["胸", "背中", "脚", "肩", "腕", "腹筋"];
        const suggestedGroups = muscleGroups.filter(
          (group) => !lastExercises.has(group)
        );

        if (suggestedGroups.length > 0) {
          // ランダムに提案
          const randomGroup =
            suggestedGroups[Math.floor(Math.random() * suggestedGroups.length)];

          let exercises: string[] = [];
          switch (randomGroup) {
            case "胸":
              exercises = ["ベンチプレス", "ダンベルフライ", "プッシュアップ"];
              break;
            case "背中":
              exercises = ["ラットプルダウン", "ローイング", "デッドリフト"];
              break;
            case "脚":
              exercises = [
                "スクワット",
                "レッグプレス",
                "レッグエクステンション",
              ];
              break;
            case "肩":
              exercises = [
                "ショルダープレス",
                "サイドレイズ",
                "フロントレイズ",
              ];
              break;
            case "腕":
              exercises = [
                "バイセップカール",
                "トライセップエクステンション",
                "ハンマーカール",
              ];
              break;
            case "腹筋":
              exercises = ["クランチ", "プランク", "レッグレイズ"];
              break;
          }

          setNextWorkoutSuggestion({
            muscleGroup: randomGroup,
            exercises,
          });
        }
      }

      setStats({
        totalWorkouts: workouts.length,
        thisWeekWorkouts,
        streakDays,
      });
    } catch (error) {
      console.error("Error fetching workouts:", error);
    }
  };

  const fetchGoals = async () => {
    if (!userId) return;

    try {
      const goalsRef = collection(db, "goals");
      const q = query(
        goalsRef,
        where("userId", "==", userId),
        where("completed", "==", false),
        orderBy("targetDate", "asc"),
        limit(3)
      );

      const querySnapshot = await getDocs(q);
      const goals: any[] = [];
      querySnapshot.forEach((doc) => {
        goals.push({ id: doc.id, ...doc.data() });
      });

      setUpcomingGoals(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const fetchLatestSimulation = async () => {
    if (!userId) return;

    try {
      const simulationsRef = collection(db, "simulations");
      const q = query(
        simulationsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        setLatestSimulation({ id: doc.id, ...doc.data() });
      }
    } catch (error) {
      console.error("Error fetching simulation:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const goToWorkout = () => {
    router.push("/(tabs)/workout");
  };

  const goToSimulation = () => {
    router.push("/(tabs)/simulation");
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          こんにちは、{userName || "トレーニーさん"}！
        </Text>
        <Text style={styles.motivationalMessage}>{todaysMessage}</Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.totalWorkouts}</Text>
          <Text style={styles.statLabel}>総トレーニング</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.thisWeekWorkouts}</Text>
          <Text style={styles.statLabel}>今週</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.streakDays}</Text>
          <Text style={styles.statLabel}>連続日数</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.startWorkoutButton} onPress={goToWorkout}>
        <FontAwesome name="heartbeat" size={18} color="white" />
        <Text style={styles.startWorkoutButtonText}>
          今日のトレーニングを記録
        </Text>
      </TouchableOpacity>

      {nextWorkoutSuggestion && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="lightbulb-o" size={20} color="#FFD700" />
            <Text style={styles.cardTitle}>次回のトレーニング提案</Text>
          </View>
          <Text style={styles.suggestionTitle}>
            {nextWorkoutSuggestion.muscleGroup}トレーニング
          </Text>
          <View style={styles.exercisesList}>
            {nextWorkoutSuggestion.exercises.map(
              (exercise: string, index: number) => (
                <View key={index} style={styles.exerciseItem}>
                  <FontAwesome name="check-circle" size={16} color="#4A90E2" />
                  <Text style={styles.exerciseName}>{exercise}</Text>
                </View>
              )
            )}
          </View>
          <TouchableOpacity
            style={styles.suggestionButton}
            onPress={goToWorkout}
          >
            <Text style={styles.suggestionButtonText}>
              このトレーニングをする
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {recentWorkouts.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="history" size={20} color="#4A90E2" />
            <Text style={styles.cardTitle}>最近のトレーニング</Text>
          </View>
          {recentWorkouts.slice(0, 3).map((workout, index) => (
            <View key={index} style={styles.workoutItem}>
              <Text style={styles.workoutDate}>
                {formatDate(workout.date.toDate())}
              </Text>
              <View style={styles.workoutExercises}>
                {workout.exercises.map((exercise: any, exIndex: number) => (
                  <Text key={exIndex} style={styles.workoutExercise}>
                    • {exercise.name} ({exercise.sets.length}セット)
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {upcomingGoals.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="flag" size={20} color="#FF6B6B" />
            <Text style={styles.cardTitle}>設定中の目標</Text>
          </View>
          {upcomingGoals.map((goal, index) => (
            <View key={index} style={styles.goalItem}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              {goal.targetValue && (
                <View style={styles.goalProgress}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(
                            100,
                            (goal.currentValue / goal.targetValue) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {goal.currentValue} / {goal.targetValue}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {latestSimulation && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome name="child" size={20} color="#4A90E2" />
            <Text style={styles.cardTitle}>未来の体型シミュレーション</Text>
          </View>
          <TouchableOpacity
            style={styles.simulationPreview}
            onPress={goToSimulation}
          >
            <View style={styles.simulationImageContainer}>
              {latestSimulation.imageUrl ? (
                <Image
                  source={{ uri: latestSimulation.imageUrl }}
                  style={styles.simulationImage}
                />
              ) : (
                <View style={styles.simulationPlaceholder}>
                  <FontAwesome name="image" size={30} color="#ddd" />
                </View>
              )}
            </View>
            <Text style={styles.simulationDate}>
              最終シミュレーション:{" "}
              {formatDate(latestSimulation.createdAt.toDate())}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  motivationalMessage: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginTop: 4,
    marginBottom: 16,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4A90E2",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  startWorkoutButton: {
    flexDirection: "row",
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  startWorkoutButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333",
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  exercisesList: {
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  exerciseName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#444",
  },
  suggestionButton: {
    backgroundColor: "#e6f7ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#b3e0ff",
  },
  suggestionButtonText: {
    color: "#0099ff",
    fontWeight: "600",
  },
  workoutItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 12,
    marginBottom: 12,
  },
  workoutDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
  },
  workoutExercises: {
    marginLeft: 8,
  },
  workoutExercise: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  goalItem: {
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  goalProgress: {
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A90E2",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },
  simulationPreview: {
    alignItems: "center",
  },
  simulationImageContainer: {
    width: 200,
    height: 160,
    marginBottom: 8,
  },
  simulationImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  simulationPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  simulationDate: {
    fontSize: 12,
    color: "#666",
  },
});
