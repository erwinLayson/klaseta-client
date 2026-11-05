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
        answer: "Yes! Klaseta is 100% free for teachers and educators without subscription fees, hidden paywalls, advertising, or locked features.",
    },
    {
        question: "Does Klaseta work offline without internet?",
        answer: "Absolutely. Klaseta is engineered with an offline-first architecture using a high-speed local SQLite database. You can manage classrooms, take daily attendance, and calculate grades anywhere without Wi-Fi or mobile data.",
    },
    {
        question: "How does the automated grading calculation work?",
        answer: "Klaseta aligns with standard educational systems (such as DepEd Written Works, Performance Tasks, Quarterly Assessments, and Attendance) across 3 or 4 quarters. It automatically computes weighted scores, normalizes percentages, and provides real-time letter grades and pass/fail indicators.",
    },
    {
        question: "Can I import students in bulk from Excel (.xlsx) or CSV?",
        answer: "Yes! Klaseta features an intelligent bulk importer supporting both Excel spreadsheets (.xlsx, .xls) and CSV files. It automatically detects and maps column headers for first name, last name, middle name, and name suffixes (Jr., Sr., III), and skips duplicates safely.",
    },
    {
        question: "What happens when a school year concludes?",
        answer: "When you start a new school year, Klaseta automatically snapshots and archives all student final marks, attendance summaries, and assessments into Academic History. Your active workspace cleanly resets for the new school year while historical records remain permanently accessible.",
    },
    {
        question: "Can I review or manage past academic records?",
        answer: "Yes! The dedicated Academic History screen lets you browse all past school years, view archived class rosters, inspect student final grades, and permanently manage or delete old records whenever needed.",
    },
    {
        question: "Can I edit or delete attendance sessions and grades?",
        answer: "Yes. Both the Attendance and Gradebook spreadsheets allow full inline editing. You can update session dates, change attendance marks, edit assessment scores, or delete sessions with automatic data integrity protection.",
    },
    {
        question: "Where is my data stored and is it private?",
        answer: "All your classroom data is stored strictly locally on your physical device under your personal teacher login. No external servers or third parties ever have access to your students' private records.",
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

                    {/* Quick Highlights / Stats Grid (2x2) */}
                    <View style={landingPagesStyle.heroHighlightsRow}>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="cloud-offline-outline" size={20} color="#4F46E5" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>100% Offline</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Local SQLite storage</Text>
                        </View>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="document-text-outline" size={20} color="#059669" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>Excel & CSV</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Smart roster import</Text>
                        </View>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="calculator-outline" size={20} color="#D97706" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>Auto Grading</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Weighted formulas</Text>
                        </View>
                        <View style={landingPagesStyle.heroHighlightCard}>
                            <Ionicons name="archive-outline" size={20} color="#7C3AED" />
                            <Text style={landingPagesStyle.heroHighlightTitle}>Academic History</Text>
                            <Text style={landingPagesStyle.heroHighlightDesc}>Multi-year archives</Text>
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
                    <Text style={landingPagesStyle.sectionTag}>Features & Capabilities</Text>
                    <Text style={landingPagesStyle.sectionTitle}>
                        Complete Classroom Management Suite
                    </Text>
                    <Text style={landingPagesStyle.sectionSubtitle}>
                        Everything educators need to manage students, track records, calculate grades,
                        and preserve multi-year academic history.
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
                                Add individual students or batch import hundreds of student records via Excel (.xlsx)
                                and CSV files with intelligent column detection.
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
                                Take daily attendance with 1-tap present (1) and absent (0) toggles in a clean
                                spreadsheet. Filter by specific dates, review overall attendance rates, and update
                                or delete sessions with automatic integrity guards.
                            </Text>
                        </View>

                        {/* Service 3 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#FEF3C7" },
                                ]}
                            >
                                <Ionicons name="calculator-outline" size={24} color="#D97706" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Automated Weighted Gradebook
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Create assessments linked to customizable weight categories (Written Works,
                                Performance Tasks, Quarterly Assessments, Attendance). Enter scores with max-score
                                hints and compute final grades with real-time pass/fail breakdown.
                            </Text>
                        </View>

                        {/* Service 4 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#F5F3FF" },
                                ]}
                            >
                                <Ionicons name="archive-outline" size={24} color="#7C3AED" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Academic History & Multi-Year Rollover
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Transition smoothly to new school years with single-tap archiving. Klaseta
                                permanently snapshots student final marks, attendance summaries, and assessments,
                                resetting your operational workspace while keeping historical records fully accessible.
                            </Text>
                        </View>

                        {/* Service 5 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#F0F9FF" },
                                ]}
                            >
                                <Ionicons name="bar-chart-outline" size={24} color="#0284C7" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Real-Time Teacher Dashboard
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Stay organized with a live dashboard tracking active classrooms, enrolled students,
                                today&apos;s attendance sessions, class-wide attendance rates, and chronological
                                activity timelines.
                            </Text>
                        </View>

                        {/* Service 6 */}
                        <View style={landingPagesStyle.serviceCard}>
                            <View
                                style={[
                                    landingPagesStyle.serviceIconWrap,
                                    { backgroundColor: "#ECFDF5" },
                                ]}
                            >
                                <Ionicons name="shield-checkmark-outline" size={24} color="#059669" />
                            </View>
                            <Text style={landingPagesStyle.serviceTitle}>
                                Local Privacy & Data Security
                            </Text>
                            <Text style={landingPagesStyle.serviceDesc}>
                                Authenticated teacher accounts protect your records. All data is kept securely on
                                your personal device in local SQLite storage with zero tracking, advertisements, or
                                external server requirements.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 4. WORKFLOW / HOW IT WORKS SECTION */}
                <View style={landingPagesStyle.sectionWrapper}>
                    <Text style={landingPagesStyle.sectionTag}>Workflow</Text>
                    <Text style={landingPagesStyle.sectionTitle}>How Klaseta Works</Text>
                    <Text style={landingPagesStyle.sectionSubtitle}>
                        Three simple steps to streamline your day-to-day teaching operations.
                    </Text>

                    <View style={landingPagesStyle.stepsContainer}>
                        <View style={landingPagesStyle.stepCard}>
                            <View style={landingPagesStyle.stepNumberBox}>
                                <Text style={landingPagesStyle.stepNumberText}>1</Text>
                            </View>
                            <View style={landingPagesStyle.stepContent}>
                                <Text style={landingPagesStyle.stepTitle}>
                                    Create Classrooms & Import Rosters
                                </Text>
                                <Text style={landingPagesStyle.stepDesc}>
                                    Set up your classes with subject names, sections, and schedules, then import
                                    student rosters using Excel (.xlsx) templates or CSV files in seconds.
                                </Text>
                            </View>
                        </View>

                        <View style={landingPagesStyle.stepCard}>
                            <View style={landingPagesStyle.stepNumberBox}>
                                <Text style={landingPagesStyle.stepNumberText}>2</Text>
                            </View>
                            <View style={landingPagesStyle.stepContent}>
                                <Text style={landingPagesStyle.stepTitle}>
                                    Record Daily Attendance & Scores
                                </Text>
                                <Text style={landingPagesStyle.stepDesc}>
                                    Tap once to record attendance and enter scores in the horizontal spreadsheet.
                                    Weighted averages, percentages, and attendance rates calculate automatically.
                                </Text>
                            </View>
                        </View>

                        <View style={landingPagesStyle.stepCard}>
                            <View style={landingPagesStyle.stepNumberBox}>
                                <Text style={landingPagesStyle.stepNumberText}>3</Text>
                            </View>
                            <View style={landingPagesStyle.stepContent}>
                                <Text style={landingPagesStyle.stepTitle}>
                                    Compute Grades & Archive Yearly
                                </Text>
                                <Text style={landingPagesStyle.stepDesc}>
                                    At year&apos;s end, review final student marks and transition to the next school year.
                                    All grades and attendance are permanently archived to Academic History.
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 5. FAQ SECTION */}
                <View style={landingPagesStyle.sectionWrapper}>
                    <Text style={landingPagesStyle.sectionTag}>FAQ & Help</Text>
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
                        Join educators who save hours every week on grading, attendance, and roster management.
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

                {/* 6. FOOTER SECTION */}
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
