import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  ArrowDown, Search, FileText, ShieldCheck,
  Clock, CheckCircle2, ChevronDown, ChevronUp,
  Send, Star, Headphones, Phone, Mail,
  ArrowRight, MapPin, GraduationCap, Tractor, Heart,
  Briefcase, X, Sparkles
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────

const journeySteps = [
  { step: 1, icon: Search, title: "Discover Schemes", desc: "Browse 1,250+ verified government programmes by category, state, or occupation." },
  { step: 2, icon: ShieldCheck, title: "Check Eligibility", desc: "Know your eligibility before spending time on an application." },
  { step: 3, icon: Star, title: "Get Recommendations", desc: "Receive a personalised list of schemes that match your exact profile." },
  { step: 4, icon: Send, title: "Apply Online", desc: "Submit applications directly or with guided advisor support." },
  { step: 5, icon: Clock, title: "Track Progress", desc: "Follow every step from submission to benefit release in real time." },
];

const featuredSchemes = [
  {
    title: "PM Awas Yojana",
    dept: "Ministry of Housing and Urban Affairs",
    benefit: "Financial assistance for housing construction",
    eligibility: "Annual income below ₹3 Lakh",
    tags: ["Housing", "Rural"],
    id: "s3"
  },
  {
    title: "Ayushman Bharat - PMJAY",
    dept: "Ministry of Health and Family Welfare",
    benefit: "₹5 Lakh health insurance per family per year",
    eligibility: "Economically weaker families",
    tags: ["Health", "Insurance"],
    id: "s2"
  },
  {
    title: "PM Kisan Samman Nidhi",
    dept: "Ministry of Agriculture",
    benefit: "₹6,000 per year in 3 direct instalments",
    eligibility: "All landholding farmer families",
    tags: ["Agriculture", "Farmer"],
    id: "s1"
  },
  {
    title: "National Scholarship Portal",
    dept: "Ministry of Minority Affairs",
    benefit: "Full tuition fee and maintenance allowance",
    eligibility: "SC/ST/OBC students, income below ₹2.5 Lakh",
    tags: ["Education", "Scholarship"],
    id: "s11"
  },
  {
    title: "PM Mudra Yojana",
    dept: "Ministry of Finance",
    benefit: "Collateral-free business loans up to ₹10 Lakh",
    eligibility: "Small business owners, entrepreneurs",
    tags: ["Business", "Loan"],
    id: "s6"
  },
  {
    title: "PM Vishwakarma Yojana",
    dept: "Ministry of MSME",
    benefit: "₹15,000 toolkit + ₹3 Lakh collateral-free credit",
    eligibility: "Traditional artisans and craftspeople",
    tags: ["MSME", "Skill"],
    id: "s14"
  },
];

const successStories = [
  {
    persona: "Student",
    icon: GraduationCap,
    name: "Anjali Reddy",
    location: "Nalgonda, Telangana",
    outcome: "Received ₹50,000 annual scholarship for engineering",
    detail: "She was unaware of the Pragati Scholarship. SchemeSage identified it in seconds based on her profile. Documents uploaded once — application done.",
    schemeName: "AICTE Pragati Scholarship",
    color: "from-blue-500/20 to-blue-600/10",
    border: "border-blue-500/20",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/10"
  },
  {
    persona: "Farmer",
    icon: Tractor,
    name: "Raju Patil",
    location: "Latur, Maharashtra",
    outcome: "₹6,000 credited directly to bank in 3 instalments",
    detail: "He had the land records but didn't know he was eligible. SchemeSage confirmed eligibility in 2 minutes and guided the PM Kisan application end-to-end.",
    schemeName: "PM Kisan Samman Nidhi",
    color: "from-green-500/20 to-green-600/10",
    border: "border-green-500/20",
    iconColor: "text-green-400",
    iconBg: "bg-green-500/10"
  },
  {
    persona: "Widow",
    icon: Heart,
    name: "Savitri Devi",
    location: "Fatehpur, Uttar Pradesh",
    outcome: "Monthly ₹500 pension now credited reliably",
    detail: "Widowed at 52, she spent two years trying to access pension benefits. A verified advisor helped her submit the right documents in one visit.",
    schemeName: "National Social Assistance Programme",
    color: "from-rose-500/20 to-rose-600/10",
    border: "border-rose-500/20",
    iconColor: "text-rose-400",
    iconBg: "bg-rose-500/10"
  },
  {
    persona: "Entrepreneur",
    icon: Briefcase,
    name: "Kavitha Menon",
    location: "Kochi, Kerala",
    outcome: "Secured ₹5 Lakh MUDRA loan for tailoring business",
    detail: "First-generation entrepreneur with no collateral. The platform matched her to MUDRA Yojana and helped prepare all documents digitally.",
    schemeName: "PM MUDRA Yojana - Kishore",
    color: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
    iconBg: "bg-amber-500/10"
  },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Verified Schemes", desc: "All schemes sourced from official government portals" },
  { icon: FileText, label: "Secure Applications", desc: "End-to-end encrypted document handling" },
  { icon: Clock, label: "Real-Time Tracking", desc: "Follow every stage of your application" },
  { icon: Headphones, label: "Dedicated Support", desc: "Verified advisors available for guidance" },
];

const faqs = [
  { q: "Who can use SchemeSage?", a: "Any citizen of India can use SchemeSage for free to discover and check eligibility for government welfare schemes. There is no requirement to create an account to browse schemes." },
  { q: "How does eligibility checking work?", a: "We use an automated rule engine that checks your basic profile (age, income, location, category, occupation) against official eligibility criteria published by government ministries. No manual interpretation involved." },
  { q: "How are scheme recommendations generated?", a: "Your profile is matched against 1,250+ schemes using an eligibility rule system. Schemes where you meet all criteria are ranked by match strength and scheme category relevance." },
  { q: "What documents are typically required?", a: "Most schemes require Aadhaar card, income certificate, and category certificates. Specific requirements are listed on each scheme's detail page before you begin applying." },
  { q: "Can I get help from a real person?", a: "Yes. Use the Agent Assistance option in the top navigation. A verified Scheme Advisor will contact you to provide free guidance on eligibility, documents, and the application process." },
  { q: "How do I track my application status?", a: "After submitting an application through the platform, you receive a tracking ID. Login to your dashboard to view real-time status updates, pending document alerts, and approval timelines." },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const SchemeCard = ({ scheme }: { scheme: typeof featuredSchemes[0] }) => {
  return (
    <div className="bg-[#020617] border border-white/10 rounded-2xl p-6 flex flex-col hover:border-[#F97316]/30 transition-all duration-200 group">
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {scheme.tags.map(tag => (
          <span key={tag} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[#0F172A] border border-white/10 text-[#64748B]">
            {tag}
          </span>
        ))}
      </div>

      {/* Title */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white leading-tight group-hover:text-[#F97316] transition-colors">{scheme.title}</h3>
      </div>

      <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider mb-3">{scheme.dept}</p>

      {/* Benefit */}
      <div className="bg-[#0F172A] rounded-xl px-4 py-3 mb-4 border border-white/5">
        <p className="text-[10px] text-[#64748B] font-bold uppercase tracking-widest mb-0.5">Key Benefit</p>
        <p className="text-white text-sm font-semibold">{scheme.benefit}</p>
      </div>

      {/* Eligibility criteria — informational only */}
      <p className="text-sm text-[#94A3B8] mb-4 flex-1">{scheme.eligibility}</p>

      {/* Actions */}
      <div className="flex gap-3 mt-auto pt-4 border-t border-white/5">
        <Link to={`/scheme/${scheme.id}`} className="flex-1">
          <Button className="w-full bg-white text-black hover:bg-slate-200 hover:text-black font-bold rounded-xl h-11 text-sm border-0 shadow-none">
            View Details
          </Button>
        </Link>
        <button className="flex-1" onClick={() => window.dispatchEvent(new CustomEvent('open-eligibility-modal'))}>
          <Button className="w-full bg-white text-black hover:bg-slate-200 hover:text-black font-bold rounded-xl h-11 text-sm border-0 shadow-none pointer-events-none">
            Check Eligibility
          </Button>
        </button>
      </div>
    </div>
  );
};

const SectionHeading = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="text-center mb-14 max-w-2xl mx-auto px-4">
    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-4">{title}</h2>
    {subtitle && <p className="text-[#94A3B8] text-lg leading-relaxed">{subtitle}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Landing = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isEligibilityModalOpen, setIsEligibilityModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentForm, setAgentForm] = useState({ fullName: "", phone: "", email: "" });

  const { toast } = useToast();

  const handleScrollToSchemes = () => {
    document.getElementById("schemes-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.fullName || !agentForm.phone) {
      toast({ title: "Name and Phone are required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/agents/request', {
        userName: agentForm.fullName,
        userPhone: agentForm.phone,
        userEmail: agentForm.email,
        message: "Scheme advisory request from landing page Agent Assistance section.",
        agentId: 'all'
      });
      toast({ title: "Request Submitted", description: "A verified advisor will contact you shortly." });
      setIsAgentModalOpen(false);
      setAgentForm({ fullName: "", phone: "", email: "" });
    } catch {
      toast({ title: "Submission Failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Listen for the custom event from the SchemeCard
  useEffect(() => {
    const handleOpenModal = () => setIsEligibilityModalOpen(true);
    window.addEventListener('open-eligibility-modal', handleOpenModal);
    return () => window.removeEventListener('open-eligibility-modal', handleOpenModal);
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-[#CBD5E1] font-sans">
      <Navbar />

      {/* ── SECTION 1: HERO ─────────────────────────────────────────────────── */}
      <section className="relative h-screen w-full flex items-center overflow-hidden">
        {/* Hero Background Image */}
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            backgroundImage: "url('https://ik.imagekit.io/smr2007/ChatGPT%20Image%20Jun%2011,%202026,%2008_38_04%20PM.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Directional overlay — Left dense, Center medium, Right light */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.50) 45%, rgba(0,0,0,0.18) 100%)",
          }}
        />
        {/* Subtle bottom fade for stats card readability */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#020617]/60 to-transparent" />

        <div className="container mx-auto px-6 lg:px-16 relative z-10 flex flex-col justify-center h-full">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-[600px] space-y-6"
          >
            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] tracking-tight">
              Find.<br />Apply.<br />Succeed.
            </h1>

            {/* Subheadline — slate-200, never a brand accent color */}
            <p className="text-xl sm:text-2xl font-semibold text-slate-200 tracking-tight">
              Government schemes made simple for every citizen.
            </p>

            {/* Description */}
            <p className="text-base sm:text-lg text-[#CBD5E1] leading-relaxed max-w-[480px]">
              Discover government schemes you're eligible for, check in minutes, and apply with confidence.
              Track every application and get support whenever you need it.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                id="hero-explore-schemes-btn"
                onClick={handleScrollToSchemes}
                className="w-full sm:w-auto h-14 px-8 text-base font-bold text-white bg-[#F97316] hover:bg-[#EA580C] border-0 shadow-xl shadow-[#F97316]/25 rounded-xl flex items-center justify-center gap-2"
              >
                Explore Schemes <ArrowDown className="h-5 w-5" />
              </Button>
              <Button
                id="hero-check-eligibility-btn"
                variant="outline"
                onClick={() => setIsEligibilityModalOpen(true)}
                className="w-full sm:w-auto h-14 px-8 text-base font-bold text-white border-white/25 hover:bg-white/10 bg-transparent rounded-xl"
              >
                Check Eligibility
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm font-semibold text-white/80">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#22C55E]" /> Verified Schemes</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#22C55E]" /> Secure Applications</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#22C55E]" /> Real-Time Tracking</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#22C55E]" /> Dedicated Support</span>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="absolute bottom-8 left-6 lg:left-16 right-6 lg:right-auto hidden md:block"
          >
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-5 grid grid-cols-4 gap-8 max-w-[720px]">
              {[
                { num: "1,250+", label: "Government Schemes Indexed" },
                { num: "25,000+", label: "Applications Assisted" },
                { num: "15,000+", label: "Citizens Supported" },
                { num: "98%", label: "User Satisfaction", green: true },
              ].map(({ num, label, green }) => (
                <div key={label}>
                  <p className={`text-2xl font-black ${green ? "text-[#22C55E]" : "text-white"}`}>{num}</p>
                  <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── SECTION 2: HOW IT WORKS ──────────────────────────────────────────── */}
      <section className="py-24 bg-[#0F172A] border-y border-white/5">
        <div className="container mx-auto px-6">
          <SectionHeading
            title="How SchemeSage Works"
            subtitle="A transparent, five-step journey from discovery to receiving your benefit."
          />
          <div className="max-w-5xl mx-auto">
            {/* Desktop horizontal flow */}
            <div className="hidden md:flex items-start gap-0 relative">
              <div className="absolute top-10 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {journeySteps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-1 flex flex-col items-center text-center px-4 relative z-10"
                >
                  <div className="h-20 w-20 rounded-2xl bg-[#020617] border border-white/10 flex flex-col items-center justify-center mb-5 relative hover:border-[#F97316]/50 transition-colors group">
                    <span className="absolute -top-2.5 -right-2.5 h-6 w-6 bg-[#F97316] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                      {s.step}
                    </span>
                    <s.icon className="h-7 w-7 text-white/70 group-hover:text-[#F97316] transition-colors" />
                  </div>
                  <h3 className="font-bold text-white text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Mobile vertical flow */}
            <div className="md:hidden space-y-4">
              {journeySteps.map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-4 bg-[#020617] border border-white/5 rounded-2xl p-5"
                >
                  <div className="h-12 w-12 rounded-xl bg-[#0F172A] border border-white/10 flex items-center justify-center shrink-0 relative">
                    <span className="absolute -top-2 -right-2 h-5 w-5 bg-[#F97316] text-white text-[9px] font-black rounded-full flex items-center justify-center">{s.step}</span>
                    <s.icon className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm mb-1">{s.title}</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">{s.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: FEATURED SCHEMES ─────────────────────────────────────── */}
      <section id="schemes-section" className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6">
          <SectionHeading
            title="Popular Government Schemes"
            subtitle="Explore 1,250+ verified welfare programmes. Check your eligibility on the dedicated eligibility page."
          />

          {/* Eligibility CTA Banner */}
          <div className="max-w-6xl mx-auto mb-10">
            <div className="bg-[#0F172A] border border-[#F97316]/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[#F97316]/10 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-[#F97316]" />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="font-bold text-white text-sm">Want to know which schemes you qualify for?</p>
                <p className="text-[#64748B] text-xs mt-0.5">Visit the eligibility checker to get a personalised list of schemes matched to your profile.</p>
              </div>
              <button
                onClick={() => setIsEligibilityModalOpen(true)}
                className="shrink-0 text-xs font-bold text-[#F97316] border border-[#F97316]/30 hover:bg-[#F97316]/10 rounded-xl px-4 py-2 transition-colors whitespace-nowrap"
              >
                Check My Eligibility →
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {featuredSchemes.map((scheme, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <SchemeCard scheme={scheme} />
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/schemes">
              <Button
                variant="outline"
                className="h-14 px-10 bg-transparent border-white/20 text-white font-bold rounded-xl hover:bg-white/10 text-base"
              >
                Explore All 1,250+ Schemes <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: TRUST PILLARS ─────────────────────────────────────────── */}
      <section className="py-20 bg-[#0F172A] border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {trustBadges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#020617] border border-white/5 rounded-2xl p-6 hover:border-[#22C55E]/20 transition-colors"
              >
                <div className="h-11 w-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center mb-4">
                  <badge.icon className="h-5 w-5 text-[#22C55E]" />
                </div>
                <h3 className="font-bold text-white mb-1.5">{badge.label}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed">{badge.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: SUCCESS STORIES ───────────────────────────────────────── */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6">
          <SectionHeading
            title="Citizen Success Stories"
            subtitle="Real outcomes. Real people. Real benefits unlocked."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {successStories.map((story, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`bg-gradient-to-br ${story.color} border ${story.border} rounded-2xl p-6`}
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className={`h-10 w-10 rounded-xl ${story.iconBg} flex items-center justify-center`}>
                    <story.icon className={`h-5 w-5 ${story.iconColor}`} />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${story.iconColor}`}>{story.persona}</p>
                    <p className="text-white font-bold text-sm">{story.name}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1 text-xs text-[#64748B]">
                    <MapPin className="h-3.5 w-3.5" /> {story.location}
                  </div>
                </div>

                <p className="text-white font-bold text-base mb-3">{story.outcome}</p>
                <p className="text-[#94A3B8] text-sm leading-relaxed mb-5">{story.detail}</p>

                <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2 border border-white/5">
                  <CheckCircle2 className="h-4 w-4 text-[#22C55E] shrink-0" />
                  <p className="text-xs text-[#94A3B8]">Via <span className="text-white font-semibold">{story.schemeName}</span></p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: AGENT ASSISTANCE ─────────────────────────────────────── */}
      <section className="py-24 bg-[#0F172A] border-t border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="bg-gradient-to-br from-[#f97316]/10 via-[#0F172A] to-[#0F172A] border border-[#f97316]/20 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="h-16 w-16 rounded-2xl bg-[#f97316]/10 border border-[#f97316]/20 flex items-center justify-center shrink-0">
              <Headphones className="h-8 w-8 text-[#f97316]" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-black text-white mb-3">
                Need help choosing a scheme?
              </h2>
              <p className="text-[#94A3B8] text-lg leading-relaxed mb-2">
                Talk to a verified Scheme Advisor.
              </p>
              <p className="text-[#64748B] leading-relaxed">
                Get free, personalised guidance on eligibility, required documents, and the application process — from a real person who knows the system.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button
                id="agent-assistance-btn"
                onClick={() => setIsAgentModalOpen(true)}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 h-14 px-8 bg-[#f97316] hover:bg-[#ea580c] text-white font-bold rounded-xl transition-all shadow-xl shadow-[#f97316]/20 text-base"
              >
                <Headphones className="h-5 w-5" /> Talk to an Advisor
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ ──────────────────────────────────────────────────── */}
      <section className="py-24 bg-[#020617]">
        <div className="container mx-auto px-6 max-w-3xl">
          <SectionHeading
            title="Frequently Asked Questions"
            subtitle="Answers to the questions citizens ask most."
          />
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-bold text-white text-base">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="h-5 w-5 text-[#F97316] shrink-0" />
                    : <ChevronDown className="h-5 w-5 text-[#475569] shrink-0" />
                  }
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-[#94A3B8] leading-relaxed border-t border-white/5 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: CONTACT ──────────────────────────────────────────────── */}
      <section id="contact" className="py-20 bg-[#0F172A] border-t border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
          <SectionHeading
            title="Get in Touch"
            subtitle="Have a question about the platform or need specific assistance?"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Phone, label: "Helpline", value: "1800-XXX-XXXX", sub: "Mon–Sat, 9 AM to 6 PM", color: "text-green-400", bg: "bg-green-500/10" },
              { icon: Mail, label: "Email Support", value: "help@schemesage.in", sub: "Response within 24 hours", color: "text-blue-400", bg: "bg-blue-500/10" },
              { icon: Headphones, label: "Agent Assistance", value: "Book a Callback", sub: "Free advisory session", color: "text-[#f97316]", bg: "bg-[#f97316]/10" },
            ].map(({ icon: Icon, label, value, sub, color, bg }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#020617] border border-white/5 rounded-2xl p-6 text-center"
              >
                <div className={`h-12 w-12 rounded-2xl ${bg} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`h-6 w-6 ${color}`} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-[#475569] mb-1">{label}</p>
                <p className="font-bold text-white text-base">{value}</p>
                <p className="text-xs text-[#64748B] mt-1">{sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />

      {/* Agent Modal (triggered from section 6 CTA) */}
      <AnimatePresence>
        {isAgentModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
              onClick={() => setIsAgentModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0F172A] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10 z-10"
            >
              <div className="bg-[#f97316] pt-8 pb-10 px-8 flex flex-col items-center text-center relative">
                <button
                  onClick={() => setIsAgentModalOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 border border-white/20">
                  <Headphones className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Talk to an Advisor</h3>
                <p className="text-white/90 text-sm px-4">
                  Free guidance on eligibility, documents, and applications.
                </p>
              </div>
              <div className="p-8">
                <form onSubmit={handleAgentSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Full Name *</label>
                    <input
                      required type="text"
                      value={agentForm.fullName}
                      onChange={(e) => setAgentForm({ ...agentForm, fullName: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Phone Number *</label>
                    <input
                      required type="tel"
                      value={agentForm.phone}
                      onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#CBD5E1] tracking-wider uppercase mb-2">Email (Optional)</label>
                    <input
                      type="email"
                      value={agentForm.email}
                      onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                      className="w-full bg-transparent border-2 border-white/10 rounded-xl h-13 px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#f97316] transition-colors"
                      placeholder="optional@email.com"
                    />
                  </div>
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold h-14 rounded-xl border-0 shadow-lg shadow-[#f97316]/20 transition-all flex items-center justify-center gap-2 text-base"
                    >
                      {isSubmitting ? "Connecting..." : "Request Callback"}
                      {!isSubmitting && <Send className="h-5 w-5" />}
                    </Button>
                    <p className="text-center text-xs text-[#CBD5E1]/50 mt-4">
                      Free service. Your data is secure and never shared.
                    </p>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEligibilityModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm"
              onClick={() => setIsEligibilityModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[#0F172A] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/10 z-10"
            >
              <div className="bg-[#f97316] pt-8 pb-8 px-8 flex flex-col items-center text-center relative">
                <button
                  onClick={() => setIsEligibilityModalOpen(false)}
                  className="absolute top-4 right-4 text-white/80 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4 border border-white/20">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Check Your Eligibility</h3>
                <p className="text-white/90 text-sm px-4">
                  How would you like to provide your details to find matching schemes?
                </p>
              </div>
              <div className="p-8 space-y-4">
                <Link to="/eligibility" className="block" onClick={() => setIsEligibilityModalOpen(false)}>
                  <div className="bg-[#020617] hover:bg-white/5 border border-white/10 hover:border-[#f97316]/50 rounded-2xl p-5 transition-all flex items-start gap-4 group cursor-pointer">
                    <div className="h-12 w-12 rounded-full bg-[#f97316]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="h-5 w-5 text-[#f97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1 group-hover:text-[#f97316] transition-colors">Use Voice Input</h4>
                      <p className="text-[#94A3B8] text-sm">Speak naturally in your preferred language and let AI extract your profile.</p>
                    </div>
                  </div>
                </Link>
                
                <Link to="/eligibility?mode=manual" className="block" onClick={() => setIsEligibilityModalOpen(false)}>
                  <div className="bg-[#020617] hover:bg-white/5 border border-white/10 hover:border-[#f97316]/50 rounded-2xl p-5 transition-all flex items-start gap-4 group cursor-pointer">
                    <div className="h-12 w-12 rounded-full bg-[#f97316]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5 text-[#f97316]" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg mb-1 group-hover:text-[#f97316] transition-colors">Fill Manually</h4>
                      <p className="text-[#94A3B8] text-sm">Enter your age, location, and other details using a standard form.</p>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Landing;
