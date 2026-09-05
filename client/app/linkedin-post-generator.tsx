import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ======================================================
// TYPES
// ======================================================

type PostType =
  | "session_conducted"
  | "student_achievement"
  | "workshop_event"
  | "research_insight"
  | "faculty_development";

type PostTone = "Reflective" | "Informative" | "Celebratory" | "Inspirational";

type Step = "form" | "review";

interface FormState {
  topic: string;
  postType: PostType;
  tone: PostTone;
}

// ======================================================
// POST TYPES
// ======================================================

const POST_TYPES = [
  {
    value: "session_conducted" as PostType,
    label: "Session conducted",
    hint: "Workshops, lectures, panel sessions",
    icon: "school-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "student_achievement" as PostType,
    label: "Student achievement",
    hint: "Awards, competitions, showcases",
    icon: "trophy-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "workshop_event" as PostType,
    label: "Workshop / event",
    hint: "Events you organized or spoke at",
    icon: "calendar-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "research_insight" as PostType,
    label: "Research / insight",
    hint: "Reflections, findings, opinions",
    icon: "bulb-outline" as keyof typeof Ionicons.glyphMap,
  },
  {
    value: "faculty_development" as PostType,
    label: "Faculty development",
    hint: "Training, mentoring initiatives",
    icon: "people-outline" as keyof typeof Ionicons.glyphMap,
  },
];

// ======================================================
// TONES
// ======================================================

const TONES: {
  value: PostTone;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: "Reflective",
    icon: "chatbubble-ellipses-outline",
  },
  {
    value: "Informative",
    icon: "information-circle-outline",
  },
  {
    value: "Celebratory",
    icon: "sparkles-outline",
  },
  {
    value: "Inspirational",
    icon: "heart-outline",
  },
];

// ======================================================
// LABELS
// ======================================================

const TYPE_LABELS: Record<PostType, string> = {
  session_conducted: "Session conducted",
  student_achievement: "Student achievement",
  workshop_event: "Workshop / event",
  research_insight: "Research / insight",
  faculty_development: "Faculty development",
};

// ======================================================
// VALIDATION
// ======================================================

function isGibberish(str: string): boolean {
  const clean = str.trim().toLowerCase();

  if (clean.length < 8) return true;

  const words = clean.split(/\s+/);

  if (words.length < 2) return true;

  const bad = words.filter((w) => {
    const hasNoVowel = !/[aeiou]/.test(w) && w.length > 3;

    const isRepeating = /(.)\1{3,}/.test(w);

    const isKeyboardSmash = /^[qwrtypsdfghjklzxcvbnm]{5,}$/.test(w);

    return hasNoVowel || isRepeating || isKeyboardSmash;
  });

  return bad.length > words.length * 0.5;
}

// ======================================================
// MAIN SCREEN
// ======================================================

export default function LinkedInPostGeneratorScreen() {
  const [step, setStep] = useState<Step>("form");

  const [form, setForm] = useState<FormState>({
    topic: "",
    postType: "session_conducted",
    tone: "Reflective",
  });

  const [generatedPost, setGeneratedPost] = useState("");

  const [editablePost, setEditablePost] = useState("");

  const [postId, setPostId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [successMsg, setSuccessMsg] = useState("");

  const [copied, setCopied] = useState(false);

  const [saved, setSaved] = useState(false);

  // ====================================================
  // GENERATE
  // ====================================================

  const handleGenerate = async () => {
    const topic = form.topic.trim();

    setError("");
    setSuccessMsg("");

    if (!topic) {
      setError("Please tell us what you want to post about.");
      return;
    }

    if (topic.length < 8) {
      setError("Please provide a little more detail about your topic.");
      return;
    }

    if (isGibberish(topic)) {
      setError("Please enter a meaningful topic with enough detail.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/api/linkedin-posts/generate", {
        topic,
        postType: form.postType,
        tone: form.tone,
      });

      const data = response.data;

      if (data.success) {
        setGeneratedPost(data.post);
        setEditablePost(data.post);
        setPostId(data.postId ?? null);
        setSaved(false);
        setStep("review");
      } else {
        setError(data.message || "Failed to generate your post.");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to generate the post. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ====================================================
  // SAVE
  // ====================================================

  const handleSaveDraft = async () => {
    if (!postId) {
      setError("This post cannot be saved because no post ID was returned.");
      return;
    }

    if (!editablePost.trim()) {
      setError("Your post cannot be empty.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const response = await api.patch(
        `/api/linkedin-posts/${postId}/approve`,
        {
          content: editablePost.trim(),
        },
      );

      if (response.data?.success) {
        setSaved(true);
        setSuccessMsg("Your post has been saved successfully.");

        setTimeout(() => {
          setSuccessMsg("");
        }, 3000);
      } else {
        setError(response.data?.message || "Failed to save the post.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save the post.");
    } finally {
      setSaving(false);
    }
  };

  // ====================================================
  // COPY
  // ====================================================

  const handleCopy = async () => {
    if (!editablePost.trim()) {
      return;
    }

    await Clipboard.setStringAsync(editablePost);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // ====================================================
  // LINKEDIN
  // ====================================================

  const handlePostToLinkedIn = async () => {
    if (!editablePost.trim()) {
      setError("Please add some content before posting.");
      return;
    }

    const encoded = encodeURIComponent(editablePost.trim());

    const url = `https://www.linkedin.com/sharing/share-offsite/?text=${encoded}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        "Unable to open LinkedIn",
        "Please make sure LinkedIn is installed or try opening LinkedIn in your browser.",
      );
    }
  };

  // ====================================================
  // EDIT INPUTS
  // ====================================================

  const handleEditInputs = () => {
    setError("");
    setSuccessMsg("");
    setStep("form");
  };

  // ====================================================
  // RESET
  // ====================================================

  const handleResetOriginal = () => {
    setEditablePost(generatedPost);
    setSaved(false);
    setSuccessMsg("");
  };

  // ====================================================
  // REGENERATE
  // ====================================================

  const handleRegenerate = () => {
    setStep("form");
    setGeneratedPost("");
    setEditablePost("");
    setPostId(null);
    setSaved(false);
    setCopied(false);
    setError("");
    setSuccessMsg("");
  };

  // ====================================================
  // WORD COUNT
  // ====================================================

  const wordCount = editablePost.trim()
    ? editablePost.trim().split(/\s+/).length
    : 0;

  const characterCount = form.topic.length;

  // ====================================================
  // SELECTED POST TYPE
  // ====================================================

  const selectedPostType = POST_TYPES.find(
    (item) => item.value === form.postType,
  );

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ==========================================
              HEADER
          ========================================== */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>LinkedIn Post Agent</Text>

              <Text style={styles.headerSubtitle}>Aevion.AI</Text>
            </View>
          </View>

          {/* ==========================================
              PAGE TITLE
          ========================================== */}

          <View style={styles.titleSection}>
            <Text style={styles.pageTitle}>
              {step === "form" ? "Create your post" : "Review your post"}
            </Text>

            <Text style={styles.pageSubtitle}>
              {step === "form"
                ? "Turn your academic work into a professional LinkedIn post."
                : "Make any changes you need before sharing it."}
            </Text>
          </View>

          {/* ==========================================
              PROGRESS
          ========================================== */}

          <View style={styles.progressCard}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step === "form"
                    ? styles.progressCircleActive
                    : styles.progressCircleCompleted,
                ]}
              >
                {step === "review" ? (
                  <Ionicons name="checkmark" size={15} color="#0A1238" />
                ) : (
                  <Text style={styles.progressNumber}>1</Text>
                )}
              </View>

              <Text
                style={[
                  styles.progressText,
                  step === "form" && styles.progressTextActive,
                ]}
              >
                Create
              </Text>
            </View>

            <View
              style={[
                styles.progressLine,
                step === "review" && styles.progressLineActive,
              ]}
            />

            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step === "review" && styles.progressCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.progressNumber,
                    step === "review" && styles.progressNumberDark,
                  ]}
                >
                  2
                </Text>
              </View>

              <Text
                style={[
                  styles.progressText,
                  step === "review" && styles.progressTextActive,
                ]}
              >
                Review
              </Text>
            </View>
          </View>

          {/* ==========================================
              ERROR
          ========================================== */}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#B42318" />

              <Text style={styles.errorText}>{error}</Text>

              <TouchableOpacity onPress={() => setError("")}>
                <Ionicons name="close" size={18} color="#B42318" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ==========================================
              SUCCESS
          ========================================== */}

          {successMsg ? (
            <View style={styles.successBox}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#067647"
              />

              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          {/* ==========================================
              CREATE STEP
          ========================================== */}

          {step === "form" && (
            <View>
              {/* POST TYPE SECTION */}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  What are you posting about?
                </Text>

                <Text style={styles.sectionDescription}>
                  Choose the option that best matches your content.
                </Text>
              </View>

              <View style={styles.postTypeContainer}>
                {POST_TYPES.map((item) => {
                  const selected = form.postType === item.value;

                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => {
                        setForm({
                          ...form,
                          postType: item.value,
                        });
                        setError("");
                      }}
                      style={[
                        styles.postTypeCard,
                        selected && styles.postTypeCardSelected,
                      ]}
                    >
                      <View
                        style={[
                          styles.postTypeIconContainer,
                          selected && styles.postTypeIconContainerSelected,
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={23}
                          color={selected ? "#FFFFFF" : "#0A1238"}
                        />
                      </View>

                      <View style={styles.postTypeContent}>
                        <Text
                          style={[
                            styles.postTypeLabel,
                            selected && styles.postTypeLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>

                        <Text style={styles.postTypeHint}>{item.hint}</Text>
                      </View>

                      <View
                        style={[styles.radio, selected && styles.radioSelected]}
                      >
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* TOPIC SECTION */}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tell us about it</Text>

                <Text style={styles.sectionDescription}>
                  Give Aevion.AI enough context to create a meaningful post.
                </Text>
              </View>

              <View style={styles.inputCard}>
                <TextInput
                  style={styles.topicInput}
                  multiline
                  textAlignVertical="top"
                  placeholder={
                    "Example:\n\nConducted a session on AI Ethics for faculty under the HEC Mentoring Program. We explored academic integrity, bias, and responsible use of generative AI."
                  }
                  placeholderTextColor="#9298AC"
                  value={form.topic}
                  maxLength={1000}
                  onChangeText={(text) => {
                    setForm({
                      ...form,
                      topic: text,
                    });
                    setError("");
                  }}
                />

                <View style={styles.inputFooter}>
                  <View style={styles.contextHint}>
                    <Ionicons
                      name="sparkles-outline"
                      size={14}
                      color="#7A8199"
                    />

                    <Text style={styles.contextHintText}>
                      More detail = better results
                    </Text>
                  </View>

                  <Text style={styles.characterCount}>
                    {characterCount}/1000
                  </Text>
                </View>
              </View>

              {/* TONE SECTION */}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Choose a tone</Text>

                <Text style={styles.sectionDescription}>
                  How should your post sound?
                </Text>
              </View>

              <View style={styles.toneGrid}>
                {TONES.map((tone) => {
                  const selected = form.tone === tone.value;

                  return (
                    <Pressable
                      key={tone.value}
                      onPress={() => {
                        setForm({
                          ...form,
                          tone: tone.value,
                        });
                      }}
                      style={[
                        styles.toneCard,
                        selected && styles.toneCardSelected,
                      ]}
                    >
                      <Ionicons
                        name={tone.icon}
                        size={19}
                        color={selected ? "#FFFFFF" : "#4F5875"}
                      />

                      <Text
                        style={[
                          styles.toneText,
                          selected && styles.toneTextSelected,
                        ]}
                      >
                        {tone.value}
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#FFFFFF"
                          style={styles.toneCheck}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {/* GENERATE */}

              <TouchableOpacity
                style={[
                  styles.generateButton,
                  loading && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerate}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />

                    <Text style={styles.generateButtonText}>
                      Creating your post...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={19} color="#FFFFFF" />

                    <Text style={styles.generateButtonText}>
                      Generate LinkedIn Post
                    </Text>

                    <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.bottomHint}>
                Aevion.AI will create a professional post based on your inputs.
              </Text>
            </View>
          )}

          {/* ==========================================
              REVIEW STEP
          ========================================== */}

          {step === "review" && (
            <View>
              {/* META */}

              <View style={styles.reviewMeta}>
                <View style={styles.metaItem}>
                  <Ionicons
                    name={selectedPostType?.icon || "document-outline"}
                    size={17}
                    color="#0A1238"
                  />

                  <Text style={styles.metaText}>
                    {TYPE_LABELS[form.postType]}
                  </Text>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.metaItem}>
                  <Ionicons
                    name="color-wand-outline"
                    size={17}
                    color="#0A1238"
                  />

                  <Text style={styles.metaText}>{form.tone}</Text>
                </View>
              </View>

              {/* EDIT INPUTS */}

              <TouchableOpacity
                style={styles.editInputsButton}
                onPress={handleEditInputs}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={16} color="#0A1238" />

                <Text style={styles.editInputsText}>Edit inputs</Text>
              </TouchableOpacity>

              {/* POST PREVIEW */}

              <View style={styles.previewHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Your LinkedIn post</Text>

                  <Text style={styles.sectionDescription}>
                    Review and edit before publishing.
                  </Text>
                </View>

                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={13} color="#0A1238" />

                  <Text style={styles.aiBadgeText}>AI Generated</Text>
                </View>
              </View>

              {/* POST EDITOR */}

              <View style={styles.postEditorCard}>
                <View style={styles.postEditorTop}>
                  <View style={styles.linkedinMiniIcon}>
                    <Text style={styles.linkedinMiniText}>in</Text>
                  </View>

                  <View>
                    <Text style={styles.postAuthorName}>LinkedIn Post</Text>

                    <Text style={styles.postAuthorSub}>
                      Generated by Aevion.AI
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.postEditor}
                  multiline
                  textAlignVertical="top"
                  value={editablePost}
                  onChangeText={(text) => {
                    setEditablePost(text);
                    setSaved(false);
                    setSuccessMsg("");
                    setError("");
                  }}
                  placeholder="Your generated post..."
                  placeholderTextColor="#9298AC"
                />

                <View style={styles.postEditorFooter}>
                  <Text style={styles.wordCount}>{wordCount} words</Text>

                  <TouchableOpacity
                    onPress={handleResetOriginal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resetText}>Reset to original</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PRIMARY ACTION */}

              <TouchableOpacity
                style={styles.linkedinButton}
                onPress={handlePostToLinkedIn}
                activeOpacity={0.85}
              >
                <View style={styles.linkedinButtonIcon}>
                  <Text style={styles.linkedinButtonIconText}>in</Text>
                </View>

                <Text style={styles.linkedinButtonText}>Post to LinkedIn</Text>

                <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />
              </TouchableOpacity>

              {/* SECONDARY ACTIONS */}

              <View style={styles.secondaryActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleCopy}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={18}
                    color="#0A1238"
                  />

                  <Text style={styles.secondaryButtonText}>
                    {copied ? "Copied" : "Copy text"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    saving && styles.secondaryButtonDisabled,
                  ]}
                  onPress={handleSaveDraft}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#0A1238" />
                  ) : (
                    <Ionicons
                      name={saved ? "checkmark" : "bookmark-outline"}
                      size={18}
                      color="#0A1238"
                    />
                  )}

                  <Text style={styles.secondaryButtonText}>
                    {saving ? "Saving..." : saved ? "Saved" : "Save draft"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* REGENERATE */}

              <TouchableOpacity
                style={styles.regenerateButton}
                onPress={handleRegenerate}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={17} color="#59617C" />

                <Text style={styles.regenerateText}>Start over</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* FOOTER */}

          <View style={styles.footer}>
            <Ionicons name="sparkles-outline" size={13} color="#727A99" />

            <Text style={styles.footerText}>Powered by Aevion.AI</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  container: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
  },

  // ====================================================
  // HEADER
  // ====================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.10)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#8E96B5",
    fontSize: 11,
    marginTop: 2,
  },

  // ====================================================
  // TITLE
  // ====================================================

  titleSection: {
    marginBottom: 20,
  },

  pageTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 7,
  },

  pageSubtitle: {
    color: "#AEB5CE",
    fontSize: 14,
    lineHeight: 21,
  },

  // ====================================================
  // PROGRESS
  // ====================================================

  progressCard: {
    height: 64,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    borderRadius: 16,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  progressStep: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleActive: {
    backgroundColor: "#FFFFFF",
  },

  progressCircleCompleted: {
    backgroundColor: "#FFFFFF",
  },

  progressNumber: {
    color: "#AAB1CA",
    fontSize: 12,
    fontWeight: "800",
  },

  progressNumberDark: {
    color: "#0A1238",
  },

  progressText: {
    color: "#8F97B3",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 7,
  },

  progressTextActive: {
    color: "#FFFFFF",
  },

  progressLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 12,
  },

  progressLineActive: {
    backgroundColor: "rgba(255,255,255,0.45)",
  },

  // ====================================================
  // ERROR
  // ====================================================

  errorBox: {
    minHeight: 50,
    backgroundColor: "#FFF0F0",
    borderWidth: 1,
    borderColor: "#F4C4C4",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  errorText: {
    flex: 1,
    color: "#B42318",
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 9,
  },

  // ====================================================
  // SUCCESS
  // ====================================================

  successBox: {
    minHeight: 50,
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#B7E8C9",
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  successText: {
    flex: 1,
    color: "#067647",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 9,
  },

  // ====================================================
  // SECTIONS
  // ====================================================

  sectionHeader: {
    marginBottom: 12,
    marginTop: 7,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },

  sectionDescription: {
    color: "#8E96B3",
    fontSize: 12,
    lineHeight: 17,
  },

  // ====================================================
  // POST TYPES
  // ====================================================

  postTypeContainer: {
    marginBottom: 20,
  },

  postTypeCard: {
    minHeight: 78,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E5ED",
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  postTypeCardSelected: {
    borderColor: "#FFFFFF",
    backgroundColor: "#F5F6FB",
    borderWidth: 2,
  },

  postTypeIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#EEF0F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  postTypeIconContainerSelected: {
    backgroundColor: "#0A1238",
  },

  postTypeContent: {
    flex: 1,
    paddingRight: 7,
  },

  postTypeLabel: {
    color: "#1D2441",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },

  postTypeLabelSelected: {
    color: "#0A1238",
  },

  postTypeHint: {
    color: "#737B93",
    fontSize: 11,
    lineHeight: 15,
  },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "#C9CEDB",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#0A1238",
  },

  radioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#0A1238",
  },

  // ====================================================
  // TOPIC INPUT
  // ====================================================

  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E1E4EC",
    marginBottom: 20,
  },

  topicInput: {
    minHeight: 165,
    color: "#1D2441",
    fontSize: 14,
    lineHeight: 21,
    padding: 4,
  },

  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    marginTop: 5,
  },

  contextHint: {
    flexDirection: "row",
    alignItems: "center",
  },

  contextHintText: {
    color: "#7A8199",
    fontSize: 10,
    marginLeft: 5,
  },

  characterCount: {
    color: "#7A8199",
    fontSize: 10,
    fontWeight: "600",
  },

  // ====================================================
  // TONES
  // ====================================================

  toneGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  toneCard: {
    width: "48.5%",
    minHeight: 49,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  toneCardSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
  },

  toneText: {
    color: "#C1C6D7",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 7,
  },

  toneTextSelected: {
    color: "#0A1238",
  },

  toneCheck: {
    marginLeft: "auto",
  },

  // ====================================================
  // GENERATE BUTTON
  // ====================================================

  generateButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  generateButtonDisabled: {
    opacity: 0.65,
  },

  generateButtonText: {
    color: "#0A1238",
    fontSize: 14,
    fontWeight: "800",
    marginHorizontal: 9,
  },

  bottomHint: {
    color: "#747C9B",
    fontSize: 10,
    textAlign: "center",
    lineHeight: 15,
    marginTop: 10,
  },

  // ====================================================
  // REVIEW META
  // ====================================================

  reviewMeta: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    minHeight: 51,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },

  metaText: {
    color: "#27304F",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  metaDivider: {
    width: 1,
    height: 19,
    backgroundColor: "#DDE0E8",
    marginHorizontal: 12,
  },

  // ====================================================
  // EDIT INPUTS
  // ====================================================

  editInputsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    marginBottom: 17,
  },

  editInputsText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },

  // ====================================================
  // PREVIEW HEADER
  // ====================================================

  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 1,
  },

  aiBadgeText: {
    color: "#0A1238",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 4,
  },

  // ====================================================
  // POST EDITOR
  // ====================================================

  postEditorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E1E4EC",
    marginBottom: 14,
  },

  postEditorTop: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF0F4",
    marginBottom: 3,
  },

  linkedinMiniIcon: {
    width: 35,
    height: 35,
    borderRadius: 8,
    backgroundColor: "#0077B5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  linkedinMiniText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
  },

  postAuthorName: {
    color: "#202744",
    fontSize: 12,
    fontWeight: "800",
  },

  postAuthorSub: {
    color: "#858CA1",
    fontSize: 9,
    marginTop: 2,
  },

  postEditor: {
    minHeight: 340,
    color: "#202744",
    fontSize: 14,
    lineHeight: 22,
    paddingTop: 12,
    paddingBottom: 10,
  },

  postEditorFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  wordCount: {
    color: "#7B8298",
    fontSize: 10,
  },

  resetText: {
    color: "#0A1238",
    fontSize: 10,
    fontWeight: "800",
  },

  // ====================================================
  // LINKEDIN BUTTON
  // ====================================================

  linkedinButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#0077B5",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  linkedinButtonIcon: {
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  linkedinButtonIconText: {
    color: "#0077B5",
    fontSize: 14,
    fontWeight: "900",
  },

  linkedinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginHorizontal: 9,
  },

  // ====================================================
  // SECONDARY ACTIONS
  // ====================================================

  secondaryActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  secondaryButton: {
    width: "48.5%",
    minHeight: 51,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E3EB",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  secondaryButtonDisabled: {
    opacity: 0.6,
  },

  secondaryButtonText: {
    color: "#202744",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 7,
  },

  // ====================================================
  // REGENERATE
  // ====================================================

  regenerateButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
  },

  regenerateText: {
    color: "#858DA8",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 6,
  },

  // ====================================================
  // FOOTER
  // ====================================================

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  footerText: {
    color: "#727A99",
    fontSize: 10,
    marginLeft: 5,
  },
});
