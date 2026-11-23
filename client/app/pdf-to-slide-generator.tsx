import React, { useState } from "react";
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
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { encode } from "base64-arraybuffer";

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

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL}/api/slides`;
const MAX_FILE_MB = 15;
const TONES: Tone[] = ["Conversational", "Formal", "Academic", "Simple"];

export default function PdfToSlideGenerator() {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [slideCount, setSlideCount] = useState("8");
  const [tone, setTone] = useState<Tone>("Conversational");

  const [deckId, setDeckId] = useState<string | null>(null);
  const [deckTitle, setDeckTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);

  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const selectPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const selected = result.assets[0];

      if (selected.mimeType && selected.mimeType !== "application/pdf") {
        Alert.alert("Invalid file", "Please select a PDF file.");
        return;
      }

      if (selected.size && selected.size > MAX_FILE_MB * 1024 * 1024) {
        Alert.alert(
          "File too large",
          `Please select a PDF smaller than ${MAX_FILE_MB} MB.`,
        );
        return;
      }

      setFile(selected);
      setSlides([]);
      setDeckId(null);
      setDeckTitle("");
    } catch {
      Alert.alert("Error", "Unable to select the PDF.");
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      Alert.alert("PDF required", "Please select a PDF first.");
      return;
    }

    const count = Math.min(20, Math.max(3, Number(slideCount) || 3));

    if (!API_BASE || API_BASE.startsWith("undefined")) {
      Alert.alert(
        "API configuration missing",
        "Please check EXPO_PUBLIC_API_URL in your .env file.",
      );
      return;
    }

    setGenerating(true);
    setDeckId(null);

    try {
      const formData = new FormData();

      formData.append("pdf", {
        uri: file.uri,
        name: file.name || "document.pdf",
        type: "application/pdf",
      } as any);

      formData.append("slideCount", String(count));
      formData.append("tone", tone);

      const response = await fetch(`${API_BASE}/from-pdf`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const data: GenerateResponse = await response.json();

      if (!response.ok || !data.success || !data.slides) {
        Alert.alert(
          "Generation failed",
          data.message || "Couldn't generate slides from this PDF.",
        );
        return;
      }

      setDeckId(data.deckId ?? null);
      setDeckTitle(data.deckTitle || file.name.replace(/\.pdf$/i, ""));
      setSlides(data.slides);

      Alert.alert(
        "Success",
        `${data.slides.length} slides generated successfully.`,
      );
    } catch (error) {
      console.error("PDF slide generation error:", error);
      Alert.alert(
        "Connection error",
        "Couldn't reach the server. Check your API URL and connection.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateSlideTitle = (slideIndex: number, value: string) => {
    setSlides((previous) =>
      previous.map((slide, index) =>
        index === slideIndex ? { ...slide, title: value } : slide,
      ),
    );
  };

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

  const addSlide = () => {
    setSlides((previous) => [
      ...previous,
      {
        title: "New slide",
        bullets: [{ point: "", description: "" }],
      },
    ]);
  };

  const removeSlide = (slideIndex: number) => {
    setSlides((previous) =>
      previous.filter((_, index) => index !== slideIndex),
    );
  };

  const moveSlide = (slideIndex: number, direction: -1 | 1) => {
    setSlides((previous) => {
      const target = slideIndex + direction;

      if (target < 0 || target >= previous.length) return previous;

      const next = [...previous];
      [next[slideIndex], next[target]] = [next[target], next[slideIndex]];

      return next;
    });
  };

  const handleDownload = async () => {
    if (slides.length === 0) {
      Alert.alert("No slides", "Generate a deck before downloading.");
      return;
    }

    if (slides.some((slide) => !slide.title.trim())) {
      Alert.alert(
        "Missing title",
        "Every slide needs a title before exporting.",
      );
      return;
    }

    setDownloading(true);

    try {
      const payload = {
        deckId,
        deckTitle: deckTitle.trim() || "Presentation",
        slides: slides.map((slide) => ({
          title: slide.title.trim(),
          bullets: slide.bullets
            .map((bullet) => ({
              point: bullet.point.trim(),
              description: bullet.description.trim(),
            }))
            .filter((bullet) => bullet.point || bullet.description),
        })),
      };

      const response = await fetch(`${API_BASE}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Couldn't build the presentation.",
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = encode(arrayBuffer);

      const safeName = (deckTitle.trim() || "presentation").replace(
        /[^a-z0-9\-_ ]/gi,
        "_",
      );

      const fileUri = `${FileSystem.cacheDirectory}${safeName}.pptx`;

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert("File saved", `Presentation saved at: ${fileUri}`);
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        dialogTitle: "Share your presentation",
        UTI: "org.openxmlformats.presentationml.presentation",
      });
    } catch (error) {
      console.error("PPTX download error:", error);
      Alert.alert(
        "Download failed",
        error instanceof Error
          ? error.message
          : "Couldn't download the presentation.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📄</Text>
        <Text style={styles.heading}>PDF Lesson Studio</Text>
        <Text style={styles.subtitle}>
          Turn lecture notes and research PDFs into structured, editable slide
          presentations.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>PDF document</Text>

        <TouchableOpacity
          style={styles.uploadBox}
          onPress={selectPDF}
          activeOpacity={0.8}
        >
          <Text style={styles.uploadIcon}>📁</Text>
          <Text style={styles.uploadTitle}>
            {file ? file.name : "Choose a PDF file"}
          </Text>
          <Text style={styles.uploadHint}>
            {file
              ? `${((file.size || 0) / (1024 * 1024)).toFixed(1)} MB`
              : "PDF only • Maximum 15 MB"}
          </Text>
        </TouchableOpacity>

        {file && (
          <TouchableOpacity onPress={() => setFile(null)}>
            <Text style={styles.removeFile}>Remove selected PDF</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Number of slides (3–20)</Text>
        <TextInput
          style={styles.input}
          value={slideCount}
          onChangeText={(value) => setSlideCount(value.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          placeholder="8"
          placeholderTextColor="#9CA3AF"
          maxLength={2}
        />

        <Text style={styles.label}>Presentation tone</Text>
        <View style={styles.tones}>
          {TONES.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setTone(item)}
              style={[styles.toneButton, tone === item && styles.selectedTone]}
            >
              <Text
                style={[
                  styles.toneText,
                  tone === item && styles.selectedToneText,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.generateButton,
            (!file || generating) && styles.disabledButton,
          ]}
          onPress={handleGenerate}
          disabled={!file || generating}
        >
          {generating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.generateButtonText}>
              ✨ Generate slides from PDF
            </Text>
          )}
        </TouchableOpacity>

        {generating && (
          <Text style={styles.loadingText}>
            Reading PDF and generating your presentation...
          </Text>
        )}
      </View>

      {slides.length > 0 && (
        <View style={styles.deckSection}>
          <Text style={styles.deckHeading}>Your presentation</Text>

          <TextInput
            style={styles.deckTitle}
            value={deckTitle}
            onChangeText={setDeckTitle}
            placeholder="Presentation title"
            placeholderTextColor="#9CA3AF"
          />

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
              <Text style={styles.generateButtonText}>
                ↓ Download / Share PPTX
              </Text>
            )}
          </TouchableOpacity>

          {slides.map((slide, slideIndex) => (
            <View key={slideIndex} style={styles.slideCard}>
              <View style={styles.slideHeader}>
                <Text style={styles.slideNumber}>SLIDE {slideIndex + 1}</Text>

                <View style={styles.slideActions}>
                  <TouchableOpacity
                    onPress={() => moveSlide(slideIndex, -1)}
                    disabled={slideIndex === 0}
                  >
                    <Text style={styles.actionText}>↑</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => moveSlide(slideIndex, 1)}
                    disabled={slideIndex === slides.length - 1}
                  >
                    <Text style={styles.actionText}>↓</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => removeSlide(slideIndex)}>
                    <Text style={styles.deleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TextInput
                style={styles.slideTitleInput}
                value={slide.title}
                onChangeText={(value) => updateSlideTitle(slideIndex, value)}
                placeholder="Slide title"
                placeholderTextColor="#9CA3AF"
              />

              {slide.bullets.map((bullet, bulletIndex) => (
                <View key={bulletIndex} style={styles.bulletCard}>
                  <TextInput
                    style={styles.bulletPointInput}
                    value={bullet.point}
                    onChangeText={(value) =>
                      updateBullet(slideIndex, bulletIndex, "point", value)
                    }
                    placeholder="Point or heading"
                    placeholderTextColor="#9CA3AF"
                  />

                  <TextInput
                    style={styles.descriptionInput}
                    value={bullet.description}
                    onChangeText={(value) =>
                      updateBullet(
                        slideIndex,
                        bulletIndex,
                        "description",
                        value,
                      )
                    }
                    placeholder="Add a detailed explanation..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    onPress={() => removeBullet(slideIndex, bulletIndex)}
                  >
                    <Text style={styles.deleteBullet}>Remove bullet</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => addBullet(slideIndex)}
                style={styles.addBulletButton}
              >
                <Text style={styles.addText}>+ Add bullet</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addSlideButton} onPress={addSlide}>
            <Text style={styles.addSlideText}>+ Add new slide</Text>
          </TouchableOpacity>
        </View>
      )}

      {slides.length === 0 && !generating && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📑</Text>
          <Text style={styles.emptyText}>
            Select a PDF above to generate your first presentation.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B172A",
  },
  container: {
    padding: 18,
    paddingBottom: 45,
  },
  header: {
    alignItems: "center",
    marginTop: 22,
    marginBottom: 25,
  },
  headerIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#B7C4D5",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 9,
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
  },
  label: {
    color: "#263548",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 9,
    marginTop: 13,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#94A3B8",
    borderRadius: 13,
    backgroundColor: "#F8FAFC",
    padding: 23,
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 30,
    marginBottom: 8,
  },
  uploadTitle: {
    color: "#24566A",
    fontWeight: "700",
    fontSize: 14,
    textAlign: "center",
  },
  uploadHint: {
    color: "#8995A5",
    fontSize: 12,
    marginTop: 6,
  },
  removeFile: {
    color: "#DC4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 9,
  },
  input: {
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 13,
    color: "#263548",
    fontSize: 15,
  },
  tones: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  toneButton: {
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedTone: {
    backgroundColor: "#E0F2F5",
    borderColor: "#2D5F6E",
  },
  toneText: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  selectedToneText: {
    color: "#24566A",
  },
  generateButton: {
    backgroundColor: "#2D5F6E",
    borderRadius: 11,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    padding: 12,
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  disabledButton: {
    opacity: 0.55,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  deckSection: {
    marginTop: 28,
  },
  deckHeading: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginBottom: 12,
  },
  deckTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#42536B",
    paddingVertical: 10,
    marginBottom: 15,
  },
  downloadButton: {
    backgroundColor: "#0891B2",
    padding: 15,
    borderRadius: 11,
    alignItems: "center",
    marginBottom: 18,
  },
  slideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 14,
  },
  slideHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  slideNumber: {
    color: "#0891B2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  slideActions: {
    flexDirection: "row",
    gap: 17,
    alignItems: "center",
  },
  actionText: {
    color: "#475569",
    fontSize: 22,
    fontWeight: "700",
  },
  deleteText: {
    color: "#DC4444",
    fontSize: 18,
    fontWeight: "700",
  },
  slideTitleInput: {
    color: "#1E293B",
    fontSize: 17,
    fontWeight: "700",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 9,
    marginBottom: 12,
  },
  bulletCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 11,
    marginBottom: 10,
  },
  bulletPointInput: {
    color: "#263548",
    fontWeight: "700",
    fontSize: 14,
    paddingVertical: 7,
  },
  descriptionInput: {
    color: "#64748B",
    fontSize: 13,
    minHeight: 65,
    paddingVertical: 7,
  },
  deleteBullet: {
    color: "#DC4444",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 5,
  },
  addBulletButton: {
    alignSelf: "flex-start",
    paddingVertical: 9,
  },
  addText: {
    color: "#2D5F6E",
    fontSize: 13,
    fontWeight: "700",
  },
  addSlideButton: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#718096",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    marginTop: 3,
  },
  addSlideText: {
    color: "#D3E2EF",
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    padding: 25,
    marginTop: 18,
    backgroundColor: "#FFFFFF0D",
    borderRadius: 15,
  },
  emptyIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  emptyText: {
    color: "#B7C4D5",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
});
