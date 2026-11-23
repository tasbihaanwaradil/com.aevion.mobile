import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { encode } from "base64-arraybuffer";
import {
  Presentation,
  Sparkles,
  Download,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  FileText,
} from "lucide-react-native";

// ─── API Configuration ──────────────────────────────────

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const API_BASE = `${BASE_URL}/api/slides`;

// ─── Types ──────────────────────────────────────────────

type Tone = "Conversational" | "Formal" | "Academic" | "Simple";

interface Bullet {
  point: string;
  description: string;
}

interface Slide {
  title: string;
  bullets: Bullet[];
}

interface GenerateResponse {
  success: boolean;
  deckId?: string;
  deckTitle?: string;
  slides?: Slide[];
  message?: string;
}

// ─── Constants ──────────────────────────────────────────

const TONES: Tone[] = ["Conversational", "Formal", "Academic", "Simple"];

// ─── Main Screen ────────────────────────────────────────

export default function SlideGenerator() {
  const [topic, setTopic] = useState("");
  const [outline, setOutline] = useState("");

  const [slideCount, setSlideCount] = useState(8);
  const [tone, setTone] = useState<Tone>("Conversational");

  const [deckId, setDeckId] = useState<string | undefined>();
  const [deckTitle, setDeckTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);

  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ─── Generate Slides ──────────────────────────────────

  const handleGenerate = async () => {
    if (!BASE_URL) {
      Alert.alert(
        "Configuration error",
        "Please configure EXPO_PUBLIC_API_URL in your mobile .env file.",
      );
      return;
    }

    if (!topic.trim()) {
      Alert.alert(
        "Topic required",
        "Please enter a topic for your presentation.",
      );
      return;
    }

    if (generating) return;

    setGenerating(true);
    setSlides([]);

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          topic: topic.trim(),
          outline: outline.trim(),
          slideCount,
          tone,
        }),
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok || !data.success || !data.slides) {
        throw new Error(data.message || "Unable to generate slides.");
      }

      setDeckId(data.deckId);
      setDeckTitle(data.deckTitle || topic.trim());
      setSlides(data.slides);

      Alert.alert(
        "Success",
        `${data.slides.length} slides generated successfully.`,
      );
    } catch (error) {
      Alert.alert(
        "Generation failed",
        error instanceof Error
          ? error.message
          : "Unable to connect to the server.",
      );
    } finally {
      setGenerating(false);
    }
  };

  // ─── Update Slide Title ───────────────────────────────

  const updateSlideTitle = (slideIndex: number, value: string) => {
    setSlides((previous) =>
      previous.map((slide, index) =>
        index === slideIndex ? { ...slide, title: value } : slide,
      ),
    );
  };

  // ─── Update Bullet ────────────────────────────────────

  const updateBullet = (
    slideIndex: number,
    bulletIndex: number,
    field: keyof Bullet,
    value: string,
  ) => {
    setSlides((previous) =>
      previous.map((slide, index) => {
        if (index !== slideIndex) return slide;

        return {
          ...slide,
          bullets: slide.bullets.map((bullet, bIndex) =>
            bIndex === bulletIndex ? { ...bullet, [field]: value } : bullet,
          ),
        };
      }),
    );
  };

  // ─── Add Bullet ───────────────────────────────────────

  const addBullet = (slideIndex: number) => {
    setSlides((previous) =>
      previous.map((slide, index) =>
        index === slideIndex
          ? {
              ...slide,
              bullets: [...slide.bullets, { point: "", description: "" }],
            }
          : slide,
      ),
    );
  };

  // ─── Remove Bullet ────────────────────────────────────

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    setSlides((previous) =>
      previous.map((slide, index) =>
        index === slideIndex
          ? {
              ...slide,
              bullets: slide.bullets.filter(
                (_, bIndex) => bIndex !== bulletIndex,
              ),
            }
          : slide,
      ),
    );
  };

  // ─── Add Slide ────────────────────────────────────────

  const addSlide = () => {
    setSlides((previous) => [
      ...previous,
      {
        title: "New slide",
        bullets: [{ point: "", description: "" }],
      },
    ]);
  };

  // ─── Remove Slide ─────────────────────────────────────

  const removeSlide = (slideIndex: number) => {
    Alert.alert("Delete slide", "Are you sure you want to delete this slide?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setSlides((previous) =>
            previous.filter((_, index) => index !== slideIndex),
          );
        },
      },
    ]);
  };

  // ─── Move Slide ───────────────────────────────────────

  const moveSlide = (slideIndex: number, direction: -1 | 1) => {
    setSlides((previous) => {
      const targetIndex = slideIndex + direction;

      if (targetIndex < 0 || targetIndex >= previous.length) {
        return previous;
      }

      const next = [...previous];

      [next[slideIndex], next[targetIndex]] = [
        next[targetIndex],
        next[slideIndex],
      ];

      return next;
    });
  };

  // ─── Download Presentation ────────────────────────────

  const handleDownload = async () => {
    if (!BASE_URL) {
      Alert.alert("Error", "Backend URL is not configured.");
      return;
    }

    if (slides.length === 0) {
      Alert.alert("No slides", "Generate a presentation before downloading.");
      return;
    }

    if (slides.some((slide) => !slide.title.trim())) {
      Alert.alert(
        "Missing title",
        "Every slide must have a title before exporting.",
      );
      return;
    }

    if (downloading) return;

    setDownloading(true);

    try {
      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          deckId,
          deckTitle: deckTitle.trim() || topic || "Presentation",
          slides: slides.map((slide) => ({
            title: slide.title.trim(),
            bullets: slide.bullets
              .map((bullet) => ({
                point: bullet.point.trim(),
                description: bullet.description.trim(),
              }))
              .filter((bullet) => bullet.point || bullet.description),
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || "Unable to create the PowerPoint file.",
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = encode(arrayBuffer);

      const fileName = `${(deckTitle || "presentation").replace(
        /[^a-z0-9\-_ ]/gi,
        "_",
      )}.pptx`;

      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          dialogTitle: "Save or share your presentation",
          UTI: "org.openxmlformats.presentationml.presentation",
        });
      } else {
        Alert.alert(
          "Presentation saved",
          `Your file is available at:\n${fileUri}`,
        );
      }
    } catch (error) {
      Alert.alert(
        "Download failed",
        error instanceof Error
          ? error.message
          : "Unable to download the presentation.",
      );
    } finally {
      setDownloading(false);
    }
  };

  // ─── UI ───────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Presentation size={25} color="#FDA4AF" />
            </View>

            <Text style={styles.heading}>Lesson Slide Studio</Text>

            <Text style={styles.subtitle}>
              Turn any topic or outline into a ready-to-present slide deck.
            </Text>
          </View>

          {/* Generation Form */}

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Create your presentation</Text>

            <Text style={styles.label}>
              Topic <Text style={styles.required}>*</Text>
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Introduction to Artificial Intelligence"
              placeholderTextColor="#94A3B8"
              value={topic}
              onChangeText={setTopic}
              editable={!generating}
            />

            {/* Number of Slides */}

            <Text style={styles.label}>Number of slides</Text>

            <View style={styles.optionRow}>
              {[5, 8, 10, 15, 20].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => setSlideCount(count)}
                  style={[
                    styles.optionButton,
                    slideCount === count && styles.optionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      slideCount === count && styles.optionTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tone */}

            <Text style={styles.label}>Presentation tone</Text>

            <View style={styles.toneContainer}>
              {TONES.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setTone(item)}
                  style={[
                    styles.toneButton,
                    tone === item && styles.toneSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.toneText,
                      tone === item && styles.toneTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Outline */}

            <Text style={styles.label}>
              Rough outline <Text style={styles.optional}>(optional)</Text>
            </Text>

            <TextInput
              style={[styles.input, styles.outlineInput]}
              placeholder={
                "Add your main points or section headings...\n\n- Introduction\n- Main concepts\n- Examples\n- Conclusion"
              }
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={outline}
              onChangeText={setOutline}
              editable={!generating}
            />

            {/* Generate Button */}

            <TouchableOpacity
              style={[
                styles.generateButton,
                generating && styles.disabledButton,
              ]}
              onPress={handleGenerate}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Sparkles size={19} color="#FFFFFF" />
              )}

              <Text style={styles.generateButtonText}>
                {generating
                  ? "Generating presentation..."
                  : slides.length > 0
                    ? "Regenerate deck"
                    : "Generate presentation"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}

          {generating && (
            <View style={styles.emptyPanel}>
              <ActivityIndicator size="large" color="#2D5F6E" />

              <Text style={styles.emptyTitle}>Creating your presentation</Text>

              <Text style={styles.emptyText}>
                Please wait while AI prepares your slides.
              </Text>
            </View>
          )}

          {/* Empty State */}

          {slides.length === 0 && !generating && (
            <View style={styles.emptyPanel}>
              <View style={styles.emptyIcon}>
                <FileText size={27} color="#64748B" />
              </View>

              <Text style={styles.emptyTitle}>
                Your slides will appear here
              </Text>

              <Text style={styles.emptyText}>
                Enter a topic above and generate your first presentation draft.
              </Text>
            </View>
          )}

          {/* Generated Deck */}

          {slides.length > 0 && !generating && (
            <View style={styles.deckSection}>
              <View style={styles.deckHeader}>
                <Text style={styles.deckHeading}>Your presentation</Text>

                <Text style={styles.slideCount}>{slides.length} slides</Text>
              </View>

              {/* Deck Title */}

              <View style={styles.panel}>
                <Text style={styles.label}>Presentation title</Text>

                <TextInput
                  value={deckTitle}
                  onChangeText={setDeckTitle}
                  style={styles.input}
                  placeholder="Presentation title"
                />
              </View>

              {/* Slide Cards */}

              {slides.map((slide, slideIndex) => (
                <View key={slideIndex} style={styles.slideCard}>
                  <View style={styles.slideHeader}>
                    <View style={styles.slideNumber}>
                      <Text style={styles.slideNumberText}>
                        {slideIndex + 1}
                      </Text>
                    </View>

                    <Text style={styles.slideLabel}>
                      Slide {slideIndex + 1}
                    </Text>

                    <View style={styles.slideActions}>
                      <TouchableOpacity
                        onPress={() => moveSlide(slideIndex, -1)}
                        disabled={slideIndex === 0}
                        style={styles.iconButton}
                      >
                        <ChevronUp
                          size={19}
                          color={slideIndex === 0 ? "#CBD5E1" : "#475569"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => moveSlide(slideIndex, 1)}
                        disabled={slideIndex === slides.length - 1}
                        style={styles.iconButton}
                      >
                        <ChevronDown
                          size={19}
                          color={
                            slideIndex === slides.length - 1
                              ? "#CBD5E1"
                              : "#475569"
                          }
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => removeSlide(slideIndex)}
                        style={styles.iconButton}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Slide Title */}

                  <Text style={styles.fieldLabel}>Slide title</Text>

                  <TextInput
                    value={slide.title}
                    onChangeText={(value) =>
                      updateSlideTitle(slideIndex, value)
                    }
                    style={styles.slideTitleInput}
                    placeholder="Enter slide title"
                  />

                  {/* Bullets */}

                  <Text style={styles.fieldLabel}>
                    Content and bullet points
                  </Text>

                  {slide.bullets.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.bulletCard}>
                      <View style={styles.bulletHeader}>
                        <View style={styles.bulletDot} />

                        <Text style={styles.bulletLabel}>
                          Point {bulletIndex + 1}
                        </Text>

                        <TouchableOpacity
                          onPress={() => removeBullet(slideIndex, bulletIndex)}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        value={bullet.point}
                        onChangeText={(value) =>
                          updateBullet(slideIndex, bulletIndex, "point", value)
                        }
                        style={styles.bulletInput}
                        placeholder="Short heading"
                      />

                      <TextInput
                        value={bullet.description}
                        onChangeText={(value) =>
                          updateBullet(
                            slideIndex,
                            bulletIndex,
                            "description",
                            value,
                          )
                        }
                        style={[styles.bulletInput, styles.descriptionInput]}
                        placeholder="Add a detailed explanation..."
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  ))}

                  {/* Add Bullet */}

                  <TouchableOpacity
                    style={styles.addBulletButton}
                    onPress={() => addBullet(slideIndex)}
                  >
                    <Plus size={16} color="#2D5F6E" />
                    <Text style={styles.addBulletText}>Add bullet point</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add Slide */}

              <TouchableOpacity
                style={styles.addSlideButton}
                onPress={addSlide}
              >
                <Plus size={19} color="#FFFFFF" />
                <Text style={styles.addSlideText}>Add another slide</Text>
              </TouchableOpacity>

              {/* Download */}

              <TouchableOpacity
                style={[
                  styles.downloadButton,
                  downloading && styles.disabledButton,
                ]}
                onPress={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Download size={19} color="#FFFFFF" />
                )}

                <Text style={styles.downloadText}>
                  {downloading
                    ? "Preparing PowerPoint..."
                    : "Download PowerPoint"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.downloadHint}>
                Export your presentation as a PPTX file and save or share it
                from your phone.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  container: {
    flex: 1,
    backgroundColor: "#0A1238",
  },

  content: {
    padding: 18,
    paddingBottom: 50,
  },

  header: {
    alignItems: "center",
    marginBottom: 25,
    marginTop: 15,
  },

  headerIcon: {
    marginBottom: 10,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
  },

  subtitle: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
    maxWidth: 310,
  },

  panel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 19,
    marginBottom: 20,
    elevation: 4,
  },

  panelTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0A1238",
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 9,
    marginTop: 15,
  },

  required: {
    color: "#EF4444",
  },

  optional: {
    color: "#94A3B8",
    fontWeight: "400",
  },

  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: "#1E293B",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  outlineInput: {
    height: 125,
    lineHeight: 21,
  },

  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  optionButton: {
    minWidth: 45,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  optionSelected: {
    backgroundColor: "#0A1238",
    borderColor: "#0A1238",
  },

  optionText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },

  optionTextSelected: {
    color: "#FFFFFF",
  },

  toneContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  toneButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },

  toneSelected: {
    backgroundColor: "#0A1238",
    borderColor: "#0A1238",
  },

  toneText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },

  toneTextSelected: {
    color: "#FFFFFF",
  },

  generateButton: {
    backgroundColor: "#2D5F6E",
    height: 52,
    borderRadius: 13,
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  generateButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  disabledButton: {
    opacity: 0.6,
  },

  emptyPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    minHeight: 200,
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyTitle: {
    color: "#0A1238",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 9,
  },

  deckSection: {
    marginTop: 5,
  },

  deckHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  deckHeading: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  slideCount: {
    color: "#CBD5E1",
    fontSize: 12,
  },

  slideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
  },

  slideHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  slideNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFE4E6",
    alignItems: "center",
    justifyContent: "center",
  },

  slideNumberText: {
    color: "#BE123C",
    fontSize: 13,
    fontWeight: "800",
  },

  slideLabel: {
    color: "#0A1238",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 9,
    flex: 1,
  },

  slideActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  iconButton: {
    padding: 7,
  },

  fieldLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 8,
  },

  slideTitleInput: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 9,
    marginBottom: 12,
  },

  bulletCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  bulletHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  bulletDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#2D5F6E",
    marginRight: 8,
  },

  bulletLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },

  bulletInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 11,
    fontSize: 13,
    color: "#1E293B",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  descriptionInput: {
    minHeight: 75,
    lineHeight: 19,
  },

  addBulletButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 9,
    gap: 6,
  },

  addBulletText: {
    color: "#2D5F6E",
    fontSize: 12,
    fontWeight: "700",
  },

  addSlideButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#94A3B8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginBottom: 15,
  },

  addSlideText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  downloadButton: {
    height: 52,
    backgroundColor: "#E54865",
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  downloadText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  downloadHint: {
    color: "#CBD5E1",
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 10,
  },
});
