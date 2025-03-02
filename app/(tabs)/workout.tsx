import FontAwesome from "@expo/vector-icons/FontAwesome";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/config/firebase";

interface ExerciseData {
  name: string;
  sets: {
    reps: string;
    weight: string;
  }[];
}

export default function WorkoutScreen() {
  const [exercises, setExercises] = useState<ExerciseData[]>([
    { name: "ベンチプレス", sets: [{ reps: "", weight: "" }] },
  ]);
  const [workoutDate, setWorkoutDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [workoutNote, setWorkoutNote] = useState("");
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (userId) {
      fetchRecentWorkouts();
    }
  }, [userId]);

  const fetchRecentWorkouts = async () => {
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

      setRecentWorkouts(workouts);
    } catch (error) {
      console.error("Error fetching workouts:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const addExercise = () => {
    setExercises([
      ...exercises,
      { name: "", sets: [{ reps: "", weight: "" }] },
    ]);
  };

  const addSet = (exerciseIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.push({ reps: "", weight: "" });
    setExercises(updatedExercises);
  };

  const updateExerciseName = (text: string, index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[index].name = text;
    setExercises(updatedExercises);
  };

  const updateSetValue = (
    exerciseIndex: number,
    setIndex: number,
    field: "reps" | "weight",
    value: string
  ) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets[setIndex][field] = value;
    setExercises(updatedExercises);
  };

  const removeExercise = (index: number) => {
    const updatedExercises = [...exercises];
    updatedExercises.splice(index, 1);
    setExercises(updatedExercises);
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const updatedExercises = [...exercises];
    updatedExercises[exerciseIndex].sets.splice(setIndex, 1);
    setExercises(updatedExercises);
  };

  const saveWorkout = async () => {
    if (!userId) return;

    // バリデーション
    const isValid = exercises.every(
      (exercise) =>
        exercise.name.trim() !== "" &&
        exercise.sets.every((set) => set.reps.trim() !== "")
    );

    if (!isValid) {
      alert("すべての種目と回数を入力してください");
      return;
    }

    setIsLoading(true);
    try {
      // Firestoreにデータを保存
      const workoutData = {
        userId,
        date: workoutDate,
        exercises: exercises.map((ex) => ({
          name: ex.name,
          sets: ex.sets.map((set) => ({
            reps: parseInt(set.reps) || 0,
            weight: parseFloat(set.weight) || 0,
          })),
        })),
        note: workoutNote,
        createdAt: new Date(),
      };

      await addDoc(collection(db, "workouts"), workoutData);

      // 保存成功後、フォームをリセット
      setExercises([
        { name: "ベンチプレス", sets: [{ reps: "", weight: "" }] },
      ]);
      setWorkoutNote("");
      alert("トレーニングを記録しました！");

      // 最近のワークアウトを再取得
      fetchRecentWorkouts();
    } catch (error) {
      console.error("Error saving workout:", error);
      alert("エラーが発生しました。もう一度お試しください。");
    } finally {
      setIsLoading(false);
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>今日のトレーニングを記録</Text>
        <Text style={styles.dateText}>{formatDate(workoutDate)}</Text>

        {exercises.map((exercise, exerciseIndex) => (
          <View key={exerciseIndex} style={styles.exerciseContainer}>
            <View style={styles.exerciseHeader}>
              <TextInput
                style={styles.exerciseNameInput}
                placeholder="種目名"
                value={exercise.name}
                onChangeText={(text) => updateExerciseName(text, exerciseIndex)}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeExercise(exerciseIndex)}
              >
                <FontAwesome name="trash" size={16} color="#ff6b6b" />
              </TouchableOpacity>
            </View>

            <View style={styles.setHeaderContainer}>
              <Text style={styles.setHeaderText}>セット</Text>
              <Text style={styles.setHeaderText}>回数</Text>
              <Text style={styles.setHeaderText}>重量(kg)</Text>
              <Text style={styles.setHeaderText}></Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={setIndex} style={styles.setContainer}>
                <Text style={styles.setText}>{setIndex + 1}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="回数"
                  value={set.reps}
                  onChangeText={(text) =>
                    updateSetValue(exerciseIndex, setIndex, "reps", text)
                  }
                  keyboardType="number-pad"
                />
                <TextInput
                  style={styles.input}
                  placeholder="重量"
                  value={set.weight}
                  onChangeText={(text) =>
                    updateSetValue(exerciseIndex, setIndex, "weight", text)
                  }
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={
                    setIndex === 0 && exercise.sets.length === 1
                      ? styles.disabledButton
                      : styles.removeButton
                  }
                  onPress={() => removeSet(exerciseIndex, setIndex)}
                  disabled={setIndex === 0 && exercise.sets.length === 1}
                >
                  <FontAwesome
                    name="minus-circle"
                    size={16}
                    color={
                      setIndex === 0 && exercise.sets.length === 1
                        ? "#ccc"
                        : "#ff6b6b"
                    }
                  />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addSetButton}
              onPress={() => addSet(exerciseIndex)}
            >
              <Text style={styles.addSetButtonText}>セットを追加</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={addExercise}
        >
          <Text style={styles.addExerciseButtonText}>種目を追加</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.noteInput}
          placeholder="メモ（オプション）"
          value={workoutNote}
          onChangeText={setWorkoutNote}
          multiline
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveWorkout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>トレーニングを保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近のトレーニング</Text>

        {isLoadingHistory ? (
          <ActivityIndicator style={styles.loader} />
        ) : recentWorkouts.length > 0 ? (
          recentWorkouts.slice(0, 3).map((workout, index) => (
            <View key={index} style={styles.workoutHistoryItem}>
              <Text style={styles.workoutHistoryDate}>
                {formatDate(workout.date.toDate())}
              </Text>
              {workout.exercises.map((ex: any, i: number) => (
                <Text key={i} style={styles.workoutHistoryExercise}>
                  {ex.name}: {ex.sets.length}セット
                </Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>
            過去のトレーニング記録がありません
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  section: {
    padding: 16,
    marginBottom: 8,
    backgroundColor: "white",
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  dateText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  exerciseContainer: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exerciseNameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    paddingVertical: 6,
  },
  setHeaderContainer: {
    flexDirection: "row",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  setHeaderText: {
    flex: 1,
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  setContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  setText: {
    width: 30,
    textAlign: "center",
    fontSize: 14,
    color: "#333",
  },
  input: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    textAlign: "center",
  },
  removeButton: {
    padding: 8,
  },
  disabledButton: {
    padding: 8,
    opacity: 0.5,
  },
  addSetButton: {
    alignItems: "center",
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginTop: 4,
  },
  addSetButtonText: {
    fontSize: 12,
    color: "#666",
  },
  addExerciseButton: {
    backgroundColor: "#e6f7ff",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#b3e0ff",
  },
  addExerciseButtonText: {
    color: "#0099ff",
    fontWeight: "600",
  },
  noteInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    marginBottom: 16,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  loader: {
    marginVertical: 20,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#999",
  },
  workoutHistoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  workoutHistoryDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  workoutHistoryExercise: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
  },
});
