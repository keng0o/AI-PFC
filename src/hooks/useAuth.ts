import { useState, useEffect, useContext } from "react";
import { router } from "expo-router";
import { AuthContext } from "../context/AuthProvider";
import * as authService from "../services/auth";
import { User } from "../models/user";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user, setUser } = context;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期ロード時に認証状態を確認
    const checkAuthState = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("認証状態の確認エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuthState();
  }, [setUser]);

  // 登録処理
  const register = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<User> => {
    setLoading(true);
    try {
      const newUser = await authService.registerUser(
        email,
        password,
        displayName
      );
      setUser(newUser);
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  // ログイン処理
  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const loggedInUser = await authService.loginUser(email, password);
      setUser(loggedInUser);
      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  // ログアウト処理
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      router.replace("/(auth)/login");
    } finally {
      setLoading(false);
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string): Promise<void> => {
    setLoading(true);
    try {
      await authService.resetPassword(email);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    register,
    login,
    logout,
    resetPassword,
    isAuthenticated: !!user,
  };
};
