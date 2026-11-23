
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

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // Validate required fields
    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    // Validate name (matches backend requirements)
    if (!/^[A-Za-z\s]{2,50}$/.test(trimmedName)) {
      Alert.alert(
        "Invalid Name",
        "Name must contain 2–50 letters and spaces only."
      );
      return;
    }

    // Validate email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    // Validate password (matches backend requirements)
    if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/.test(password)) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 8 characters and include a letter and a number."
      );
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      // Register teacher using deployed backend
      const response = await api.post("/api/teacher-auth/register", {
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      console.log("Registration response:", response.data);

      Alert.alert(
        "Success",
        response.data.message || "Account created successfully.",
        [
          {
            text: "Continue",
            onPress: () => {
              router.replace("/dashboard");
            },
          },
        ]
      );
    } catch (error: any) {
      console.log(
        "Registration error:",
        error.response?.data || error.message
      );

      const message =
        error.response?.data?.message ||
        "Something went wrong. Please try again.";

      Alert.alert("Registration Failed", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Aevion.AI</Text>

      <Text style={styles.title}>Create your account</Text>

      <Text style={styles.subtitle}>Get started with your AI assistant</Text>

      {/* Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      </View>

      {/* Email */}
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
        />
      </View>

      {/* Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {/* Confirm Password */}
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Confirm your password"
          placeholderTextColor="#999"
          secureTextEntry
          autoCapitalize="none"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
      </View>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerButton, loading && styles.disabledButton]}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>Register</Text>
        )}
      </TouchableOpacity>

      {/* Login */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account?</Text>

        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.loginButton}>Login</Text>
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
    marginBottom: 30,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 25,
  },

  inputContainer: {
    marginBottom: 14,
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 7,
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: "#fff",
  },

  registerButton: {
    height: 52,
    borderRadius: 10,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },

  loginText: {
    color: "#666",
    fontSize: 15,
  },

  loginButton: {
    color: "#000",
    fontSize: 15,
    fontWeight: "bold",
    marginLeft: 5,
  },
});
