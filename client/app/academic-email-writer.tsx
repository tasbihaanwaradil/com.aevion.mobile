
import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "form" | "review";
type EmailTone = "Formal" | "Professional" | "Friendly" | "Respectful";

const TONES: {
    value: EmailTone;
    icon: keyof typeof Ionicons.glyphMap;
    description: string;
}[] = [
        {
            value: "Formal",
            icon: "briefcase-outline",
            description: "Official academic communication",
        },
        {
            value: "Professional",
            icon: "school-outline",
            description: "Clear and professional",
        },
        {
            value: "Friendly",
            icon: "chatbubble-outline",
            description: "Warm and approachable",
        },
        {
            value: "Respectful",
            icon: "heart-outline",
            description: "Polite and considerate",
        },
    ];

export default function AcademicEmailWriterScreen() {
    const [step, setStep] = useState<Step>("form");

    const [senderName, setSenderName] = useState("");
    const [recipient, setRecipient] = useState("");
    const [recipientEmail, setRecipientEmail] = useState("");
    const [purpose, setPurpose] = useState("");
    const [tone, setTone] = useState<EmailTone>("Professional");

    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [originalSubject, setOriginalSubject] = useState("");
    const [originalBody, setOriginalBody] = useState("");
    const [emailId, setEmailId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [copied, setCopied] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // GENERATE EMAIL

    const handleGenerate = async () => {
        setError("");
        setSuccessMsg("");

        if (!senderName.trim()) {
            setError("Please enter your name.");
            return;
        }

        if (!recipient.trim()) {
            setError("Please enter the recipient's name.");
            return;
        }

        if (!purpose.trim() || purpose.trim().length < 10) {
            setError("Please describe the purpose of your email in more detail.");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post("/api/academic-email/generate", {
                senderName: senderName.trim(),
                recipient: recipient.trim(),
                recipientEmail: recipientEmail.trim(),
                purpose: purpose.trim(),
                tone,
            });

            const data = response.data;

            if (data.success && data.email) {
                setSubject(data.email.subject || "");
                setBody(data.email.body || "");
                setOriginalSubject(data.email.subject || "");
                setOriginalBody(data.email.body || "");
                setEmailId(data.emailId ?? null);
                setSent(false);
                setCopied(false);
                setStep("review");
            } else {
                setError(data.message || "Unable to generate your email.");
            }
        } catch (err: any) {
            console.log(
                "Academic email generation error:",
                err?.response?.data || err.message
            );

            setError(
                err?.response?.data?.message ||
                "Unable to generate your email. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    // SEND EMAIL

    const handleSendEmail = async () => {
        setError("");
        setSuccessMsg("");

        if (!recipientEmail.trim()) {
            setError("Please enter the recipient's email address before sending.");
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(recipientEmail.trim())) {
            setError("Please enter a valid recipient email address.");
            return;
        }

        if (!subject.trim()) {
            setError("Please enter an email subject.");
            return;
        }

        if (!body.trim()) {
            setError("Please enter the email content.");
            return;
        }

        Alert.alert(
            "Send Academic Email",
            `Are you sure you want to send this email to ${recipientEmail.trim()}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send Email",
                    onPress: async () => {
                        try {
                            setSending(true);

                            const response = await api.post(
                                "/api/academic-email/send",
                                {
                                    recipientEmail: recipientEmail.trim(),
                                    subject: subject.trim(),
                                    body: body.trim(),
                                    senderName: senderName.trim(),
                                    emailId,
                                }
                            );

                            if (response.data?.success) {
                                setSent(true);
                                setSuccessMsg("Your email has been sent successfully.");
                            } else {
                                setError(
                                    response.data?.message || "Unable to send your email."
                                );
                            }
                        } catch (err: any) {
                            console.log(
                                "Academic email sending error:",
                                err?.response?.data || err.message
                            );

                            setError(
                                err?.response?.data?.message ||
                                "Unable to send your email. Please try again."
                            );
                        } finally {
                            setSending(false);
                        }
                    },
                },
            ]
        );
    };

    // COPY EMAIL

    const handleCopy = async () => {
        const content = `Subject: ${subject}\n\n${body}`;

        if (!subject.trim() && !body.trim()) return;

        await Clipboard.setStringAsync(content);
        setCopied(true);

        setTimeout(() => setCopied(false), 2000);
    };

    // RESET ORIGINAL CONTENT

    const handleResetOriginal = () => {
        setSubject(originalSubject);
        setBody(originalBody);
        setSent(false);
        setSuccessMsg("");
        setError("");
    };

    // EDIT INPUTS

    const handleEditInputs = () => {
        setError("");
        setSuccessMsg("");
        setStep("form");
    };

    // START OVER

    const handleStartOver = () => {
        setStep("form");
        setSubject("");
        setBody("");
        setOriginalSubject("");
        setOriginalBody("");
        setEmailId(null);
        setRecipient("");
        setRecipientEmail("");
        setPurpose("");
        setTone("Professional");
        setSent(false);
        setCopied(false);
        setError("");
        setSuccessMsg("");
    };

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
                    {/* HEADER */}

                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => router.back()}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Academic Email Writer</Text>
                            <Text style={styles.headerSubtitle}>Aevion.AI</Text>
                        </View>
                    </View>

                    {/* PAGE TITLE */}

                    <View style={styles.titleSection}>
                        <Text style={styles.pageTitle}>
                            {step === "form" ? "Write your email" : "Review your email"}
                        </Text>

                        <Text style={styles.pageSubtitle}>
                            {step === "form"
                                ? "Create professional academic emails with AI assistance."
                                : "Review and edit your generated email before sending."}
                        </Text>
                    </View>

                    {/* PROGRESS */}

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

                    {/* ERROR */}

                    {error ? (
                        <View style={styles.errorBox}>
                            <Ionicons name="alert-circle-outline" size={20} color="#B42318" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity onPress={() => setError("")}>
                                <Ionicons name="close" size={18} color="#B42318" />
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    {/* SUCCESS */}

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

                    {/* CREATE EMAIL */}

                    {step === "form" && (
                        <View>
                            {/* SENDER */}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Sender information</Text>
                                <Text style={styles.sectionDescription}>
                                    Enter your details for the email.
                                </Text>
                            </View>

                            <View style={styles.inputCard}>
                                <Text style={styles.inputLabel}>Your name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Tasbiha Anwar"
                                    placeholderTextColor="#9298AC"
                                    value={senderName}
                                    onChangeText={(text) => {
                                        setSenderName(text);
                                        setError("");
                                    }}
                                />
                            </View>

                            {/* RECIPIENT */}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recipient information</Text>
                                <Text style={styles.sectionDescription}>
                                    Who are you writing this email to?
                                </Text>
                            </View>

                            <View style={styles.inputCard}>
                                <Text style={styles.inputLabel}>Recipient name</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Professor Ahmed"
                                    placeholderTextColor="#9298AC"
                                    value={recipient}
                                    onChangeText={(text) => {
                                        setRecipient(text);
                                        setError("");
                                    }}
                                />

                                <View style={styles.fieldDivider} />

                                <Text style={styles.inputLabel}>
                                    Recipient email address
                                </Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="example@university.edu"
                                    placeholderTextColor="#9298AC"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    value={recipientEmail}
                                    onChangeText={(text) => {
                                        setRecipientEmail(text);
                                        setError("");
                                    }}
                                />
                                <Text style={styles.fieldHint}>
                                    Required when you want to send the email.
                                </Text>
                            </View>

                            {/* PURPOSE */}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Email purpose</Text>
                                <Text style={styles.sectionDescription}>
                                    Explain what you want to communicate.
                                </Text>
                            </View>

                            <View style={styles.inputCard}>
                                <TextInput
                                    style={styles.purposeInput}
                                    multiline
                                    textAlignVertical="top"
                                    placeholder={
                                        "Example:\n\nI want to request a meeting with my professor to discuss my final-year project progress and receive feedback on the next development phase."
                                    }
                                    placeholderTextColor="#9298AC"
                                    value={purpose}
                                    maxLength={1500}
                                    onChangeText={(text) => {
                                        setPurpose(text);
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
                                            Include relevant details for better results
                                        </Text>
                                    </View>

                                    <Text style={styles.characterCount}>
                                        {purpose.length}/1500
                                    </Text>
                                </View>
                            </View>

                            {/* TONE */}

                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Choose email tone</Text>
                                <Text style={styles.sectionDescription}>
                                    How should your email sound?
                                </Text>
                            </View>

                            <View style={styles.toneGrid}>
                                {TONES.map((item) => {
                                    const selected = tone === item.value;

                                    return (
                                        <TouchableOpacity
                                            key={item.value}
                                            onPress={() => setTone(item.value)}
                                            style={[
                                                styles.toneCard,
                                                selected && styles.toneCardSelected,
                                            ]}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={20}
                                                color={selected ? "#FFFFFF" : "#4F5875"}
                                            />

                                            <View style={styles.toneContent}>
                                                <Text
                                                    style={[
                                                        styles.toneText,
                                                        selected && styles.toneTextSelected,
                                                    ]}
                                                >
                                                    {item.value}
                                                </Text>
                                                <Text
                                                    style={[
                                                        styles.toneDescription,
                                                        selected && styles.toneDescriptionSelected,
                                                    ]}
                                                >
                                                    {item.description}
                                                </Text>
                                            </View>

                                            {selected && (
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={18}
                                                    color="#FFFFFF"
                                                />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* GENERATE */}

                            <TouchableOpacity
                                style={[
                                    styles.generateButton,
                                    loading && styles.buttonDisabled,
                                ]}
                                onPress={handleGenerate}
                                disabled={loading}
                                activeOpacity={0.85}
                            >
                                {loading ? (
                                    <>
                                        <ActivityIndicator size="small" color="#0A1238" />
                                        <Text style={styles.generateButtonText}>
                                            Generating email...
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="sparkles" size={19} color="#0A1238" />
                                        <Text style={styles.generateButtonText}>
                                            Generate Academic Email
                                        </Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={19}
                                            color="#0A1238"
                                        />
                                    </>
                                )}
                            </TouchableOpacity>

                            <Text style={styles.bottomHint}>
                                Aevion.AI will generate an email based on your information.
                            </Text>
                        </View>
                    )}

                    {/* REVIEW EMAIL */}

                    {step === "review" && (
                        <View>
                            {/* EMAIL META */}

                            <View style={styles.reviewMeta}>
                                <View style={styles.metaItem}>
                                    <Ionicons
                                        name="person-outline"
                                        size={17}
                                        color="#0A1238"
                                    />
                                    <Text style={styles.metaText} numberOfLines={1}>
                                        {recipient}
                                    </Text>
                                </View>

                                <View style={styles.metaDivider} />

                                <View style={styles.metaItem}>
                                    <Ionicons
                                        name="mail-outline"
                                        size={17}
                                        color="#0A1238"
                                    />
                                    <Text style={styles.metaText}>{tone}</Text>
                                </View>
                            </View>

                            {/* EDIT INPUTS */}

                            <TouchableOpacity
                                style={styles.editInputsButton}
                                onPress={handleEditInputs}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
                                <Text style={styles.editInputsText}>Edit inputs</Text>
                            </TouchableOpacity>

                            {/* PREVIEW HEADER */}

                            <View style={styles.previewHeader}>
                                <View>
                                    <Text style={styles.sectionTitle}>Generated email</Text>
                                    <Text style={styles.sectionDescription}>
                                        Review and edit before sending.
                                    </Text>
                                </View>

                                <View style={styles.aiBadge}>
                                    <Ionicons name="sparkles" size={13} color="#0A1238" />
                                    <Text style={styles.aiBadgeText}>AI Generated</Text>
                                </View>
                            </View>

                            {/* EMAIL EDITOR */}

                            <View style={styles.emailEditorCard}>
                                <View style={styles.emailEditorTop}>
                                    <View style={styles.emailIcon}>
                                        <Ionicons name="mail" size={19} color="#FFFFFF" />
                                    </View>

                                    <View>
                                        <Text style={styles.emailAuthorName}>Academic Email</Text>
                                        <Text style={styles.emailAuthorSub}>
                                            Generated by Aevion.AI
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.editorLabel}>To</Text>
                                <Text style={styles.recipientPreview}>
                                    {recipientEmail.trim() || recipient}
                                </Text>

                                <View style={styles.fieldDivider} />

                                <Text style={styles.editorLabel}>Subject</Text>
                                <TextInput
                                    style={styles.subjectInput}
                                    value={subject}
                                    onChangeText={(text) => {
                                        setSubject(text);
                                        setSent(false);
                                        setSuccessMsg("");
                                        setError("");
                                    }}
                                    placeholder="Email subject"
                                    placeholderTextColor="#9298AC"
                                />

                                <View style={styles.fieldDivider} />

                                <Text style={styles.editorLabel}>Email body</Text>
                                <TextInput
                                    style={styles.bodyEditor}
                                    multiline
                                    textAlignVertical="top"
                                    value={body}
                                    onChangeText={(text) => {
                                        setBody(text);
                                        setSent(false);
                                        setSuccessMsg("");
                                        setError("");
                                    }}
                                    placeholder="Your generated email..."
                                    placeholderTextColor="#9298AC"
                                />

                                <View style={styles.editorFooter}>
                                    <Text style={styles.editorFooterText}>
                                        Editable email content
                                    </Text>

                                    <TouchableOpacity
                                        onPress={handleResetOriginal}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.resetText}>Reset original</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* SEND EMAIL */}

                            <TouchableOpacity
                                style={[
                                    styles.sendButton,
                                    (sending || sent) && styles.buttonDisabled,
                                ]}
                                onPress={handleSendEmail}
                                disabled={sending || sent}
                                activeOpacity={0.85}
                            >
                                {sending ? (
                                    <>
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                        <Text style={styles.sendButtonText}>Sending email...</Text>
                                    </>
                                ) : sent ? (
                                    <>
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={20}
                                            color="#FFFFFF"
                                        />
                                        <Text style={styles.sendButtonText}>Email Sent</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="send-outline" size={19} color="#FFFFFF" />
                                        <Text style={styles.sendButtonText}>Send Email</Text>
                                        <Ionicons
                                            name="arrow-forward"
                                            size={19}
                                            color="#FFFFFF"
                                        />
                                    </>
                                )}
                            </TouchableOpacity>

                            {/* COPY */}

                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={handleCopy}
                                activeOpacity={0.8}
                            >
                                <Ionicons
                                    name={copied ? "checkmark" : "copy-outline"}
                                    size={18}
                                    color="#0A1238"
                                />
                                <Text style={styles.copyButtonText}>
                                    {copied ? "Copied" : "Copy email"}
                                </Text>
                            </TouchableOpacity>

                            {/* START OVER */}

                            <TouchableOpacity
                                style={styles.regenerateButton}
                                onPress={handleStartOver}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name="refresh-outline"
                                    size={17}
                                    color="#858DA8"
                                />
                                <Text style={styles.regenerateText}>Create another email</Text>
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

// STYLES

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
    inputCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 13,
        borderWidth: 1,
        borderColor: "#E1E4EC",
        marginBottom: 20,
    },
    inputLabel: {
        color: "#27304F",
        fontSize: 12,
        fontWeight: "800",
        marginBottom: 7,
    },
    textInput: {
        minHeight: 43,
        color: "#202744",
        fontSize: 14,
        paddingHorizontal: 4,
    },
    fieldDivider: {
        height: 1,
        backgroundColor: "#EEF0F4",
        marginVertical: 11,
    },
    fieldHint: {
        color: "#858CA1",
        fontSize: 10,
        marginTop: 5,
    },
    purposeInput: {
        minHeight: 155,
        color: "#202744",
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
    toneGrid: {
        marginBottom: 13,
    },
    toneCard: {
        minHeight: 66,
        borderRadius: 13,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.14)",
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 9,
    },
    toneCardSelected: {
        backgroundColor: "#FFFFFF",
        borderColor: "#FFFFFF",
    },
    toneContent: {
        flex: 1,
        marginLeft: 10,
    },
    toneText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "800",
        marginBottom: 3,
    },
    toneTextSelected: {
        color: "#0A1238",
    },
    toneDescription: {
        color: "#AAB1CA",
        fontSize: 10,
    },
    toneDescriptionSelected: {
        color: "#68718C",
    },
    generateButton: {
        minHeight: 56,
        borderRadius: 14,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 17,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 9,
    },
    buttonDisabled: {
        opacity: 0.65,
    },
    generateButtonText: {
        color: "#0A1238",
        fontSize: 13,
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
        flex: 1,
    },
    metaText: {
        color: "#27304F",
        fontSize: 11,
        fontWeight: "700",
        marginLeft: 6,
        flexShrink: 1,
    },
    metaDivider: {
        width: 1,
        height: 19,
        backgroundColor: "#DDE0E8",
        marginHorizontal: 12,
    },
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
    emailEditorCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 17,
        padding: 14,
        borderWidth: 1,
        borderColor: "#E1E4EC",
        marginBottom: 14,
    },
    emailEditorTop: {
        flexDirection: "row",
        alignItems: "center",
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#EEF0F4",
        marginBottom: 13,
    },
    emailIcon: {
        width: 36,
        height: 36,
        borderRadius: 9,
        backgroundColor: "#0A1238",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 10,
    },
    emailAuthorName: {
        color: "#202744",
        fontSize: 12,
        fontWeight: "800",
    },
    emailAuthorSub: {
        color: "#858CA1",
        fontSize: 9,
        marginTop: 2,
    },
    editorLabel: {
        color: "#7A8199",
        fontSize: 10,
        fontWeight: "800",
        marginBottom: 5,
        textTransform: "uppercase",
    },
    recipientPreview: {
        color: "#202744",
        fontSize: 13,
    },
    subjectInput: {
        color: "#202744",
        fontSize: 14,
        fontWeight: "700",
        minHeight: 42,
        paddingHorizontal: 3,
    },
    bodyEditor: {
        minHeight: 310,
        color: "#202744",
        fontSize: 14,
        lineHeight: 22,
        paddingTop: 8,
        paddingBottom: 10,
    },
    editorFooter: {
        borderTopWidth: 1,
        borderTopColor: "#EEF0F4",
        paddingTop: 10,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    editorFooterText: {
        color: "#7B8298",
        fontSize: 10,
    },
    resetText: {
        color: "#0A1238",
        fontSize: 10,
        fontWeight: "800",
    },
    sendButton: {
        minHeight: 56,
        borderRadius: 14,
        backgroundColor: "#0A1238",
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
    },
    sendButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "800",
        marginHorizontal: 9,
    },
    copyButton: {
        minHeight: 51,
        borderRadius: 13,
        backgroundColor: "#FFFFFF",
        borderWidth: 1,
        borderColor: "#E0E3EB",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
    },
    copyButtonText: {
        color: "#202744",
        fontSize: 12,
        fontWeight: "800",
        marginLeft: 7,
    },
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
