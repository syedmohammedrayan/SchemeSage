import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { categories, occupations, indianStates } from "@/data/schemes";
import {
  Search, User, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Sparkles, FileText, AlertCircle, ArrowRight, Loader2, ExternalLink,
  MessageSquare, BookOpen, Star
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── Types ───────────────────────────────────────────────────────────────────

interface EligibilityDimension {
  pass: boolean;
  label: string;
  detail: string;
}

interface SchemeMatch {
  scheme: any;
  matchScore: number;
  reason: string;
  breakdown: EligibilityDimension[];
  documents: string[];
}

interface PartialMatch {
  scheme: any;
  matchScore: number;
  missingCriteria: string;
}

interface CitizenReport {
  profileSummary: string;
  topMatches: SchemeMatch[];
  partialMatches: PartialMatch[];
  generatedAt: string;
}

// ─── NLP Text Extraction ──────────────────────────────────────────────────────

async function extractProfileFromText(text: string): Promise<any> {
  try {
    const result = await api.post<any>('/voice/transcribe', { text, language: 'en-IN' });
    return result?.profile || {};
  } catch (e) {
    return {};
  }
}

// ─── Eligibility Breakdown Badge ──────────────────────────────────────────────

const BreakdownBadge = ({ dim }: { dim: EligibilityDimension }) => (
  <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border ${
    dim.pass
      ? 'bg-green-500/10 border-green-500/20 text-green-400'
      : 'bg-red-500/10 border-red-500/20 text-red-400'
  }`}>
    {dim.pass
      ? <CheckCircle2 className="h-3 w-3 shrink-0" />
      : <XCircle className="h-3 w-3 shrink-0" />
    }
    {dim.detail}
  </div>
);

// ─── Score Ring ───────────────────────────────────────────────────────────────

const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative h-14 w-14 shrink-0">
      <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-black text-white">{score}%</span>
      </div>
    </div>
  );
};

// ─── AI Analysis Loading Screen ───────────────────────────────────────────────

const AnalysisLoader = () => {
  const steps = [
    "Reading your profile...",
    "Applying eligibility filters...",
    "Checking state-specific schemes...",
    "Running caste & income rules...",
    "Semantic AI ranking...",
    "Generating your report...",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStep(s => (s + 1) % steps.length), 900);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-6">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-orange-500/10 animate-ping" />
        <div className="relative h-24 w-24 rounded-full bg-[#0F172A] border-2 border-[#F97316]/40 flex items-center justify-center">
          <Sparkles className="h-10 w-10 text-[#F97316] animate-pulse" />
        </div>
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">Analyzing 1,250+ Schemes</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-[#94A3B8] text-lg"
          >
            {steps[step]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'bg-[#F97316] w-6' : 'bg-white/10 w-1.5'}`} />
        ))}
      </div>
    </div>
  );
};

// ─── Scheme Result Card ───────────────────────────────────────────────────────

const SchemeResultCard = ({ match, rank }: { match: SchemeMatch; rank: number }) => {
  const [expanded, setExpanded] = useState(rank <= 2);
  const passed = match.breakdown?.filter(d => d.pass) || [];
  const failed = match.breakdown?.filter(d => !d.pass) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
    >
      <Card className="bg-[#0F172A] border border-white/10 rounded-2xl overflow-hidden hover:border-[#F97316]/30 transition-all duration-200">
        <CardContent className="p-0">
          {/* Card Header */}
          <div className="p-5 flex items-start gap-4">
            <ScoreRing score={match.matchScore} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F97316] bg-[#F97316]/10 border border-[#F97316]/20 px-2 py-0.5 rounded-sm">
                  #{rank} Match
                </span>
                {match.matchScore >= 75 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-sm">
                    Highly Eligible
                  </span>
                )}
              </div>
              <h3 className="font-black text-white text-base leading-tight">{match.scheme?.name}</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">{match.scheme?.ministry}</p>
            </div>
          </div>

          {/* Benefits Banner */}
          <div className="mx-5 mb-4 bg-[#020617] rounded-xl px-4 py-3 border border-white/5">
            <p className="text-xs text-[#94A3B8] uppercase tracking-widest font-semibold mb-0.5">Benefit</p>
            <p className="text-white font-bold text-sm">{match.scheme?.benefits}</p>
          </div>

          {/* AI Reason */}
          {match.reason && (
            <div className="mx-5 mb-4 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-[#F97316] shrink-0 mt-0.5" />
              <p className="text-sm text-[#CBD5E1] italic leading-relaxed">{match.reason}</p>
            </div>
          )}

          {/* Eligibility Breakdown Toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-[#94A3B8] hover:bg-white/5 transition-colors"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              {passed.length} passed · {failed.length > 0 ? `${failed.length} concern` : 'No concerns'}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  {match.breakdown?.map((dim, i) => (
                    <BreakdownBadge key={i} dim={dim} />
                  ))}
                </div>

                {/* Documents */}
                {match.documents && match.documents.length > 0 && (
                  <div className="px-5 pb-4">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Required Documents
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {match.documents.map((doc, i) => (
                        <span key={i} className="text-xs bg-[#020617] border border-white/10 text-[#CBD5E1] px-2 py-1 rounded-lg">
                          {doc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Footer */}
          <div className="p-4 pt-2 flex gap-3 border-t border-white/5">
            <Link to={`/scheme/${match.scheme?.id}`} className="flex-1">
              <Button className="w-full bg-white text-black hover:bg-slate-200 font-bold rounded-xl h-10 text-sm">
                View Details <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href={match.scheme?.applyLink} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button variant="outline" className="w-full border-white/10 text-white hover:bg-white/10 font-bold rounded-xl h-10 text-sm">
                Apply Now <ExternalLink className="h-4 w-4 ml-1" />
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Discover = () => {
  const { toast } = useToast();
  const location = useLocation();

  // Step flow: 'input' → 'loading' → 'results'
  const [step, setStep] = useState<'input' | 'loading' | 'results'>('input');
  const [nlpText, setNlpText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [report, setReport] = useState<CitizenReport | null>(null);

  const [profile, setProfile] = useState({
    age: "",
    gender: "",
    occupation: "",
    income: "",
    state: "",
    category: "",
    minority: false,
    disability: false,
    ruralUrban: "",
    maritalStatus: "",
    educationLevel: "",
  });

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state && location.state.profile) {
      const p = location.state.profile;
      setProfile(prev => ({
        ...prev,
        age: p.age ? String(p.age) : prev.age,
        state: p.state || prev.state,
        occupation: p.occupation || prev.occupation,
        income: p.annualIncome || p.income ? String(p.annualIncome || p.income) : prev.income,
        category: p.category || prev.category,
        gender: p.gender || prev.gender,
      }));
      setShowForm(true);
      if (location.state.autoRun) {
        // use a timeout to let state settle
        setTimeout(() => {
          handleAnalyzeWithProfile(p);
        }, 500);
      }
    }
  }, [location.state]);

  const handleNlpExtract = async () => {
    if (!nlpText.trim()) return;
    setIsExtracting(true);
    try {
      const extracted = await extractProfileFromText(nlpText);
      setProfile(prev => ({
        ...prev,
        age: extracted.age ? String(extracted.age) : prev.age,
        state: extracted.state || prev.state,
        occupation: extracted.occupation || prev.occupation,
        income: extracted.income ? String(extracted.income) : prev.income,
      }));
      if (extracted.age || extracted.state || extracted.occupation) {
        toast({
          title: "Profile Extracted ✓",
          description: "We filled in your details. Review and click 'Analyse My Eligibility'."
        });
        setShowForm(true);
      }
    } catch (e) {
      toast({ title: "Could not extract profile", description: "Please fill the form manually.", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAnalyze = async () => {
    handleAnalyzeWithProfile(profile);
  };

  const handleAnalyzeWithProfile = async (profToUse: any) => {
    if (!profToUse.age && !profToUse.state && !profToUse.occupation) {
      toast({ title: "Tell us about yourself", description: "Enter at least your age, state, or occupation.", variant: "destructive" });
      return;
    }

    setStep('loading');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const data = await api.post<{ report: CitizenReport }>('/ai/report', {
        profile: {
          age: profToUse.age ? parseInt(profToUse.age) : undefined,
          gender: profToUse.gender || undefined,
          state: profToUse.state || undefined,
          occupation: profToUse.occupation || undefined,
          annualIncome: profToUse.annualIncome || profToUse.income ? parseInt(profToUse.annualIncome || profToUse.income) : undefined,
          category: profToUse.category || undefined,
          minority: profToUse.minority || undefined,
          disability: profToUse.disability || undefined,
          ruralUrban: profToUse.ruralUrban || undefined,
          maritalStatus: profToUse.maritalStatus || undefined,
          educationLevel: profToUse.educationLevel || undefined,
        }
      });
      setReport(data.report);
      setStep('results');
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      toast({ title: "Analysis Failed", description: "Could not connect to the server. Please try again.", variant: "destructive" });
      setStep('input');
    }
  };

  const resetAll = () => {
    setStep('input');
    setReport(null);
    setNlpText("");
    setProfile({ age: "", gender: "", occupation: "", income: "", state: "", category: "", minority: false, disability: false, ruralUrban: "", maritalStatus: "", educationLevel: "" });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <Navbar />

      {/* Loading State */}
      <AnimatePresence>
        {step === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center pt-20"
          >
            <AnalysisLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input State */}
      <AnimatePresence>
        {step === 'input' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pt-28 pb-20"
          >
            <div className="container mx-auto px-6 max-w-3xl">
              {/* Header */}
              <div className="text-center mb-12">
                <span className="inline-flex items-center rounded-full bg-[#F97316]/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-[#F97316] border border-[#F97316]/20 mb-6">
                  <Sparkles className="h-3 w-3 mr-2" /> Government Scheme Eligibility Checker
                </span>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
                  Find Government Schemes <span className="text-[#F97316]">You May Be Eligible For</span>
                </h1>
                <p className="text-[#94A3B8] text-xl leading-relaxed max-w-xl mx-auto">
                  Provide details about your education, occupation, income, category and location to discover government schemes relevant to your profile.
                </p>
              </div>

              {/* NLP Input Box */}
              <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-8 mb-6 shadow-2xl">
                <label className="block text-sm font-bold text-[#CBD5E1] mb-3">
                  <MessageSquare className="inline h-4 w-4 mr-2 text-[#F97316]" />
                  Describe yourself in your own words
                </label>
                <div className="flex gap-3">
                  <textarea
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNlpExtract(); } }}
                    placeholder='e.g. "I am a 24 year old SC engineering student from Telangana with annual income of 1.2 lakhs"'
                    className="flex-1 bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-[#475569] text-base focus:outline-none focus:border-[#F97316]/50 transition-colors resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-[#475569]">Press Enter or click Extract to auto-fill your profile</p>
                  <Button
                    onClick={handleNlpExtract}
                    disabled={!nlpText.trim() || isExtracting}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xl px-6"
                  >
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" />Extract Profile</>}
                  </Button>
                </div>

                <button
                  onClick={() => setShowForm(!showForm)}
                  className="mt-6 flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white transition-colors"
                >
                  <User className="h-4 w-4" />
                  {showForm ? 'Hide' : 'Or fill details manually'}
                  {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* Manual Form */}
                <AnimatePresence>
                  {showForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/5">
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Age</Label>
                          <Input type="number" placeholder="e.g. 24" value={profile.age} onChange={e => setProfile({...profile, age: e.target.value})} className="bg-[#020617] border-white/10 text-white focus:border-[#F97316]/50 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Gender</Label>
                          <Select value={profile.gender} onValueChange={v => setProfile({...profile, gender: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">State</Label>
                          <Select value={profile.state} onValueChange={v => setProfile({...profile, state: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select State" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white h-[280px]">
                              {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Occupation</Label>
                          <Select value={profile.occupation} onValueChange={v => setProfile({...profile, occupation: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                              {occupations.map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Annual Income (₹)</Label>
                          <Input type="number" placeholder="e.g. 120000" value={profile.income} onChange={e => setProfile({...profile, income: e.target.value})} className="bg-[#020617] border-white/10 text-white focus:border-[#F97316]/50 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Category</Label>
                          <Select value={profile.category} onValueChange={v => setProfile({...profile, category: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Area Type</Label>
                          <Select value={profile.ruralUrban} onValueChange={v => setProfile({...profile, ruralUrban: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                              <SelectItem value="rural">Rural</SelectItem>
                              <SelectItem value="urban">Urban</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-[#94A3B8] uppercase tracking-widest font-bold">Marital Status</Label>
                          <Select value={profile.maritalStatus} onValueChange={v => setProfile({...profile, maritalStatus: v})}>
                            <SelectTrigger className="bg-[#020617] border-white/10 text-white rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="widow">Widow</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-4 pb-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={profile.disability} onChange={e => setProfile({...profile, disability: e.target.checked})} className="h-4 w-4 accent-orange-500" />
                            <span className="text-sm text-[#CBD5E1]">Disability</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={profile.minority} onChange={e => setProfile({...profile, minority: e.target.checked})} className="h-4 w-4 accent-orange-500" />
                            <span className="text-sm text-[#CBD5E1]">Minority</span>
                          </label>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                onClick={handleAnalyze}
                className="w-full h-16 text-lg font-black bg-[#F97316] hover:bg-[#EA580C] text-white rounded-2xl border-0 shadow-xl shadow-[#F97316]/20"
              >
                <Sparkles className="h-5 w-5 mr-3" />
                Analyse My Eligibility
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results State */}
      <AnimatePresence>
        {step === 'results' && report && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-28 pb-20"
          >
            <div className="container mx-auto px-6 max-w-4xl">

              {/* Profile Summary Banner */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-[#F97316]/20 to-[#0F172A] border border-[#F97316]/20 rounded-3xl p-8 mb-10 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-[#F97316] border border-[#F97316]/20 mb-4">
                      <Sparkles className="h-3 w-3 mr-2" /> Your Personalized Report
                    </span>
                    <p className="text-[#E2E8F0] text-xl leading-relaxed max-w-xl">
                      {report.profileSummary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-4xl font-black text-white">{report.topMatches?.length || 0}</div>
                    <div className="text-[#94A3B8] text-sm">Eligible Schemes</div>
                  </div>
                </div>
                <div className="mt-6 flex gap-4">
                  <Button onClick={resetAll} variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-xl">
                    ← Refine Profile
                  </Button>
                </div>
              </motion.div>

              {/* Top Matches */}
              {report.topMatches && report.topMatches.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-6">
                    <Star className="h-6 w-6 text-yellow-400" />
                    <h2 className="text-2xl font-black text-white">Top Eligible Schemes</h2>
                  </div>
                  <div className="space-y-4">
                    {report.topMatches.map((match, i) => (
                      <SchemeResultCard key={match.scheme?.id || i} match={match} rank={i + 1} />
                    ))}
                  </div>
                </div>
              )}

              {/* Partial Matches */}
              {report.partialMatches && report.partialMatches.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <AlertCircle className="h-6 w-6 text-amber-400" />
                    <div>
                      <h2 className="text-2xl font-black text-white">Near-Miss Schemes</h2>
                      <p className="text-[#94A3B8] text-sm">You could qualify with minor adjustments</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {report.partialMatches.map((match, i) => (
                      <motion.div
                        key={match.scheme?.id || i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-[#0F172A] border border-amber-500/10 rounded-2xl p-5 flex items-center gap-4"
                      >
                        <AlertCircle className="h-8 w-8 text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <p className="font-bold text-white">{match.scheme?.name}</p>
                          <p className="text-sm text-amber-400/80 mt-0.5">
                            <span className="font-semibold">Concern: </span>{match.missingCriteria}
                          </p>
                        </div>
                        <Link to={`/scheme/${match.scheme?.id}`}>
                          <Button variant="outline" className="border-white/10 text-white hover:bg-white/10 rounded-xl text-sm shrink-0">
                            <BookOpen className="h-4 w-4 mr-1" /> View
                          </Button>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {report.topMatches?.length === 0 && (
                <div className="text-center py-20 bg-[#0F172A] rounded-3xl border border-white/5">
                  <AlertCircle className="h-16 w-16 text-amber-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-3">No Direct Matches Found</h3>
                  <p className="text-[#94A3B8] mb-6">Try adding more profile details for better results.</p>
                  <Button onClick={resetAll} className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xl px-8">
                    Refine Profile
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default Discover;
