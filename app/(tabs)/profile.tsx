import { FontAwesome } from "@expo/vector-icons";
import firestore from "@react-native-firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { getAuth, signOut, updateProfile } from "firebase/auth";
import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>({
    displayName: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
  });
  const [newMeasurement, setNewMeasurement] = useState({
    weight: "",
    bodyFatPercentage: "",
    notes: "",
  });
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "muscle_gain",
    targetValue: "",
    currentValue: "",
    targetDate: new Date(),
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "profile" | "measurement" | "goal"
  >("profile");

  const auth = getAuth();
  const router = useRouter();

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      fetchUserProfile(currentUser.uid);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(firestore, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileData({
          displayName: userData.displayName || "",
          age: userData.age ? userData.age.toString() : "",
          gender: userData.gender || "",
          height: userData.height ? userData.height.toString() : "",
          weight: userData.weight ? userData.weight.toString() : "",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("エラー", "ログアウトに失敗しました");
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      // Firebaseプロフィール更新
      if (
        profileData.displayName &&
        profileData.displayName !== user.displayName
      ) {
        await updateProfile(user, {
          displayName: profileData.displayName,
        });
      }

      // Firestoreデータ更新
      await updateDoc(doc(firestore, "users", user.uid), {
        displayName: profileData.displayName,
        age: profileData.age ? parseInt(profileData.age) : null,
        gender: profileData.gender || null,
        height: profileData.height ? parseFloat(profileData.height) : null,
        weight: profileData.weight ? parseFloat(profileData.weight) : null,
        updatedAt: new Date(),
      });

      Alert.alert("成功", "プロフィールを更新しました");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("エラー", "プロフィール更新に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMeasurementSubmit = async () => {
    if (!user) return;

    // バリデーション
    if (!newMeasurement.weight) {
      Alert.alert("エラー", "体重は必須項目です");
      return;
    }

    setIsSaving(true);
    try {
      // 新しい測定データをFirestoreに保存
      await addDoc(collection(firestore, "bodyMeasurements"), {
        userId: user.uid,
        date: new Date(),
        weight: newMeasurement.weight
          ? parseFloat(newMeasurement.weight)
          : null,
        bodyFatPercentage: newMeasurement.bodyFatPercentage
          ? parseFloat(newMeasurement.bodyFatPercentage)
          : null,
        notes: newMeasurement.notes || "",
        createdAt: new Date(),
      });

      // 最新の体重データをユーザープロフィールにも反映
      if (newMeasurement.weight) {
        await updateDoc(doc(firestore, "users", user.uid), {
          weight: parseFloat(newMeasurement.weight),
          updatedAt: new Date(),
        });

        setProfileData({
          ...profileData,
          weight: newMeasurement.weight,
        });
      }

      // フォームをリセット
      setNewMeasurement({
        weight: "",
        bodyFatPercentage: "",
        notes: "",
      });

      Alert.alert("成功", "測定データを記録しました");
    } catch (error) {
      console.error("Error saving measurement:", error);
      Alert.alert("エラー", "データ保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoalSubmit = async () => {
    if (!user) return;

    // バリデーション
    if (!newGoal.title) {
      Alert.alert("エラー", "目標タイトルは必須項目です");
      return;
    }

    setIsSaving(true);
    try {
      // 新しい目標をFirestoreに保存
      await addDoc(collection(firestore, "goals"), {
        userId: user.uid,
        title: newGoal.title,
        description: newGoal.description || "",
        category: newGoal.category,
        targetValue: newGoal.targetValue
          ? parseFloat(newGoal.targetValue)
          : null,
        currentValue: newGoal.currentValue
          ? parseFloat(newGoal.currentValue)
          : 0,
        targetDate: newGoal.targetDate,
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // フォームをリセット
      setNewGoal({
        title: "",
        description: "",
        category: "muscle_gain",
        targetValue: "",
        currentValue: "",
        targetDate: new Date(),
      });

      Alert.alert("成功", "新しい目標を設定しました");
    } catch (error) {
      console.error("Error saving goal:", error);
      Alert.alert("エラー", "目標設定に失敗しました");
    } finally {
      setIsSaving(false);
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

      if (!result.canceled && result.assets && result.assets[0].uri) {
        // ここで画像をFirebase Storageにアップロードし、プロフィール画像を更新する処理を追加できます
        Alert.alert("情報", "この機能は現在実装中です");
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {user?.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <FontAwesome name="user" size={50} color="#ddd" />
            </View>
          )}
          <View style={styles.editAvatarButton}>
            <FontAwesome name="camera" size={16} color="white" />
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>
          {user?.displayName || "ユーザー名未設定"}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>ユーザー名</Text>
        <TextInput
          style={styles.input}
          value={profileData.displayName}
          onChangeText={(text) =>
            setProfileData({ ...profileData, displayName: text })
          }
          placeholder="名前を入力"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>年齢</Text>
          <TextInput
            style={styles.input}
            value={profileData.age}
            onChangeText={(text) =>
              setProfileData({ ...profileData, age: text })
            }
            placeholder="年齢"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>性別</Text>
          <View style={styles.genderSelection}>
            {["male", "female", "other"].map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderOption,
                  profileData.gender === gender && styles.selectedGender,
                ]}
                onPress={() => setProfileData({ ...profileData, gender })}
              >
                <Text
                  style={[
                    styles.genderText,
                    profileData.gender === gender && styles.selectedGenderText,
                  ]}
                >
                  {gender === "male"
                    ? "男性"
                    : gender === "female"
                    ? "女性"
                    : "その他"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>身長 (cm)</Text>
          <TextInput
            style={styles.input}
            value={profileData.height}
            onChangeText={(text) =>
              setProfileData({ ...profileData, height: text })
            }
            placeholder="身長"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>体重 (kg)</Text>
          <TextInput
            style={styles.input}
            value={profileData.weight}
            onChangeText={(text) =>
              setProfileData({ ...profileData, weight: text })
            }
            placeholder="体重"
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isSaving && styles.disabledButton]}
        onPress={handleProfileUpdate}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? "保存中..." : "プロフィールを更新"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderMeasurementSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>体組成測定</Text>
        <Text style={styles.sectionSubtitle}>今日の測定値を記録しましょう</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>体重 (kg)</Text>
        <TextInput
          style={styles.input}
          value={newMeasurement.weight}
          onChangeText={(text) =>
            setNewMeasurement({ ...newMeasurement, weight: text })
          }
          placeholder="現在の体重"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>体脂肪率 (%)</Text>
        <TextInput
          style={styles.input}
          value={newMeasurement.bodyFatPercentage}
          onChangeText={(text) =>
            setNewMeasurement({ ...newMeasurement, bodyFatPercentage: text })
          }
          placeholder="体脂肪率（任意）"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>メモ</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newMeasurement.notes}
          onChangeText={(text) =>
            setNewMeasurement({ ...newMeasurement, notes: text })
          }
          placeholder="測定に関するメモ（任意）"
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.button, isSaving && styles.disabledButton]}
        onPress={handleMeasurementSubmit}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? "保存中..." : "測定値を記録"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGoalSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>新しい目標設定</Text>
        <Text style={styles.sectionSubtitle}>
          具体的な目標を設定してモチベーションを高めましょう
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>目標タイトル</Text>
        <TextInput
          style={styles.input}
          value={newGoal.title}
          onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
          placeholder="例：ベンチプレス100kgを達成する"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>説明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={newGoal.description}
          onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
          placeholder="目標の詳細や達成方法など（任意）"
          multiline
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>カテゴリ</Text>
        <View style={styles.categorySelection}>
          {[
            { id: "strength", label: "筋力" },
            { id: "muscle_gain", label: "筋肥大" },
            { id: "weight", label: "体重" },
            { id: "habit", label: "習慣化" },
          ].map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryOption,
                newGoal.category === category.id && styles.selectedCategory,
              ]}
              onPress={() => setNewGoal({ ...newGoal, category: category.id })}
            >
              <Text
                style={[
                  styles.categoryText,
                  newGoal.category === category.id &&
                    styles.selectedCategoryText,
                ]}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>目標値</Text>
          <TextInput
            style={styles.input}
            value={newGoal.targetValue}
            onChangeText={(text) =>
              setNewGoal({ ...newGoal, targetValue: text })
            }
            placeholder="目標値"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>現在値</Text>
          <TextInput
            style={styles.input}
            value={newGoal.currentValue}
            onChangeText={(text) =>
              setNewGoal({ ...newGoal, currentValue: text })
            }
            placeholder="現在値"
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, isSaving && styles.disabledButton]}
        onPress={handleGoalSubmit}
        disabled={isSaving}
      >
        <Text style={styles.buttonText}>
          {isSaving ? "保存中..." : "目標を設定する"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === "profile" && styles.activeTab,
            ]}
            onPress={() => setActiveSection("profile")}
          >
            <Text
              style={[
                styles.tabText,
                activeSection === "profile" && styles.activeTabText,
              ]}
            >
              プロフィール
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeSection === "measurement" && styles.activeTab,
            ]}
            onPress={() => setActiveSection("measurement")}
          >
            <Text
              style={[
                styles.tabText,
                activeSection === "measurement" && styles.activeTabText,
              ]}
            >
              体組成記録
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeSection === "goal" && styles.activeTab]}
            onPress={() => setActiveSection("goal")}
          >
            <Text
              style={[
                styles.tabText,
                activeSection === "goal" && styles.activeTabText,
              ]}
            >
              目標設定
            </Text>
          </TouchableOpacity>
        </View>

        {activeSection === "profile" && renderProfileSection()}
        {activeSection === "measurement" && renderMeasurementSection()}
        {activeSection === "goal" && renderGoalSection()}

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <FontAwesome name="sign-out" size={16} color="#FF6B6B" />
          <Text style={styles.logoutText}>ログアウト</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  scrollView: {
    flex: 1,
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
  section: {
    margin: 16,
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#4A90E2",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  userEmail: {
    color: "#666",
    fontSize: 14,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
    flex: 1,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    color: "#333",
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#4A90E2",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  genderSelection: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderOption: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginHorizontal: 2,
  },
  selectedGender: {
    borderColor: "#4A90E2",
    backgroundColor: "#f0f8ff",
  },
  genderText: {
    color: "#666",
  },
  selectedGenderText: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  categorySelection: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  selectedCategory: {
    borderColor: "#4A90E2",
    backgroundColor: "#f0f8ff",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
  },
  selectedCategoryText: {
    color: "#4A90E2",
    fontWeight: "bold",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 32,
  },
  logoutText: {
    color: "#FF6B6B",
    fontWeight: "600",
    marginLeft: 8,
  },
});
