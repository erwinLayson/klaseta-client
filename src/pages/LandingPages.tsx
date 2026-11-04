import { useState } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Ionicons from "@expo/vector-icons/Ionicons";
import { landingPagesStyle } from "../styles/index";
import { RootParamList } from "../types/RootParamList";

interface FaqItemData {
    question: string;
    answer: string;
}

const FAQ_ITEMS: FaqItemData[] = [
    {
        question: "Is Klaseta completely free to use?",
        answer: "Yes! Klaseta is completely free for all teachers, educators, and instructors without subscription fees, hidden paywalls, or locked features.",
    },
    {
        question: "Does Klaseta work offline without internet?",
        answer: "Absolutely. Klaseta is engineered with an offline-first architecture using local SQLite database storage. You can manage classes, take daily attendance, and calculate grades anywhere without Wi-Fi or cellular data.",
    },
    {
        question: "How does the automated grading calculation work?",
        answer: "You can define custom category weights (e.g., 40% Exams, 30% Quizzes, 20% Projects, 10% Attendance). Klaseta computes total weighted percentages, converts scores, and provides dynamic passing/failing breakdowns automatically.",
    },
    {
        question: "Can I import students in bulk from a file?",
        answer: "Yes! Klaseta includes a bulk upload feature supporting CSV format with first name, middle name, last name, and suffix. Duplicate records are detected and handled seamlessly.",
    },
    {
        question: "Can I edit or delete past attendance sessions?",
        answer: "Yes. In the Attendance spreadsheet, you can click the pencil icon to update session dates and labels, or the trash icon to permanently remove a session and its associated records.",
    },
    {
        question: "Where is my data stored and is it secure?",
        answer: "All your classroom data is stored strictly locally on your device under your authenticated teacher account. No third parties have access to your students' records.",
    },
];

export function LandingPages() {
    const navigation = useNavigation<NativeStackNavigationProp<RootParamList>>();
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

    const toggleFaq = (index: number) => {
        setOpenFaqIndex((prev) => (prev === index ? null : index));
    };

    return (
        <View style={landingPagesStyle.container}>
            <View style={landingPagesStyle.backgroundAccent} pointerEvents="none" />
            <View style={landingPagesStyle.backgroundAccentBottom} pointerEvents="none" />

            {/* Top Navigation Bar */}
            <View style={landingPagesStyle.navbar}>
                <View style={landingPagesStyle.brandRow}>
                    <Image
                        source={require("../../assets/app_logo.png")}
                        style={landingPagesStyle.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={landingPagesStyle.brandName}>Klaseta</Text>
                </View>

                <View style={landingPagesStyle.navActions}>
                    <Pressable
                        onPress={() => navigation.navigate("login")}
                        style={({ pressed }) => [
                            landingPagesStyle.navSignInBtn,
                            pressed && landingPagesStyle.navSignInBtnPressed,
                        ]}
                        hitSlop={6}
                    >
                        <Text style={landingPagesStyle.navSignInText}>Sign In</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => navigation.navigate("register")}
                        style={({ pressed }) => [
                            landingPagesStyle.navRegisterBtn,
                            pressed && landingPagesStyle.navRegisterBtnPressed,
                        ]}
                        hitSlop={6}
                    >
                        <Text style={landingPagesStyle.navRegisterText}>Register</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={landingPagesStyle.scrollView}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. HERO SECTION */}
                <View style={landingPagesStyle.heroSection}>
                    <View style={landingPagesStyle.heroBadge}>
                        <Ionicons name="sparkles" size={14} color="#4F46E5" />
                        <Text style={landingPagesStyle.heroBadgeText}>
                            Offline-First Classroom Manager
                        </Text>
                    </View>

                    <Text style={landingPagesStyle.heroTitle}>
                        Empowering Educators,{"\n"}
                        <Text style={landingPagesStyle.heroTitleHighlight}>
                            Simplifying Classrooms
                        </Text>
                    </Text>

                    <Text style={landingPagesStyle.heroSubtitle}>
                        Organize student rosters, record daily attendance in one tap, and calculate
                        weighted grades automatically — completely offline with zero fuss.
                    </Text>

                    <View style={landingPagesStyle.heroCtaRow}>
                        <Pressable
                            onPress={() => navigation.navigate("register")}
                            style={({ pressed }) => [
                                landingPagesStyle.heroPrimaryBtn,
                                pressed && landingPagesStyle.heroPrimaryBtnPressed,
                            ]}
                        >
                            <Text style={landingPagesStyle.heroPrimaryBtnText}>Get Started Free</Text>
                            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                        </Pressable>

                        <Pressable
                            onPress={() => navigation.navigate("login")}
                            style={({ pressed }) => [
                                landingPagesStyle.heroSecondaryBtn,
                                pressed && landingPagesStyle.heroSecondaryBtnPressed,
                            ]}
                        >
                            <Ionicons name="log-in-outline" size={18} color="#334155" />
                            <Text style={landingPagesStyle.heroSecondaryBtnText}>Sign In</Text>
                        </Pressable>
                    </View>

                    {/* Quick Highlights / Stats Row */}
                    <View style={landingPagesStyle.heroHighlightsRow}>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="cloud-offline-outline" size={20} color="#4F46E5" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>100% Offline</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Works anywhere</Text>
                        </View>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="people-outline" size={20} color="#059669" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>Rosters & CSV</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Bulk student import</Text>
                        </View>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="calculator-outline" size={20} color="#D97706" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>Auto Grading</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Weighted formulas</Text>
                        </View>
                    </View>
                </View>

                {/* 2. ABOUT SECTION */}
                <View style={landingPagesStyle.sectionWrapper}>
                    <Text style={landingPagesStyle.sectionTag}>About Klaseta</Text>
                    <Text style={landingPagesStyle.sectionTitle}>
                        Built Specifically for Teachers & Educators
                    </Text>
                    <Text style={landingPagesStyle.sectionSubtitle}>
                        Klaseta was designed to eliminate the frustration of manual paper logs,
                        complicated desktop spreadsheets, and unreliable internet access in school
                        classrooms.
                    </Text>

                    <View style={landingPagesStyle.aboutCardsRow}>
                        <View style={landingPagesStyle.aboutCard}>
                            <View style={landingPagesStyle.aboutCardIconRow}>
                                <View
                                    style={[
                                        landingPagesStyle.aboutCardIconBox,
                                        { backgroundColor: "#EEF2FF" },
                                    ]}
                                >
                                    <Ionicons name="school" size={20} color="#4F46E5" />
                                </View>
                                <Text style={landingPagesStyle.aboutCardTitle}>
                                    Designed for Real Classrooms
                                </Text>
                            </View>
                            <Text style={landingPagesStyle.aboutCardDesc}>
                                Tailored to school schedules, multiple classes, sections, and room
                                assignments with intuitive navigation and card-first dashboards.
                            </Text>
                        </View>

                        <View style={landingPagesStyle.aboutCard}>
                            <View style={landingPagesStyle.aboutCardIconRow}>
                                <View
                                    style={[
                                        landingPagesStyle.aboutCardIconBox,
                                        { backgroundColor: "#ECFDF5" },
                                    ]}
                                >
                                    <Ionicons name="shield-checkmark" size={20} color="#059669" />
                                </View>
                                <Text style={landingPagesStyle.aboutCardTitle}>
                                    Privacy & Device Autonomy
                                </Text>
                            </View>
                            <Text style={landingPagesStyle.aboutCardDesc}>
                                Your students&apos; names, daily attendance, and score records never leave your
                                phone. High-speed local SQLite ensures lightning-fast performance.
                            </Text>
                        </View>

                        <View style={landingPagesStyle.aboutCard}>
                            <View style={landingPagesStyle.aboutCardIconRow}>
                                <View
                                    style={[
                                        landingPagesStyle.aboutCardIconBox,
                                        { backgroundColor: "#FEF3C7" },
                                    ]}
                                >
                                    <Ionicons name="ribbon" size={20} color="#D97706" />
                                </View>
                                <Text style={landingPagesStyle.aboutCardTitle}>
                                    Customizable Grading Standards
                                </Text>
                            </View>
                            <Text style={landingPagesStyle.aboutCardDesc}>
                                Define weights for quizzes, quarterly examinations, unit projects, and
                                attendance. Instant visual indicators highlight passing and failing marks.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 3. SERVICES & FEATURES SECTION */}
                <View style={landingPagesStyle.sectionWrapper}>
                    <Text style={landingPagesStyle.sectionTag}>Services & Features</Text>
                    <Text style={landingPagesStyle.sectionTitle}>
                        Complete Classroom Management Suite
                    </Text>
                    <Text style={landingPagesStyle.sectionSubtitle}>
                        Everything educators need to manage students, track records, and calculate grades
                        efficiently.
                    </Text>

                    <View style={landingPagesStyle.serviceGrid}>
                        {/* Service 1 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#EEF2FF" },
                                ]}
                            >
                                <Ionicons name="school-outline" size={24} color="#4F46E5" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Class & Roster Management
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Create and customize classes with subjects, sections, schedules, and colors.
                                Add individual students or batch import hundreds of student records via CSV
                                files in seconds.
                            </Text>
                        </View>

                        {/* Service 2 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#ECFDF5" },
                                ]}
                            >
                                <Ionicons name="clipboard-outline" size={24} color="#059669" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Daily Smart Attendance
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Take daily attendance with 1-tap present (1) and absent (0) toggles. Filter by
                                specific dates, review overall attendance rates, and update or delete sessions
                                with automatic integrity guards.
                            </Text>
                        </View>

                        {/* Service 3 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#F5F3FF" },
                                ]}
                            >
                                <Ionicons name="book-outline" size={24} color="#7C3AED" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Automated Weighted Gradebook
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Create assessments linked to category weights, enter scores with max-score
                                hints, and compute student final grades automatically with detailed category
                                breakdowns.
                            </Text>
                        </View>

                        {/* Service 4 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#FEF2F2" },
                                ]}
                            >
                                <Ionicons name="lock-closed-outline" size={24} color="#DC2626" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Account & Data Security
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Individual teacher authentication protects your records. Comprehensive account
                                management gives you complete autonomy over your profile and classroom data.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 4. FAQ ("FQA") SECTION */}
                <View style={landingPagesStyle.sectionWrapper}>
                    <Text style={landingPagesStyle.sectionTag}>FQA & Questions</Text>
                    <Text style={landingPagesStyle.sectionTitle}>
                        Frequently Asked Questions
                    </Text>
                    <Text style={landingPagesStyle.sectionSubtitle}>
                        Quick answers to common questions about using Klaseta.
                    </Text>

                    <View style={landingPagesStyle.faqList}>
                        {FAQ_ITEMS.map((item, index) => {
                            const isOpen = openFaqIndex === index;
                            return (
                                <View key={index} style={landingPagesStyle.faqItem}>
                                    <Pressable
                                        onPress={() => toggleFaq(index)}
                                        style={landingPagesStyle.faqHeader}
                                        hitSlop={6}
                                    >
                                        <Text style={landingPagesStyle.faqQuestion}>
                                            {item.question}
                                        </Text>
                                        <Ionicons
                                            name={isOpen ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#64748B"
                                        />
                                    </Pressable>

                                    {isOpen && (
                                        <View style={landingPagesStyle.faqAnswerBox}>
                                            <Text style={landingPagesStyle.faqAnswer}>
                                                {item.answer}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* CTA BANNER */}
                <View style={landingPagesStyle.ctaBanner}>
                    <Text style={landingPagesStyle.ctaBannerTitle}>
                        Ready to Simplify Your Classroom?
                    </Text>
                    <Text style={landingPagesStyle.ctaBannerSub}>
                        Join educators who save hours every week on grading and attendance.
                    </Text>
                    <Pressable
                        onPress={() => navigation.navigate("register")}
                        style={({ pressed }) => [
                            landingPagesStyle.ctaBannerBtn,
                            pressed && { opacity: 0.9 },
                        ]}
                    >
                        <Text style={landingPagesStyle.ctaBannerBtnText}>
                            Create Free Teacher Account
                        </Text>
                    </Pressable>
                </View>

                {/* 5. FOOTER SECTION */}
                <View style={landingPagesStyle.footer}>
                    <View style={landingPagesStyle.footerBrandRow}>
                        <Image
                            source={require("../../assets/app_logo.png")}
                            style={landingPagesStyle.footerLogoImage}
                            resizeMode="contain"
                        />
                        <Text style={landingPagesStyle.footerBrandName}>Klaseta</Text>
                    </View>

                    <Text style={landingPagesStyle.footerTagline}>
                        The modern, offline-first classroom grading, attendance, and roster platform
                        crafted for teachers.
                    </Text>

                    {/* Quick navigation links */}
                    <View style={landingPagesStyle.footerNavRow}>
                        <Pressable onPress={() => navigation.navigate("login")}>
                            <Text style={landingPagesStyle.footerNavLink}>Sign In</Text>
                        </Pressable>
                        <Pressable onPress={() => navigation.navigate("register")}>
                            <Text style={landingPagesStyle.footerNavLink}>Create Account</Text>
                        </Pressable>
                        <Pressable onPress={() => navigation.navigate("login")}>
                            <Text style={landingPagesStyle.footerNavLink}>Teacher Portal</Text>
                        </Pressable>
                    </View>

                    <Text style={landingPagesStyle.footerCopy}>
                        © 2026 Klaseta. Made with ❤️ for Teachers & Educators.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

