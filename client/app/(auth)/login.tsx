
import api from "@/services/api";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }

    try {
      setLoading(true);

      // Login using the deployed teacher authentication endpoint
      const response = await api.post("/api/teacher-auth/login", {
        email: email.trim(),
        password,
      });

      // Verify the authenticated session
      const verifyResponse = await api.get(
        "/api/teacher-auth/verify"
      );

      const teacherName =
        verifyResponse.data.teacher?.name ||
        response.data.teacher?.name ||
        "Teacher";

      Alert.alert(
        "Login Successful",
        `Welcome back, ${teacherName}!`,
        [
          {
            text: "Continue",
            onPress: () => router.replace("/dashboard"),
          },
        ]
      );
    } catch (error: any) {
      console.log(
        "Login error:",
        error.response?.data || error.message
      );

      const message =
        error.response?.data?.message ||
        "Something went wrong. Please try again.";

      Alert.alert("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Aevion.AI</Text>

      <Text style={styles.title}>Welcome Back 👋</Text>

      <Text style={styles.subtitle}>
        Login to continue to your AI assistant
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />
      </View>

      <TouchableOpacity
        style={[styles.loginButton, loading && styles.disabledButton]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginButtonText}>Login</Text>
        )}
      </TouchableOpacity>

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>
          Don't have an account?
        </Text>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          disabled={loading}
        >
          <Text style={styles.registerButton}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
    backgroundColor: "#fff",
  },

  logo: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 30,
  },

  inputContainer: {
    marginBottom: 18,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  loginButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },

  disabledButton: {
    opacity: 0.6,
  },

  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },

  registerText: {
    color: "#666",
    fontSize: 15,
  },

  registerButton: {
    color: "#000",
    fontSize: 15,
    fontWeight: "bold",
  },
});
