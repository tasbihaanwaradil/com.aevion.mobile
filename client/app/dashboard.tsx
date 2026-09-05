import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type User = {
  _id: string;
  name: string;
  email: string;
};

type Tool = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  cardBackground: string;
  iconBackground: string;
};

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const tools: Tool[] = [
    {
      title: "LinkedIn Post Generator",
      description:
        "Generates professional LinkedIn posts for teachers related to achievements, research, or academic events.",
      icon: "logo-linkedin",
      cardBackground: "#FFF1E6",
      iconBackground: "#F97316",
    },
    {
      title: "Academic Email Writer",
      description:
        "Drafts formal emails for class announcements, deadlines, feedback, and administrative communication.",
      icon: "mail",
      cardBackground: "#EAF8EF",
      iconBackground: "#22C55E",
    },
    {
      title: "Quiz Generator",
      description:
        "Automatically creates quizzes from lecture slides, PDFs, or topic inputs.",
      icon: "help-circle",
      cardBackground: "#EEF0FF",
      iconBackground: "#6366F1",
    },
    {
      title: "Auto Slides",
      description: "Generate professional presentation slides from topics.",
      icon: "easel",
      cardBackground: "#FCE7F3",
      iconBackground: "#EC4899",
    },
    {
      title: "PDF to Slides",
      description: "Convert PDF documents into presentation slides.",
      icon: "document-text",
      cardBackground: "#F1FAD9",
      iconBackground: "#84CC16",
    },
    {
      title: "Reminder",
      description: "Track schedules, deadlines, and important academic events.",
      icon: "calendar",
      cardBackground: "#F3F4F6",
      iconBackground: "#F97316",
    },
  ];

  // =========================
  // VERIFY LOGGED-IN USER
  // =========================

  const verifyUser = async () => {
    try {
      const response = await api.get("/api/auth/verify");

      setUser(response.data.user);
    } catch (error: any) {
      Alert.alert("Session Expired", "Please login again.", [
        {
          text: "Login",
          onPress: () => {
            router.replace("/login");
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUser();
  }, []);

  // =========================
  // OPEN TOOL
  // =========================

  const handleOpenTool = (tool: Tool) => {
    if (tool.title === "LinkedIn Post Generator") {
      router.push("/linkedin-post-generator");
      return;
    }

    Alert.alert(tool.title, "This tool will be connected next.");
  };

  // =========================
  // LOADING SCREEN
  // =========================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />

        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // =========================
  // DASHBOARD
  // =========================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* =========================
              HEADER
          ========================= */}

          <View style={styles.header}>
            <Text style={styles.logo}>Aevion.AI</Text>

            <Text style={styles.title}>
              Welcome back, {user?.name || "User"}!
            </Text>

            <Text style={styles.subtitle}>
              Unlock smarter workflows with AI tools
            </Text>
          </View>

          {/* =========================
              TOOLS
          ========================= */}

          <View style={styles.toolsContainer}>
            {tools.map((tool, index) => (
              <View
                key={index}
                style={[
                  styles.toolCard,
                  {
                    backgroundColor: tool.cardBackground,
                  },
                ]}
              >
                {/* Icon */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: tool.iconBackground,
                    },
                  ]}
                >
                  <Ionicons name={tool.icon} size={26} color="#FFFFFF" />
                </View>

                {/* Title */}
                <Text style={styles.toolTitle}>{tool.title}</Text>

                {/* Description */}
                <Text style={styles.toolDescription}>{tool.description}</Text>

                {/* Open Tool */}
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenTool(tool)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openButtonText}>Open Tool</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  scrollContent: {
    paddingBottom: 40,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  // HEADER
  header: {
    marginBottom: 25,
  },

  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 25,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#D1D5DB",
    lineHeight: 22,
  },

  // TOOLS
  toolsContainer: {
    gap: 18,
  },

  toolCard: {
    borderRadius: 18,
    padding: 20,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.12,
    shadowRadius: 5,

    elevation: 4,
  },

  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 15,
  },

  toolTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },

  toolDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },

  // OPEN TOOL BUTTON
  openButton: {
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0A1238",

    justifyContent: "center",
    alignItems: "center",

    marginTop: 18,
  },

  openButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A1238",

    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    marginTop: 15,
  },
});
