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
  route?: string;
};

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Dashboard tools aligned with the Web App
  const tools: Tool[] = [
    {
      title: "LinkedIn Post Studio",
      description:
        "Generates professional LinkedIn posts for teachers related to achievements, research, or academic events.",
      icon: "logo-linkedin",
      cardBackground: "#FFEDD5",
      iconBackground: "#F97316",
      route: "/linkedin-post-generator",
    },
    {
      title: "Academic Email Assistant",
      description:
        "Drafts formal emails for class announcements, deadlines, feedback, and administrative communication.",
      icon: "mail",
      cardBackground: "#DCFCE7",
      iconBackground: "#22C55E",
      route: "/academic-email-writer",
    },
    {
      title: "Quiz Studio",
      description:
        "Automatically creates quizzes from lecture slides, PDFs, or topic inputs.",
      icon: "help-circle",
      cardBackground: "#E0E7FF",
      iconBackground: "#6366F1",
      route: "/quiz-studio",
    },
    {
      title: "Lesson Slide Studio",
      description:
        "Turns a topic or a rough outline into a ready-to-present slide deck in minutes.",
      icon: "easel",
      cardBackground: "#FFE4E6",
      iconBackground: "#F43F5E",
      route: "/slide-generator",
    },
    {
      title: "PDF Lesson Studio",
      description:
        "Converts lecture notes or research PDFs directly into a structured, presentable slide deck.",
      icon: "document-text",
      cardBackground: "#CFFAFE",
      iconBackground: "#06B6D4",
      route: "/pdf-to-slide-generator",
    },
    {
      title: "Reminder",
      description:
        "Manages teaching tasks, deadlines, and reminders — with alerts before due dates so nothing slips.",
      icon: "alarm",
      cardBackground: "#FEF3C7",
      iconBackground: "#F59E0B",
    },
  ];

  // Verify logged-in teacher
  const verifyUser = async () => {
    try {
      const response = await api.get("/api/teacher-auth/verify");

      if (response.data?.teacher) {
        setUser(response.data.teacher);
      } else {
        throw new Error("Teacher session not found.");
      }
    } catch (error: any) {
      console.log(
        "Dashboard authentication error:",
        error.response?.data || error.message,
      );

      Alert.alert("Session Expired", "Please login again.", [
        {
          text: "Login",
          onPress: () => router.replace("/login"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verifyUser();
  }, []);

  // Open selected tool
  const handleOpenTool = (tool: Tool) => {
    if (tool.route) {
      router.push(tool.route as any);
      return;
    }

    Alert.alert(
      tool.title,
      "This tool will be available in the mobile app soon.",
    );
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Dashboard
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Welcome back, {user?.name || "Teacher"}!
            </Text>

            <Text style={styles.subtitle}>
              Unlock smarter workflows with AI tools
            </Text>
          </View>

          {/* Tool cards */}
          <View style={styles.toolsContainer}>
            {tools.map((tool) => (
              <View
                key={tool.title}
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
                  <Ionicons name={tool.icon} size={25} color="#FFFFFF" />
                </View>

                {/* Title */}
                <Text style={styles.toolTitle}>{tool.title}</Text>

                {/* Description */}
                <Text style={styles.toolDescription}>{tool.description}</Text>

                {/* Open tool button */}
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={() => handleOpenTool(tool)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${tool.title}`}
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

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 35,
  },

  content: {
    width: "100%",
    maxWidth: 650,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 36,
  },

  subtitle: {
    fontSize: 15,
    color: "#D1D5DB",
    lineHeight: 22,
    marginTop: 6,
  },

  toolsContainer: {
    gap: 18,
  },

  toolCard: {
    borderRadius: 18,
    padding: 22,
    minHeight: 235,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    flexDirection: "column",
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
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
    flex: 1,
  },

  openButton: {
    width: "100%",
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "#0A1238",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
    paddingVertical: 10,
  },

  openButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

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
