import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/config/firebase";

// 簡易的なグラフコンポーネント
const BarGraph = ({
  data,
  maxValue,
  label,
  color = "#4A90E2",
}: {
  data: number[];
  maxValue: number;
  label: string;
  color?: string;
}) => {
  return (
    <View style={styles.graphContainer}>
      <Text style={styles.graphLabel}>{label}</Text>
      <View style={styles.graphBars}>
        {data.map((value, index) => (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    height: `${Math.min(100, (value / maxValue) * 100)}%`,
                    backgroundColor: color,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{index + 1}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export default function ProgressScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [workoutStats, setWorkoutStats] = useState<any>({
    weeklyCount: Array(4).fill(0),
    totalSets: 0,
    averageReps: 0,
    topExercises: [],
    progress: {},
  });
  const [bodyStats, setBodyStats] = useState<any>({
    weight: [],
    bodyFat: [],
    dates: [],
  });
  const [goals, setGoals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"workout" | "body" | "goals">(
    "workout"
  );

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // ワークアウトデータの取得
      await fetchWorkoutData();

      // 体組成データの取得
      await fetchBodyStats();

      // 目標データの取得
      await fetchGoals();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWorkoutData = async () => {
    if (!userId) return;

    try {
      const workoutsRef = collection(db, "workouts");
      const q = query(
        workoutsRef,
        where("userId", "==", userId),
        orderBy("date", "desc")
      );

      const querySnapshot = await getDocs(q);
      const workouts: any[] = [];
      querySnapshot.forEach((doc) => {
        workouts.push({ id: doc.id, ...doc.data() });
      });

      // 週ごとのワークアウト回数を計算
      const now = new Date();
      const weeklyCount = [0, 0, 0, 0]; // 直近4週間

      workouts.forEach((workout) => {
        const workoutDate = workout.date.toDate();
        const weekDiff = Math.floor(
          (now.getTime() - workoutDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );

        if (weekDiff >= 0 && weekDiff < 4) {
          weeklyCount[weekDiff]++;
        }
      });

      // 週ごとのワークアウト回数を逆順に（一番古い週を左に）
      weeklyCount.reverse();

      // トレーニング種目ごとの合計セット数と回数
      const exerciseStats: { [key: string]: { sets: number; reps: number } } =
        {};
      let totalSets = 0;
      let totalReps = 0;

      workouts.forEach((workout) => {
        workout.exercises.forEach((exercise: any) => {
          if (!exerciseStats[exercise.name]) {
            exerciseStats[exercise.name] = { sets: 0, reps: 0 };
          }

          exercise.sets.forEach((set: any) => {
            exerciseStats[exercise.name].sets++;
            exerciseStats[exercise.name].reps += set.reps;
            totalSets++;
            totalReps += set.reps;
          });
        });
      });

      // 種目別の進捗（最大重量の推移）
      const exerciseProgress: {
        [key: string]: { dates: Date[]; weights: number[] };
      } = {};

      // 代表的な種目のみ追跡
      const keyExercises = ["ベンチプレス", "スクワット", "デッドリフト"];

      keyExercises.forEach((exerciseName) => {
        exerciseProgress[exerciseName] = { dates: [], weights: [] };
      });

      // 各ワークアウトから最大重量を抽出
      workouts.forEach((workout) => {
        const workoutDate = workout.date.toDate();

        workout.exercises.forEach((exercise: any) => {
          if (keyExercises.includes(exercise.name)) {
            // その種目の最大重量を取得
            const maxWeight = Math.max(
              ...exercise.sets.map((set: any) => set.weight || 0)
            );

            if (maxWeight > 0) {
              exerciseProgress[exercise.name].dates.push(workoutDate);
              exerciseProgress[exercise.name].weights.push(maxWeight);
            }
          }
        });
      });

      // 各種目の日付順にソート
      keyExercises.forEach((exerciseName) => {
        const combined = exerciseProgress[exerciseName].dates.map((date, i) => {
          return { date, weight: exerciseProgress[exerciseName].weights[i] };
        });

        combined.sort((a, b) => a.date.getTime() - b.date.getTime());

        exerciseProgress[exerciseName].dates = combined.map(
          (item) => item.date
        );
        exerciseProgress[exerciseName].weights = combined.map(
          (item) => item.weight
        );
      });

      // トップ種目を抽出
      const topExercises = Object.entries(exerciseStats)
        .sort(([, a], [, b]) => b.sets - a.sets)
        .slice(0, 3)
        .map(([name, stats]) => ({
          name,
          sets: stats.sets,
          reps: stats.reps,
          avgReps: Math.round(stats.reps / stats.sets),
        }));

      setWorkoutStats({
        weeklyCount,
        totalSets,
        averageReps: totalSets > 0 ? Math.round(totalReps / totalSets) : 0,
        topExercises,
        progress: exerciseProgress,
      });
    } catch (error) {
      console.error("Error fetching workout data:", error);
    }
  };

  const fetchBodyStats = async () => {
    if (!userId) return;

    try {
      const measurementsRef = collection(db, "bodyMeasurements");
      const q = query(
        measurementsRef,
        where("userId", "==", userId),
        orderBy("date", "asc")
      );

      const querySnapshot = await getDocs(q);
      const measurements: any[] = [];
      querySnapshot.forEach((doc) => {
        measurements.push({ id: doc.id, ...doc.data() });
      });

      const weight: number[] = [];
      const bodyFat: number[] = [];
      const dates: Date[] = [];

      measurements.forEach((measurement) => {
        if (measurement.weight) weight.push(measurement.weight);
        if (measurement.bodyFatPercentage)
          bodyFat.push(measurement.bodyFatPercentage);
        dates.push(measurement.date.toDate());
      });

      setBodyStats({
        weight,
        bodyFat,
        dates,
      });
    } catch (error) {
      console.error("Error fetching body stats:", error);
    }
  };

  const fetchGoals = async () => {
    if (!userId) return;

    try {
      const goalsRef = collection(db, "goals");
      const q = query(
        goalsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const goalsData: any[] = [];
      querySnapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() });
      });

      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  const renderWorkoutTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>週間トレーニング回数</Text>
          <Text style={styles.cardSubtitle}>過去4週間の記録</Text>

          <BarGraph
            data={workoutStats.weeklyCount}
            maxValue={Math.max(...workoutStats.weeklyCount, 3)}
            label="トレーニング回数"
          />

          <View style={styles.axisLabels}>
            <Text style={styles.axisLabel}>4週前</Text>
            <Text style={styles.axisLabel}>3週前</Text>
            <Text style={styles.axisLabel}>2週前</Text>
            <Text style={styles.axisLabel}>先週</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>トレーニング概要</Text>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workoutStats.totalSets}</Text>
              <Text style={styles.statLabel}>総セット数</Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workoutStats.averageReps}</Text>
              <Text style={styles.statLabel}>平均レップ数</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>よく行う種目</Text>

          {workoutStats.topExercises.map((exercise: any, index: number) => (
            <View key={index} style={styles.exerciseItem}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <View style={styles.exerciseStats}>
                <Text style={styles.exerciseStat}>{exercise.sets} セット</Text>
                <Text style={styles.exerciseStat}>
                  平均 {exercise.avgReps} 回
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderBodyTab = () => {
    return (
      <View style={styles.tabContent}>
        {bodyStats.weight.length > 0 ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>体重の推移</Text>

              <View style={styles.lineChart}>
                {/* 簡易的な折れ線グラフ */}
                <View style={styles.chartContainer}>
                  {bodyStats.weight.map((weight, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dataPoint,
                        {
                          bottom: `${
                            ((weight - Math.min(...bodyStats.weight)) /
                              (Math.max(...bodyStats.weight) -
                                Math.min(...bodyStats.weight))) *
                            80
                          }%`,
                          left: `${
                            (index / (bodyStats.weight.length - 1)) * 90
                          }%`,
                        },
                      ]}
                    >
                      <Text style={styles.dataValue}>{weight}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.dateLabels}>
                  {bodyStats.dates.map(
                    (date, index) =>
                      (index === 0 ||
                        index === bodyStats.dates.length - 1 ||
                        index === Math.floor(bodyStats.dates.length / 2)) && (
                        <Text
                          key={index}
                          style={[
                            styles.dateLabel,
                            {
                              left: `${
                                (index / (bodyStats.dates.length - 1)) * 90
                              }%`,
                            },
                          ]}
                        >
                          {formatDate(date)}
                        </Text>
                      )
                  )}
                </View>
              </View>
            </View>

            {bodyStats.bodyFat.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>体脂肪率の推移</Text>

                <View style={styles.lineChart}>
                  {/* 簡易的な折れ線グラフ */}
                  <View style={styles.chartContainer}>
                    {bodyStats.bodyFat.map((fat, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dataPoint,
                          {
                            bottom: `${
                              ((fat - Math.min(...bodyStats.bodyFat)) /
                                (Math.max(...bodyStats.bodyFat) -
                                  Math.min(...bodyStats.bodyFat))) *
                              80
                            }%`,
                            left: `${
                              (index / (bodyStats.bodyFat.length - 1)) * 90
                            }%`,
                            backgroundColor: "#FF6B6B",
                          },
                        ]}
                      >
                        <Text style={styles.dataValue}>{fat}%</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.dateLabels}>
                    {bodyStats.dates.map(
                      (date, index) =>
                        (index === 0 ||
                          index === bodyStats.dates.length - 1 ||
                          index === Math.floor(bodyStats.dates.length / 2)) && (
                          <Text
                            key={index}
                            style={[
                              styles.dateLabel,
                              {
                                left: `${
                                  (index / (bodyStats.dates.length - 1)) * 90
                                }%`,
                              },
                            ]}
                          >
                            {formatDate(date)}
                          </Text>
                        )
                    )}
                  </View>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome name="line-chart" size={50} color="#ddd" />
            <Text style={styles.emptyStateText}>
              体重や体脂肪率のデータがありません。
              プロフィール画面から測定値を記録しましょう。
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderGoalsTab = () => {
    return (
      <View style={styles.tabContent}>
        {goals.length > 0 ? (
          goals.map((goal, index) => (
            <View key={index} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <View
                  style={[
                    styles.goalStatus,
                    goal.completed ? styles.goalCompleted : {},
                  ]}
                >
                  <Text style={styles.goalStatusText}>
                    {goal.completed ? "達成" : "進行中"}
                  </Text>
                </View>
              </View>

              {goal.description && (
                <Text style={styles.goalDescription}>{goal.description}</Text>
              )}

              {goal.targetValue !== undefined && (
                <View style={styles.goalProgress}>
                  <View style={styles.goalProgressBar}>
                    <View
                      style={[
                        styles.goalProgressFill,
                        {
                          width: `${Math.min(
                            100,
                            (goal.currentValue / goal.targetValue) * 100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.goalProgressLabels}>
                    <Text style={styles.goalProgressLabel}>
                      {goal.currentValue} / {goal.targetValue}{" "}
                      {goal.category === "weight" ? "kg" : ""}
                    </Text>
                    <Text style={styles.goalProgressPercent}>
                      {Math.round((goal.currentValue / goal.targetValue) * 100)}
                      %
                    </Text>
                  </View>
                </View>
              )}

              {goal.targetDate && (
                <Text style={styles.goalDate}>
                  目標日:{" "}
                  {new Date(goal.targetDate.seconds * 1000).toLocaleDateString(
                    "ja-JP"
                  )}
                </Text>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome name="flag" size={50} color="#ddd" />
            <Text style={styles.emptyStateText}>
              設定された目標がありません。
              新しい目標を設定して、モチベーションを高めましょう。
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "workout" && styles.activeTab]}
          onPress={() => setActiveTab("workout")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "workout" && styles.activeTabText,
            ]}
          >
            トレーニング
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "body" && styles.activeTab]}
          onPress={() => setActiveTab("body")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "body" && styles.activeTabText,
            ]}
          >
            体組成
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "goals" && styles.activeTab]}
          onPress={() => setActiveTab("goals")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "goals" && styles.activeTabText,
            ]}
          >
            目標
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>データを読み込み中...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          {activeTab === "workout" && renderWorkoutTab()}
          {activeTab === "body" && renderBodyTab()}
          {activeTab === "goals" && renderGoalsTab()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4A90E2",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 12,
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
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  graphContainer: {
    height: 160,
    marginBottom: 8,
  },
  graphLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  graphBars: {
    flexDirection: "row",
    height: 120,
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  barContainer: {
    alignItems: "center",
    width: 40,
  },
  barWrapper: {
    height: 100,
    width: 30,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  axisLabels: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 4,
  },
  axisLabel: {
    fontSize: 10,
    color: "#999",
    width: 40,
    textAlign: "center",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 8,
  },
  statItem: {
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
  exerciseItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  exerciseStats: {
    flexDirection: "row",
  },
  exerciseStat: {
    fontSize: 12,
    color: "#666",
    marginRight: 12,
  },
  lineChart: {
    height: 180,
    marginVertical: 16,
  },
  chartContainer: {
    height: 150,
    position: "relative",
    marginBottom: 30,
  },
  dataPoint: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
  },
  dataValue: {
    position: "absolute",
    top: -20,
    fontSize: 10,
    color: "#666",
    width: 30,
    textAlign: "center",
  },
  dateLabels: {
    flexDirection: "row",
    position: "relative",
    height: 20,
  },
  dateLabel: {
    position: "absolute",
    fontSize: 10,
    color: "#999",
    width: 60,
    textAlign: "center",
    marginLeft: -30,
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 30,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  goalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  goalStatus: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  goalCompleted: {
    backgroundColor: "#d4edda",
  },
  goalStatusText: {
    fontSize: 12,
    color: "#666",
  },
  goalDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  goalProgress: {
    marginVertical: 12,
  },
  goalProgressBar: {
    height: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 4,
  },
  goalProgressFill: {
    height: "100%",
    backgroundColor: "#4A90E2",
    borderRadius: 5,
  },
  goalProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  goalProgressLabel: {
    fontSize: 12,
    color: "#666",
  },
  goalProgressPercent: {
    fontSize: 12,
    color: "#4A90E2",
    fontWeight: "bold",
  },
  goalDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
});
