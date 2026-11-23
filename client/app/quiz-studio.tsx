
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Switch,
    Alert,
} from "react-native";

import * as DocumentPicker from "expo-document-picker";

import {
    Sparkles,
    FileText,
    UploadCloud,
    CheckCircle,
    Plus,
    Wand2,
} from "lucide-react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "");

const API_BASE = API_URL ? `${API_URL}/api/quiz` : "";

type Difficulty = "Easy" | "Medium" | "Hard";

type QuestionType = "MCQ" | "TrueFalse" | "ShortAnswer";

interface GeneratedQuestion {
    id: string;
    type: QuestionType;
    question: string;
    options: string[] | null;
    correctAnswer: string;
    explanation: string;
}

const QUESTION_TYPES: QuestionType[] = [
    "MCQ",
    "TrueFalse",
    "ShortAnswer",
];

export default function QuizStudioScreen() {
    const [mode, setMode] = useState<"topic" | "document">("topic");
    const [topic, setTopic] = useState("");

    const [docFile, setDocFile] =
        useState<DocumentPicker.DocumentPickerAsset | null>(null);

    const [docFocus, setDocFocus] = useState("");

    const [difficulty, setDifficulty] =
        useState<Difficulty>("Medium");

    const [questionCount, setQuestionCount] = useState(10);

    const [selectedTypes, setSelectedTypes] =
        useState<QuestionType[]>([]);

    const [generateExplanations, setGenerateExplanations] =
        useState(true);

    const [suggestedTitle, setSuggestedTitle] =
        useState("Untitled Quiz");

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [questions, setQuestions] =
        useState<GeneratedQuestion[]>([]);

    const [addedIds, setAddedIds] = useState<string[]>([]);

    const [showResults, setShowResults] = useState(false);

    const [error, setError] = useState("");

    // Safely extract backend error messages.
    const getErrorMessage = async (response: Response) => {
        try {
            const data = await response.json();

            return (
                data.message ||
                data.error ||
                `Request failed (${response.status})`
            );
        } catch {
            return `Request failed (${response.status})`;
        }
    };

    // Select a document.
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    "application/pdf",
                    "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "application/vnd.ms-powerpoint",
                    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                const file = result.assets[0];

                if (file.size && file.size > 20 * 1024 * 1024) {
                    Alert.alert(
                        "File too large",
                        "Maximum file size is 20MB."
                    );
                    return;
                }

                setDocFile(file);
                setError("");
            }
        } catch (err) {
            console.error("Document picker error:", err);

            Alert.alert(
                "Error",
                "Unable to select document."
            );
        }
    };

    // Toggle question types.
    const toggleType = (type: QuestionType) => {
        setSelectedTypes((previous) =>
            previous.includes(type)
                ? previous.filter((item) => item !== type)
                : [...previous, type]
        );
    };

    // Normalize questions returned by the backend.
    const normalizeQuestions = (items: any[]): GeneratedQuestion[] => {
        return items.map((item, index) => ({
            id: String(
                item.id ??
                item._id ??
                `question-${Date.now()}-${index}`
            ),
            type: item.type || "MCQ",
            question: item.question || "",
            options: Array.isArray(item.options)
                ? item.options
                : null,
            correctAnswer: item.correctAnswer ?? "",
            explanation: item.explanation ?? "",
        }));
    };

    // Generate quiz preview.
    const handleGenerate = async () => {
        setError("");

        if (!API_URL) {
            setError(
                "Backend API URL is not configured. Check your .env file."
            );
            return;
        }

        if (mode === "topic" && topic.trim().length < 5) {
            setError("Enter a topic with at least 5 characters.");
            return;
        }

        if (mode === "document" && !docFile) {
            setError("Please select a document.");
            return;
        }

        setLoading(true);

        try {
            const effectiveTypes =
                selectedTypes.length > 0
                    ? selectedTypes
                    : QUESTION_TYPES;

            let response: Response;

            if (mode === "document" && docFile) {
                const formData = new FormData();

                formData.append(
                    "document",
                    {
                        uri: docFile.uri,
                        name: docFile.name,
                        type:
                            docFile.mimeType ||
                            "application/octet-stream",
                    } as any
                );

                formData.append("difficulty", difficulty);

                formData.append(
                    "questionCount",
                    String(questionCount)
                );

                formData.append(
                    "questionTypes",
                    JSON.stringify(effectiveTypes)
                );

                formData.append(
                    "generateExplanations",
                    String(generateExplanations)
                );

                if (docFocus.trim()) {
                    formData.append("focus", docFocus.trim());
                }

                response = await fetch(
                    `${API_BASE}/generate-preview-document`,
                    {
                        method: "POST",
                        credentials: "include",
                        body: formData,
                    }
                );
            } else {
                response = await fetch(
                    `${API_BASE}/generate-preview`,
                    {
                        method: "POST",
                        credentials: "include",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            topic: topic.trim(),
                            difficulty,
                            questionCount,
                            questionTypes: effectiveTypes,
                            generateExplanations,
                        }),
                    }
                );
            }

            if (!response.ok) {
                throw new Error(
                    await getErrorMessage(response)
                );
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(
                    data.message || "Quiz generation failed."
                );
            }

            const generatedQuestions = normalizeQuestions(
                data.questions || []
            );

            if (generatedQuestions.length === 0) {
                throw new Error(
                    "The AI did not return any questions. Please try again."
                );
            }

            setSuggestedTitle(
                data.suggestedTitle || "Untitled Quiz"
            );

            setQuestions(generatedQuestions);
            setAddedIds([]);
            setShowResults(true);
        } catch (err: any) {
            console.error("Quiz generation error:", err);

            setError(
                err.message ||
                "Unable to connect to the backend server."
            );
        } finally {
            setLoading(false);
        }
    };

    // Add an individual question.
    const addQuestion = (id: string) => {
        setAddedIds((previous) =>
            previous.includes(id)
                ? previous
                : [...previous, id]
        );
    };

    // Add all questions.
    const addAllQuestions = () => {
        setAddedIds(
            questions.map((question) => question.id)
        );
    };

    // Save quiz to backend.
    const handleSaveQuiz = async () => {
        const selectedQuestions = questions.filter(
            (question) => addedIds.includes(question.id)
        );

        if (!suggestedTitle.trim()) {
            setError("Please enter a quiz title.");
            return;
        }

        if (selectedQuestions.length === 0) {
            setError("Please add at least one question.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await fetch(
                `${API_BASE}`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        title: suggestedTitle.trim(),
                        difficulty,
                        questions: selectedQuestions,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    await getErrorMessage(response)
                );
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(
                    data.message || "Failed to save quiz."
                );
            }

            Alert.alert(
                "Quiz Saved!",
                "Your quiz has been saved successfully.",
                [
                    {
                        text: "Continue",
                        onPress: () => {
                            setShowResults(false);
                            setQuestions([]);
                            setAddedIds([]);
                            setSuggestedTitle("Untitled Quiz");
                            setTopic("");
                            setDocFile(null);
                            setDocFocus("");
                            setError("");
                        },
                    },
                ]
            );
        } catch (err: any) {
            console.error("Save quiz error:", err);

            setError(
                err.message || "Unable to save quiz."
            );
        } finally {
            setSaving(false);
        }
    };

    // Start a fresh quiz.
    const resetQuiz = () => {
        setShowResults(false);
        setQuestions([]);
        setAddedIds([]);
        setSuggestedTitle("Untitled Quiz");
        setTopic("");
        setDocFile(null);
        setDocFocus("");
        setSelectedTypes([]);
        setDifficulty("Medium");
        setQuestionCount(10);
        setGenerateExplanations(true);
        setError("");
    };

    // Reusable selection button.
    const OptionButton = ({
        label,
        active,
        onPress,
    }: {
        label: string;
        active: boolean;
        onPress: () => void;
    }) => (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.option,
                active && styles.activeOption,
            ]}
        >
            <Text
                style={[
                    styles.optionText,
                    active && styles.activeOptionText,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.logo}>
                    <Sparkles color="#5EEAD4" size={25} />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>
                        Quiz Studio
                    </Text>

                    <Text style={styles.subtitle}>
                        AI-powered quiz generator
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {!showResults ? (
                    <>
                        <Text style={styles.sectionTitle}>
                            Create your quiz
                        </Text>

                        <Text style={styles.description}>
                            Turn any topic or lesson document into
                            an intelligent quiz.
                        </Text>

                        <View style={styles.card}>
                            <Text style={styles.label}>
                                Choose input method
                            </Text>

                            <View style={styles.row}>
                                <OptionButton
                                    label="From Topic"
                                    active={mode === "topic"}
                                    onPress={() => {
                                        setMode("topic");
                                        setError("");
                                    }}
                                />

                                <OptionButton
                                    label="From Document"
                                    active={mode === "document"}
                                    onPress={() => {
                                        setMode("document");
                                        setError("");
                                    }}
                                />
                            </View>

                            {mode === "topic" ? (
                                <>
                                    <Text style={styles.label}>
                                        Quiz Topic
                                    </Text>

                                    <TextInput
                                        style={styles.textArea}
                                        placeholder="e.g. React Hooks, Machine Learning..."
                                        placeholderTextColor="#94A3B8"
                                        multiline
                                        value={topic}
                                        onChangeText={setTopic}
                                    />
                                </>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.uploadBox}
                                        onPress={pickDocument}
                                    >
                                        <UploadCloud
                                            color="#2563EB"
                                            size={30}
                                        />

                                        <Text style={styles.uploadTitle}>
                                            Upload your document
                                        </Text>

                                        <Text style={styles.uploadSubtitle}>
                                            PDF, DOC, DOCX, PPT, PPTX
                                        </Text>
                                    </TouchableOpacity>

                                    {docFile && (
                                        <View style={styles.fileRow}>
                                            <FileText
                                                color="#2563EB"
                                                size={20}
                                            />

                                            <Text
                                                style={styles.fileName}
                                                numberOfLines={1}
                                            >
                                                {docFile.name}
                                            </Text>

                                            <TouchableOpacity
                                                onPress={() =>
                                                    setDocFile(null)
                                                }
                                            >
                                                <Text style={styles.removeText}>
                                                    Remove
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    <TextInput
                                        style={styles.input}
                                        placeholder="Focus areas (optional)"
                                        placeholderTextColor="#94A3B8"
                                        value={docFocus}
                                        onChangeText={setDocFocus}
                                    />
                                </>
                            )}

                            <Text style={styles.label}>
                                Number of questions
                            </Text>

                            <View style={styles.row}>
                                {[5, 10, 15].map((number) => (
                                    <OptionButton
                                        key={number}
                                        label={String(number)}
                                        active={questionCount === number}
                                        onPress={() =>
                                            setQuestionCount(number)
                                        }
                                    />
                                ))}
                            </View>

                            <Text style={styles.label}>
                                Difficulty level
                            </Text>

                            <View style={styles.row}>
                                {(
                                    ["Easy", "Medium", "Hard"] as Difficulty[]
                                ).map((level) => (
                                    <OptionButton
                                        key={level}
                                        label={level}
                                        active={difficulty === level}
                                        onPress={() =>
                                            setDifficulty(level)
                                        }
                                    />
                                ))}
                            </View>

                            <Text style={styles.label}>
                                Question types
                            </Text>

                            <View style={styles.wrapRow}>
                                {QUESTION_TYPES.map((type) => (
                                    <OptionButton
                                        key={type}
                                        label={
                                            type === "MCQ"
                                                ? "Multiple Choice"
                                                : type === "TrueFalse"
                                                    ? "True / False"
                                                    : "Short Answer"
                                        }
                                        active={selectedTypes.includes(type)}
                                        onPress={() => toggleType(type)}
                                    />
                                ))}
                            </View>

                            <View style={styles.switchRow}>
                                <View>
                                    <Text style={styles.label}>
                                        Generate explanations
                                    </Text>

                                    <Text style={styles.smallText}>
                                        Include answers and explanations
                                    </Text>
                                </View>

                                <Switch
                                    value={generateExplanations}
                                    onValueChange={setGenerateExplanations}
                                    trackColor={{
                                        true: "#2563EB",
                                    }}
                                />
                            </View>

                            {error ? (
                                <Text style={styles.error}>
                                    {error}
                                </Text>
                            ) : null}

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    loading && styles.disabledButton,
                                ]}
                                onPress={handleGenerate}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <>
                                        <Wand2
                                            color="#FFFFFF"
                                            size={19}
                                        />

                                        <Text style={styles.primaryButtonText}>
                                            Generate Quiz
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Generated questions */}
                        <View style={styles.resultHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>
                                    Review Questions
                                </Text>

                                <Text style={styles.description}>
                                    {addedIds.length} of {questions.length} questions added
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => {
                                    setShowResults(false);
                                    setError("");
                                }}
                            >
                                <Text style={styles.editText}>
                                    Edit Setup
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.resultTitleCard}>
                            <Text style={styles.resultTitleLabel}>
                                Suggested Quiz Title
                            </Text>

                            <TextInput
                                style={styles.resultTitleInput}
                                value={suggestedTitle}
                                onChangeText={setSuggestedTitle}
                                placeholder="Enter quiz title"
                                placeholderTextColor="#94A3B8"
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.addAllButton}
                            onPress={addAllQuestions}
                        >
                            <Plus color="#FFFFFF" size={18} />

                            <Text style={styles.primaryButtonText}>
                                Add All Questions
                            </Text>
                        </TouchableOpacity>

                        {questions.map((question, index) => {
                            const isAdded = addedIds.includes(question.id);

                            return (
                                <View
                                    key={question.id}
                                    style={styles.questionCard}
                                >
                                    <View style={styles.questionTop}>
                                        <Text style={styles.questionNumber}>
                                            QUESTION {index + 1}
                                        </Text>

                                        <Text style={styles.typeBadge}>
                                            {question.type}
                                        </Text>
                                    </View>

                                    <Text style={styles.questionText}>
                                        {question.question}
                                    </Text>

                                    {question.options?.map((option, i) => (
                                        <Text
                                            key={i}
                                            style={styles.questionOption}
                                        >
                                            {String.fromCharCode(65 + i)}. {option}
                                        </Text>
                                    ))}

                                    {question.explanation ? (
                                        <Text style={styles.explanation}>
                                            Explanation: {question.explanation}
                                        </Text>
                                    ) : null}

                                    <TouchableOpacity
                                        style={[
                                            styles.addButton,
                                            isAdded && styles.addedButton,
                                        ]}
                                        onPress={() =>
                                            addQuestion(question.id)
                                        }
                                        disabled={isAdded}
                                    >
                                        {isAdded ? (
                                            <CheckCircle
                                                color="#059669"
                                                size={17}
                                            />
                                        ) : (
                                            <Plus
                                                color="#FFFFFF"
                                                size={17}
                                            />
                                        )}

                                        <Text
                                            style={[
                                                styles.addButtonText,
                                                isAdded && styles.addedButtonText,
                                            ]}
                                        >
                                            {isAdded
                                                ? "Added"
                                                : "Add Question"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}

                        {error ? (
                            <Text style={styles.error}>
                                {error}
                            </Text>
                        ) : null}

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                saving && styles.disabledButton,
                            ]}
                            onPress={handleSaveQuiz}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    Save Quiz ({addedIds.length})
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={resetQuiz}
                        >
                            <Text style={styles.secondaryButtonText}>
                                Create Another Quiz
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

// Design system
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A1238",
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingTop: 55,
        paddingBottom: 20,
        gap: 12,
    },

    logo: {
        width: 45,
        height: 45,
        borderRadius: 14,
        backgroundColor: "#172554",
        justifyContent: "center",
        alignItems: "center",
    },

    title: {
        color: "#FFFFFF",
        fontSize: 23,
        fontWeight: "700",
    },

    subtitle: {
        color: "#94A3B8",
        fontSize: 12,
        marginTop: 3,
    },

    content: {
        padding: 18,
        paddingBottom: 45,
    },

    sectionTitle: {
        fontSize: 23,
        color: "#FFFFFF",
        fontWeight: "700",
    },

    description: {
        color: "#94A3B8",
        fontSize: 13,
        marginTop: 6,
        marginBottom: 20,
    },

    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 18,
    },

    label: {
        fontSize: 14,
        color: "#334155",
        fontWeight: "600",
        marginTop: 18,
        marginBottom: 10,
    },

    row: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 9,
    },

    wrapRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },

    option: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
    },

    activeOption: {
        backgroundColor: "#0A1238",
        borderColor: "#0A1238",
    },

    optionText: {
        fontSize: 12,
        color: "#475569",
        fontWeight: "600",
    },

    activeOptionText: {
        color: "#FFFFFF",
    },

    textArea: {
        minHeight: 105,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 13,
        textAlignVertical: "top",
        color: "#1E293B",
        fontSize: 14,
    },

    input: {
        borderWidth: 1,
        borderColor: "#E2E8F0",
        borderRadius: 11,
        padding: 13,
        marginTop: 14,
        color: "#1E293B",
    },

    uploadBox: {
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: "#93C5FD",
        borderRadius: 13,
        padding: 25,
        alignItems: "center",
        backgroundColor: "#EFF6FF",
    },

    uploadTitle: {
        color: "#1E40AF",
        fontWeight: "600",
        marginTop: 10,
    },

    uploadSubtitle: {
        color: "#64748B",
        fontSize: 11,
        marginTop: 5,
    },

    fileRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
    },

    fileName: {
        flex: 1,
        color: "#334155",
        fontSize: 12,
    },

    removeText: {
        color: "#DC2626",
        fontSize: 12,
    },

    switchRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 15,
    },

    smallText: {
        color: "#94A3B8",
        fontSize: 11,
    },

    primaryButton: {
        backgroundColor: "#0A1238",
        borderRadius: 30,
        minHeight: 50,
        marginTop: 22,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "row",
        gap: 9,
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontWeight: "700",
        fontSize: 14,
    },

    disabledButton: {
        opacity: 0.6,
    },

    error: {
        color: "#DC2626",
        fontSize: 13,
        marginTop: 12,
    },

    resultHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    editText: {
        color: "#5EEAD4",
        fontSize: 12,
        fontWeight: "600",
    },

    resultTitleCard: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 14,
        marginBottom: 15,
    },

    resultTitleLabel: {
        color: "#64748B",
        fontSize: 11,
        fontWeight: "700",
        marginBottom: 8,
    },

    resultTitleInput: {
        color: "#1E293B",
        fontSize: 16,
        fontWeight: "600",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        paddingVertical: 8,
    },

    addAllButton: {
        backgroundColor: "#2563EB",
        padding: 14,
        borderRadius: 12,
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: 8,
        marginBottom: 15,
    },

    questionCard: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 15,
        marginBottom: 13,
    },

    questionTop: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    questionNumber: {
        color: "#64748B",
        fontSize: 10,
        fontWeight: "700",
    },

    typeBadge: {
        color: "#2563EB",
        fontSize: 10,
        fontWeight: "700",
    },

    questionText: {
        color: "#1E293B",
        fontSize: 15,
        fontWeight: "600",
        marginTop: 12,
        lineHeight: 22,
    },

    questionOption: {
        color: "#475569",
        fontSize: 13,
        marginTop: 9,
    },

    explanation: {
        color: "#64748B",
        fontSize: 12,
        marginTop: 12,
        lineHeight: 19,
    },

    addButton: {
        backgroundColor: "#0A1238",
        padding: 11,
        borderRadius: 10,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 7,
        marginTop: 15,
    },

    addedButton: {
        backgroundColor: "#ECFDF5",
    },

    addButtonText: {
        color: "#FFFFFF",
        fontWeight: "600",
        fontSize: 12,
    },

    addedButtonText: {
        color: "#059669",
    },

    secondaryButton: {
        padding: 14,
        alignItems: "center",
        marginTop: 8,
    },

    secondaryButtonText: {
        color: "#5EEAD4",
        fontWeight: "600",
    },
});
