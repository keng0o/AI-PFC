// ユーザー情報の型
export type User = {
  id: string;
  email: string;
  displayName: string;
  age?: number;
  gender?: "male" | "female" | "other";
  height?: number;
  weight?: number;
  createdAt: Date;
  updatedAt: Date;
  photoURL?: string;
};

// トレーニング種目の型
export type Exercise = {
  id: string;
  name: string;
  category:
    | "chest"
    | "back"
    | "legs"
    | "shoulders"
    | "arms"
    | "abs"
    | "cardio"
    | "other";
  muscleGroups: string[];
  description?: string;
};

// トレーニングセットの型
export type ExerciseSet = {
  id: string;
  exerciseId: string;
  reps: number;
  weight?: number;
  duration?: number; // 秒単位
  completed: boolean;
};

// トレーニングセッションの型
export type WorkoutSession = {
  id: string;
  userId: string;
  date: Date;
  title?: string;
  note?: string;
  duration?: number; // 秒単位
  feeling?: "very_bad" | "bad" | "neutral" | "good" | "very_good";
  sets: ExerciseSet[];
  createdAt: Date;
  updatedAt: Date;
};

// 体の測定データの型
export type BodyMeasurement = {
  id: string;
  userId: string;
  date: Date;
  weight?: number;
  bodyFatPercentage?: number;
  musclePercentage?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

// 筋肉シミュレーション結果の型
export type MuscleSimulation = {
  id: string;
  userId: string;
  date: Date;
  imageUrl: string;
  muscleGrowth: {
    [key: string]: number; // 部位ごとの成長度合い（0-100）
  };
  createdAt: Date;
};

// 目標の型
export type Goal = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetDate?: Date;
  category: "strength" | "muscle_gain" | "weight" | "habit" | "other";
  targetValue?: number;
  currentValue?: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
};
