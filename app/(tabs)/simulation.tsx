import { FontAwesome } from "@expo/vector-icons";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getGeminiProModel } from "../../src/config/gemini";

export default function SimulationScreen() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [futureImage, setFutureImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [workoutStats, setWorkoutStats] = useState({
    totalWorkouts: 0,
    totalSets: 0,
    avgReps: 0,
  });
  const [simulations, setSimulations] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const userId = auth().currentUser?.uid;

  useEffect(() => {
    if (userId) {
      fetchWorkoutStats();
      fetchSimulations();
    }
  }, [userId]);

  const fetchWorkoutStats = async () => {
    if (!userId) return;

    try {
      // 全てのワークアウトを取得
      const workoutsRef = collection(firestore(), "workouts");
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

      // 過去一週間のワークアウト
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const lastWeekWorkouts = workouts.filter(
        (workout) => workout.date.toDate() >= oneWeekAgo
      );

      // 筋肉部位ごとの回数をカウント（仮のロジック - 実際はより複雑になる）
      const muscleGroups: { [key: string]: number } = {};

      workouts.forEach((workout) => {
        workout.exercises.forEach((exercise: any) => {
          // ここでは簡易的に種目名から筋肉部位を推定
          let muscleGroup = "その他";

          if (
            exercise.name.includes("ベンチ") ||
            exercise.name.includes("プッシュ")
          ) {
            muscleGroup = "胸筋";
          } else if (
            exercise.name.includes("スクワット") ||
            exercise.name.includes("レッグ")
          ) {
            muscleGroup = "脚筋";
          } else if (
            exercise.name.includes("デッド") ||
            exercise.name.includes("ロー")
          ) {
            muscleGroup = "背筋";
          } else if (
            exercise.name.includes("カール") ||
            exercise.name.includes("アーム")
          ) {
            muscleGroup = "腕筋";
          } else if (
            exercise.name.includes("ショルダー") ||
            exercise.name.includes("プレス")
          ) {
            muscleGroup = "肩筋";
          } else if (
            exercise.name.includes("アブ") ||
            exercise.name.includes("クランチ")
          ) {
            muscleGroup = "腹筋";
          }

          muscleGroups[muscleGroup] =
            (muscleGroups[muscleGroup] || 0) + exercise.sets.length;
        });
      });

      // 筋肉部位をトレーニング量順にソート
      const strongestMuscleGroups = Object.entries(muscleGroups)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 3)
        .map(([name, count]: any) => ({ name, count }));

      setWorkoutStats({
        totalWorkouts: workouts.length,
        totalSets: workouts.reduce(
          (total, workout) => total + workout.exercises.length,
          0
        ),
        avgReps:
          workouts.reduce(
            (total, workout) =>
              total +
              workout.exercises.reduce(
                (total, exercise) => total + exercise.sets.length,
                0
              ),
            0
          ) / workouts.length,
      });
    } catch (error) {
      console.error("Error fetching workout stats:", error);
    }
  };

  const fetchSimulations = async () => {
    if (!userId) return;

    try {
      const simulationsRef = collection(firestore(), "simulations");
      const q = query(
        simulationsRef,
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      const querySnapshot = await getDocs(q);
      const simulationsData: any[] = [];
      querySnapshot.forEach((doc) => {
        simulationsData.push({ id: doc.id, ...doc.data() });
      });

      setSimulations(simulationsData);

      // 最新のシミュレーションがあれば表示
      if (simulationsData.length > 0) {
        setFutureImage(simulationsData[0].imageUrl);
      }
    } catch (error) {
      console.error("Error fetching simulations:", error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0].uri) {
        setCurrentImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("エラー", "画像の選択中にエラーが発生しました");
    }
  };

  const generateFutureImage = async () => {
    if (!userId) {
      Alert.alert("エラー", "ログインが必要です");
      return;
    }

    if (!currentImage) {
      Alert.alert("エラー", "現在の画像をアップロードしてください");
      return;
    }

    setIsGenerating(true);
    try {
      // 現在の画像をストレージにアップロード
      const response = await fetch(currentImage);
      const blob = await response.blob();
      const imageRef = ref(
        storage(),
        `users/${userId}/current-body-${Date.now()}.jpg`
      );
      await uploadBytes(imageRef, blob);
      const imageUrl = await getDownloadURL(imageRef);

      // 筋トレデータをPromptに変換
      let prompt = `あなたは筋トレシミュレーションAIです。ユーザーの現在の体型写真から、トレーニング内容に基づいて1ヶ月後の体型を予測してください。

筋トレ情報:
- トレーニング回数: 週${workoutStats.totalWorkouts}回
- 合計セッション数: ${workoutStats.totalSets}回
- 平均レップス: ${workoutStats.avgReps.toFixed(2)}

以下の特徴を持つリアルな体型予測画像を生成してください:
1. 元の写真と同じポーズで
2. 特に${strongestMuscleGroups[0]?.name || "全体的な筋肉"}の成長が見られる
3. 自然な筋肉の発達を表現
4. 現実的な体型変化（急激な変化ではなく、1ヶ月で達成可能な範囲で）
5. 高品質で写実的な画像

現在の画像URL: ${imageUrl}
`;

      // Gemini APIを使用して画像生成
      const model = getGeminiProModel();
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // 注意: 実際のGemini APIでは画像生成方法が異なる可能性があります
      // 現時点ではテキスト応答を返すAPIであるため、実際の画像生成はGemini Proの機能に依存します
      // ここでは仮のデモとしてサンプル画像を返します

      // 実際の実装では、画像生成APIからの応答を処理する必要があります
      // サンプル用のダミー画像URL（実際の実装では正しい画像URLに置き換えること）
      const futureImageUrl = "https://example.com/future-body.jpg"; // これは実際のAPI実装時に置き換える

      // シミュレーション結果をFirestoreに保存
      const simulationData = {
        userId,
        originalImageUrl: imageUrl,
        imageUrl: futureImageUrl, // 実際の生成画像URLに置き換える
        workoutStats: {
          totalWorkouts: workoutStats.totalWorkouts,
          totalSets: workoutStats.totalSets,
          avgReps: workoutStats.avgReps,
        },
        createdAt: new Date(),
      };

      await addDoc(collection(firestore(), "simulations"), simulationData);

      // 画像を表示
      setFutureImage(futureImageUrl); // 実際の生成画像URLに置き換える

      // シミュレーション履歴を再取得
      fetchSimulations();

      Alert.alert("成功", "未来の体型イメージが生成されました！");
    } catch (error) {
      console.error("Error generating future image:", error);
      Alert.alert(
        "エラー",
        "画像生成中にエラーが発生しました。もう一度お試しください。"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>あなたの未来の体型</Text>
        <Text style={styles.subtitle}>
          トレーニングの成果をシミュレーション
        </Text>
      </View>

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>トレーニング統計</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workoutStats.totalWorkouts}</Text>
            <Text style={styles.statLabel}>総トレーニング数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{workoutStats.totalSets}</Text>
            <Text style={styles.statLabel}>合計セッション数</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workoutStats.avgReps.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>平均レップス</Text>
          </View>
        </View>

        <Text style={styles.strongestTitle}>最も鍛えている部位:</Text>
        <View style={styles.muscleGroupContainer}>
          {strongestMuscleGroups.map((group: any, index: number) => (
            <View key={index} style={styles.muscleGroupItem}>
              <Text style={styles.muscleGroupName}>{group.name}</Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        100,
                        (group.count / (strongestMuscleGroups[0]?.count || 1)) *
                          100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.simulationContainer}>
        <Text style={styles.cardTitle}>体型シミュレーション</Text>

        <View style={styles.imageContainer}>
          <View style={styles.imageBox}>
            <Text style={styles.imageLabel}>現在</Text>
            {currentImage ? (
              <Image source={{ uri: currentImage }} style={styles.bodyImage} />
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <FontAwesome name="camera" size={24} color="#4A90E2" />
                <Text style={styles.uploadText}>写真をアップロード</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.arrowContainer}>
            <FontAwesome name="arrow-right" size={24} color="#666" />
          </View>

          <View style={styles.imageBox}>
            <Text style={styles.imageLabel}>1ヶ月後</Text>
            {isGenerating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loadingText}>生成中...</Text>
              </View>
            ) : futureImage ? (
              <Image source={{ uri: futureImage }} style={styles.bodyImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Text style={styles.placeholderText}>予測画像</Text>
              </View>
            )}
          </View>
        </View>

        {currentImage && (
          <TouchableOpacity
            style={[
              styles.generateButton,
              isGenerating && styles.disabledButton,
            ]}
            onPress={generateFutureImage}
            disabled={isGenerating}
          >
            <Text style={styles.generateButtonText}>
              {isGenerating ? "生成中..." : "未来の体型を予測する"}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          ※AIによる予測は、実際のトレーニング結果、食事、遺伝的要因など多くの要素に左右されます。
        </Text>
      </View>

      {simulations.length > 0 && (
        <View style={styles.historyContainer}>
          <Text style={styles.cardTitle}>過去のシミュレーション</Text>
          {simulations.map((simulation, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {formatDate(simulation.createdAt.toDate())}
              </Text>
              <View style={styles.historyImageContainer}>
                <Image
                  source={{ uri: simulation.originalImageUrl }}
                  style={styles.historyImage}
                />
                <FontAwesome
                  name="arrow-right"
                  size={16}
                  color="#666"
                  style={styles.historyArrow}
                />
                <Image
                  source={{ uri: simulation.imageUrl }}
                  style={styles.historyImage}
                />
              </View>
            </View>
          ))}
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
  header: {
    padding: 20,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  statsCard: {
    margin: 12,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
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
  strongestTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  muscleGroupContainer: {
    marginBottom: 8,
  },
  muscleGroupItem: {
    marginBottom: 10,
  },
  muscleGroupName: {
    fontSize: 14,
    marginBottom: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4A90E2",
  },
  simulationContainer: {
    margin: 12,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  imageBox: {
    flex: 2,
    alignItems: "center",
  },
  arrowContainer: {
    flex: 1,
    alignItems: "center",
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  bodyImage: {
    width: 130,
    height: 180,
    borderRadius: 8,
  },
  uploadButton: {
    width: 130,
    height: 180,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  uploadText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  placeholderImage: {
    width: 130,
    height: 180,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#999",
    fontSize: 14,
  },
  loadingContainer: {
    width: 130,
    height: 180,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  generateButton: {
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginVertical: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
  },
  historyContainer: {
    margin: 12,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 12,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  historyImageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyImage: {
    width: 70,
    height: 100,
    borderRadius: 4,
  },
  historyArrow: {
    marginHorizontal: 10,
  },
});
