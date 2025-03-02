import { Stack, useRouter } from "expo-router";
import {
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../src/config/firebase";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "">("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const auth = getAuth();

  const handleRegister = async () => {
    // 入力検証
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("エラー", "名前、メールアドレス、パスワードは必須項目です");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("エラー", "パスワードが一致しません");
      return;
    }

    if (password.length < 6) {
      Alert.alert("エラー", "パスワードは6文字以上である必要があります");
      return;
    }

    setIsLoading(true);
    try {
      // ユーザー登録
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // プロファイル更新
      await updateProfile(user, {
        displayName: name,
      });

      // Firestoreにユーザーデータを保存
      await setDoc(doc(db, "users", user.uid), {
        displayName: name,
        email: email,
        age: age ? parseInt(age) : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        gender: gender || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // ホーム画面に遷移
      router.replace("/(tabs)");
    } catch (error: any) {
      let errorMessage = "登録に失敗しました";
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "このメールアドレスは既に使用されています";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "メールアドレスの形式が正しくありません";
      }
      Alert.alert("エラー", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const genderOptions: { label: string; value: "male" | "female" | "other" }[] =
    [
      { label: "男性", value: "male" },
      { label: "女性", value: "female" },
      { label: "その他", value: "other" },
    ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Stack.Screen options={{ title: "新規登録", headerShown: false }} />

      <View style={styles.header}>
        <Text style={styles.title}>アカウント登録</Text>
        <Text style={styles.subtitle}>
          筋トレの習慣化をサポートするAIパートナー
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="名前"
          value={name}
          onChangeText={setName}
        />

        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="パスワード（確認）"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <Text style={styles.sectionTitle}>プロフィール情報（任意）</Text>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="年齢"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
          />

          <View style={styles.genderContainer}>
            <Text style={styles.genderLabel}>性別</Text>
            <View style={styles.genderOptions}>
              {genderOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    gender === option.value && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGender(option.value)}
                >
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === option.value &&
                        styles.genderOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="身長 (cm)"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
          />

          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="体重 (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "登録中..." : "登録する"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>既にアカウントをお持ちですか？</Text>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>ログイン</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  form: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    marginTop: 15,
    color: "#333",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  genderContainer: {
    width: "48%",
  },
  genderLabel: {
    marginBottom: 8,
    marginLeft: 5,
    color: "#666",
  },
  genderOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
    alignItems: "center",
    marginHorizontal: 2,
  },
  genderOptionSelected: {
    borderColor: "#4A90E2",
    backgroundColor: "#f0f8ff",
  },
  genderOptionText: {
    color: "#666",
    fontSize: 12,
  },
  genderOptionTextSelected: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#4A90E2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#666",
    marginRight: 5,
  },
  link: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
});
