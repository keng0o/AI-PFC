import {
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
  UserCredential,
} from "firebase/auth";
import { User } from "../../models/user";
import { app } from "./index";

const auth = getAuth(app);

// ユーザー登録
export const registerUser = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // プロフィール更新（表示名を設定）
    await updateProfile(userCredential.user, { displayName });

    return mapFirebaseUserToUser(userCredential.user);
  } catch (error) {
    console.error("ユーザー登録エラー:", error);
    throw error;
  }
};

// ログイン
export const loginUser = async (
  email: string,
  password: string
): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return mapFirebaseUserToUser(userCredential.user);
  } catch (error) {
    console.error("ログインエラー:", error);
    throw error;
  }
};

// ログアウト
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("ログアウトエラー:", error);
    throw error;
  }
};

// パスワードリセットメール送信
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("パスワードリセットエラー:", error);
    throw error;
  }
};

// 現在のユーザーを取得
export const getCurrentUser = (): User | null => {
  const firebaseUser = auth.currentUser;
  return firebaseUser ? mapFirebaseUserToUser(firebaseUser) : null;
};

// Firebase UserをアプリのUserモデルに変換
const mapFirebaseUserToUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || "",
    displayName: firebaseUser.displayName || "",
    photoURL: firebaseUser.photoURL || "",
  };
};
