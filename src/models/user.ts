// ユーザープロファイル情報の型
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

// ユーザーの詳細プロファイル情報
export interface UserProfile extends User {
  // 基本情報
  gender?: "male" | "female" | "other";
  birthday?: string;
  height?: number; // cm単位

  // 体型情報
  weight?: number; // kg単位
  bodyFat?: number; // 体脂肪率（%）

  // 目標情報
  weightGoal?: number;
  bodyFatGoal?: number;

  // トレーニング設定
  fitnessLevel?: "beginner" | "intermediate" | "advanced";
  workoutDaysPerWeek?: number;
  workoutDuration?: number; // 分単位

  // その他情報
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

// 測定記録の型
export interface Measurement {
  id: string;
  userId: string;
  date: string;
  weight: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  arm?: number;
  thigh?: number;
  note?: string;
}
