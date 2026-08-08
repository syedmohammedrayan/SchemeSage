import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import VoiceInput from "@/components/VoiceInput";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, MapPin, Briefcase, IndianRupee, ExternalLink, ArrowRight, ShieldCheck, CheckCircle2, Mic, FileText, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categories, occupations, indianStates } from "@/data/schemes";

const Eligibility = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'manual' ? 'manual' : 'voice';
  
  const [mode, setMode] = useState<'voice' | 'manual'>(initialMode);
  
  React.useEffect(() => {
    const queryMode = searchParams.get('mode') === 'manual' ? 'manual' : 'voice';
    setMode(queryMode);
  }, [searchParams]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nlpText, setNlpText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  
  const [manualProfile, setManualProfile] = useState({
    age: '',
    gender: '',
    state: '',
    occupation: '',
    income: '',
    category: '',
    maritalStatus: '',
    ruralUrban: '',
    disability: false,
    minority: false
  });

  const handleNlpExtract = async () => {
    if (!nlpText.trim()) return;
    setIsExtracting(true);
    setResult(null);
    try {
      const result = await api.post<any>('/voice/voice-profile', { text: nlpText, language: 'en-IN' });
      const extracted = result?.profile || {};
      setManualProfile(prev => ({
        ...prev,
        age: extracted.age ? String(extracted.age) : prev.age,
        state: extracted.state || prev.state,
        occupation: extracted.occupation || prev.occupation,
        income: extracted.income || extracted.annualIncome ? String(extracted.income || extracted.annualIncome) : prev.income,
        category: extracted.category || prev.category,
        gender: extracted.gender ? extracted.gender.charAt(0).toUpperCase() + extracted.gender.slice(1).toLowerCase() : prev.gender,
        maritalStatus: extracted.maritalStatus || prev.maritalStatus,
        ruralUrban: extracted.ruralUrban || prev.ruralUrban,
        disability: extracted.disability !== undefined ? extracted.disability : prev.disability,
        minority: extracted.minority !== undefined ? extracted.minority : prev.minority,
      }));
      setResult(result);
      toast({ title: "Profile Extracted ✓", description: "Details filled in and schemes found instantly!" });
    } catch (e) {
      toast({ title: "Extraction Failed", description: "Could not extract profile. Please fill manually.", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleVoiceResult = async (text: string, language: string) => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<any>("/voice/voice-profile", { text, language });
      setResult(res);

      try {
        await addDoc(collection(firestore, "voiceSessions"), {
          userId: "anonymous", 
          originalText: res.originalText,
          translatedText: res.translatedText,
          profile: res.profile,
          createdAt: new Date().toISOString()
        });
      } catch (fbErr) {
        console.error("Firebase persistence failed:", fbErr);
      }

    } catch (err) {
      console.error(err);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the voice input. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getProfileIcon = (key: string) => {
    const k = key.toLowerCase();
    if (k.includes('age') || k.includes('gender')) return <User className="h-5 w-5 text-blue-400" />;
    if (k.includes('state') || k.includes('location')) return <MapPin className="h-5 w-5 text-emerald-400" />;
    if (k.includes('occupation') || k.includes('employment')) return <Briefcase className="h-5 w-5 text-purple-400" />;
    if (k.includes('income')) return <IndianRupee className="h-5 w-5 text-amber-400" />;
    return <CheckCircle2 className="h-5 w-5 text-slate-400" />;
  };

  const handleModeSwitch = (newMode: 'voice' | 'manual') => {
    setMode(newMode);
    setSearchParams(newMode === 'manual' ? { mode: 'manual' } : {});
    setResult(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const profilePayload = {
        age: parseInt(manualProfile.age) || undefined,
        gender: manualProfile.gender || undefined,
        state: manualProfile.state || undefined,
        occupation: manualProfile.occupation || undefined,
        annualIncome: parseInt(manualProfile.income) || undefined,
        category: manualProfile.category || undefined,
        ruralUrban: manualProfile.ruralUrban || undefined,
        maritalStatus: manualProfile.maritalStatus || undefined,
        disability: manualProfile.disability || undefined,
        minority: manualProfile.minority || undefined,
      };

      const res: any = await api.post(`/ai/report`, { profile: profilePayload });
      
      const recs = { 
        'Top Matches': res.report?.topMatches || [], 
        'Other Matches': res.report?.partialMatches || [] 
      };
      
      setResult({ 
        profile: profilePayload, 
        recommendations: recs, 
        profileCompleteness: 100 
      });
      
    } catch (err) {
      console.error(err);
      toast({
        title: "Check Failed",
        description: "Could not check eligibility. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <Navbar />

      <main className="container mx-auto px-4 py-32 max-w-5xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-100 tracking-tight mb-4">
            Eligibility Check
          </h1>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 shadow-sm">
            <button
              onClick={() => handleModeSwitch('voice')}
              className={`px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors ${
                mode === 'voice' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Mic className="h-4 w-4" /> Voice Assistant
            </button>
            <button
              onClick={() => handleModeSwitch('manual')}
              className={`px-6 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors ${
                mode === 'manual' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="h-4 w-4" /> Fill Manually
            </button>
          </div>
        </div>

        {/* Inputs */}
        {mode === 'voice' ? (
          <VoiceInput onResult={handleVoiceResult} />
        ) : (
          <Card className="bg-[#020617] border-white/10 max-w-3xl mx-auto shadow-2xl overflow-hidden mb-12">
            <div className="bg-[#F97316]/10 px-6 py-4 border-b border-[#F97316]/20">
              <h3 className="font-black text-white text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#F97316]" /> Manual Profile Entry
              </h3>
            </div>
            <CardContent className="p-6 sm:p-8">
              
              {/* NLP Input Box */}
              <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 mb-8 shadow-inner">
                <label className="block text-sm font-bold text-[#CBD5E1] mb-3">
                  <MessageSquare className="inline h-4 w-4 mr-2 text-[#F97316]" />
                  Describe yourself in your own words (Auto-fill)
                </label>
                <div className="flex gap-3">
                  <textarea
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNlpExtract(); } }}
                    placeholder='e.g. "I am a 24 year old SC farmer from Telangana with annual income of 1.2 lakhs"'
                    className="flex-1 bg-[#020617] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-[#475569] text-base focus:outline-none focus:border-[#F97316]/50 transition-colors resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-[#475569]">Press Enter or click Extract to auto-fill</p>
                  <Button
                    onClick={handleNlpExtract}
                    disabled={!nlpText.trim() || isExtracting}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white font-bold rounded-xl px-6"
                    type="button"
                  >
                    {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" />Extract</>}
                  </Button>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Age *</label>
                    <Input 
                      required type="number" min="1" max="120"
                      value={manualProfile.age} onChange={e => setManualProfile({...manualProfile, age: e.target.value})}
                      className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]" placeholder="e.g. 35"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Gender *</label>
                    <Select required value={manualProfile.gender} onValueChange={v => setManualProfile({...manualProfile, gender: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">State/UT *</label>
                    <Select required value={manualProfile.state} onValueChange={v => setManualProfile({...manualProfile, state: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white max-h-[300px]">
                        {indianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Occupation *</label>
                    <Select required value={manualProfile.occupation} onValueChange={v => setManualProfile({...manualProfile, occupation: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select Occupation" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        {occupations.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Annual Family Income (₹) *</label>
                    <Input 
                      required type="number" min="0" step="10000"
                      value={manualProfile.income} onChange={e => setManualProfile({...manualProfile, income: e.target.value})}
                      className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]" placeholder="e.g. 250000"
                    />
                  </div>

                  {/* Extra Fields */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Category</label>
                    <Select value={manualProfile.category} onValueChange={v => setManualProfile({...manualProfile, category: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Area Type</label>
                    <Select value={manualProfile.ruralUrban} onValueChange={v => setManualProfile({...manualProfile, ruralUrban: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select Area Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        <SelectItem value="Rural">Rural</SelectItem>
                        <SelectItem value="Urban">Urban</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">Marital Status</label>
                    <Select value={manualProfile.maritalStatus} onValueChange={v => setManualProfile({...manualProfile, maritalStatus: v})}>
                      <SelectTrigger className="bg-[#0F172A] border-white/10 h-12 text-white focus:border-[#F97316]">
                        <SelectValue placeholder="Select Marital Status" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F172A] border-white/10 text-white">
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="flex gap-4 items-center h-12">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={manualProfile.disability} 
                          onChange={e => setManualProfile({...manualProfile, disability: e.target.checked})}
                          className="w-4 h-4 rounded border-white/10 bg-[#0F172A] text-[#F97316] focus:ring-[#F97316]/50"
                        />
                        <span className="text-sm font-medium text-white">Disability</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={manualProfile.minority} 
                          onChange={e => setManualProfile({...manualProfile, minority: e.target.checked})}
                          className="w-4 h-4 rounded border-white/10 bg-[#0F172A] text-[#F97316] focus:ring-[#F97316]/50"
                        />
                        <span className="text-sm font-medium text-white">Minority</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-black h-14 rounded-xl text-lg shadow-xl shadow-[#F97316]/20 mt-4"
                >
                  {loading ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Checking...</> : "Check My Eligibility"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading && (
          <div className="text-center py-16 bg-[#020617]/50 rounded-3xl border border-white/5 backdrop-blur-sm">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-[#F97316]/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#F97316] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="text-2xl font-black tracking-tight text-white mb-2">Analyzing Profile...</p>
            <p className="text-[#94A3B8] font-medium">Cross-referencing government databases</p>
          </div>
        )}

        {result && !loading && (
          <div className="mt-8 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* User Profile Summary */}
            <div className="bg-[#0F172A] border border-slate-800 rounded-2xl p-8 shadow-xl relative">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 mb-6 gap-4">
                <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
                  <div className="h-10 w-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                    <User className="h-5 w-5" /> 
                  </div>
                  Extracted Profile
                </h2>
                
                <div className="flex items-center gap-4 bg-slate-900 px-5 py-2.5 rounded-xl border border-slate-800">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Completeness</span>
                     <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden shrink-0">
                       <div className="h-full bg-blue-600" style={{ width: `${result.profileCompleteness || 0}%` }} />
                     </div>
                   </div>
                   <span className="text-base font-bold text-slate-200">
                     {result.profileCompleteness || 0}%
                   </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Object.entries(result.profile || {}).map(([key, val]: any) => {
                  if (val === null || val === undefined || val === '') return null;
                  return (
                    <div key={key} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-800">
                      <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800 text-slate-400">
                        {getProfileIcon(key)}
                      </div>
                      <div className="flex flex-col justify-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{key}</p>
                        <p className="font-semibold text-slate-200 text-sm capitalize">{String(val)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Optional: Translation Feedback */}
              {result.translatedText && (
                <div className="mt-8 pt-6 border-t border-slate-800 flex gap-3 items-center justify-center">
                   <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                   <p className="text-sm text-slate-400 font-medium">Understood as: <span className="text-slate-300">"{result.translatedText}"</span></p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="space-y-8 pt-8">
              <h2 className="text-3xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4">
                <ShieldCheck className="h-8 w-8 text-[#F97316]" />
                Recommended Schemes
              </h2>
              
              {result.profileCompleteness === 0 ? (
                <div className="text-center p-12 bg-red-500/10 rounded-3xl border border-red-500/20">
                  <p className="text-red-400 text-lg font-bold">Invalid or irrelevant input provided.</p>
                  <p className="text-[#94A3B8] text-md mt-2">We could not extract any realistic details like age, state, occupation, or income from your input. Please speak clearly about your eligibility details.</p>
                </div>
              ) : Object.keys(result.recommendations || {}).length === 0 ? (
                <div className="text-center p-12 bg-[#020617] rounded-3xl border border-white/5">
                  <p className="text-[#94A3B8] text-lg">We couldn't find matching schemes right now. Try speaking more details like your age, state, occupation, or income for better results!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from(
                    new Map(
                      Object.entries(result.recommendations || {})
                        .flatMap(([_, schemes]: any) => schemes)
                        .filter((match: any) => match?.scheme?.id)
                        .map((match: any) => [match.scheme.id, match])
                    ).values()
                  ).sort((a: any, b: any) => b.matchScore - a.matchScore).map((match: any) => {
                    const isStrong = match.matchScore >= 75;
                    const matchColor = isStrong ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";

                    return (
                      <Card key={match.scheme?.id || Math.random()} className="bg-[#0F172A] border-slate-800 hover:border-slate-700 transition-colors shadow-lg flex flex-col h-full rounded-2xl">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded border ${
                              isStrong ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-slate-400 bg-slate-800 border-slate-700'
                            }`}>
                              {isStrong ? 'Strong Match' : 'Potential Match'} • {match.matchScore}%
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-slate-100 mb-2 leading-tight">
                            {match.scheme?.name}
                          </h3>
                          <p className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                            {match.scheme?.ministry || 'Government of India'}
                          </p>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-grow flex flex-col gap-5">
                          {match.scheme?.benefits && (
                            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Key Benefits</p>
                              <p className="text-sm text-slate-300 font-medium leading-relaxed">{match.scheme?.benefits}</p>
                            </div>
                          )}

                          {match.reason && (
                            <div className="mt-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Why Recommended</p>
                              <div className="flex items-start gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                                <span className="text-sm font-medium text-slate-300">{match.reason}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-3 rounded-b-2xl">
                          <Button 
                            variant="outline" 
                            className="flex-1 bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300 h-11 rounded-lg font-semibold"
                            onClick={() => navigate(`/scheme/${match.scheme?.id}`)}
                          >
                            View Details
                          </Button>
                          <Button 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-lg font-semibold border-0"
                            onClick={() => navigate(`/apply/${match.scheme?.id}`)}
                          >
                            Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Eligibility;
