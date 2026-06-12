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
import { User, MapPin, Briefcase, IndianRupee, ExternalLink, ArrowRight, ShieldCheck, CheckCircle2, Mic, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

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
  
  const [manualProfile, setManualProfile] = useState({
    age: '',
    gender: '',
    state: '',
    occupation: '',
    income: ''
  });

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
        income: parseInt(manualProfile.income) || undefined
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
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
            Discover <span className="text-[#F97316]">Your Benefits</span>
          </h1>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="flex justify-center mb-10">
          <div className="bg-[#020617] border border-white/10 p-1.5 rounded-2xl flex gap-1 shadow-2xl">
            <button
              onClick={() => handleModeSwitch('voice')}
              className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                mode === 'voice' 
                  ? 'bg-[#F97316] text-white shadow-lg shadow-[#F97316]/20' 
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              <Mic className="h-4 w-4" /> Voice Input
            </button>
            <button
              onClick={() => handleModeSwitch('manual')}
              className={`px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                mode === 'manual' 
                  ? 'bg-[#F97316] text-white shadow-lg shadow-[#F97316]/20' 
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
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
                        {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                        <SelectItem value="Farmer">Farmer</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Entrepreneur">Entrepreneur / Business</SelectItem>
                        <SelectItem value="Salaried">Salaried</SelectItem>
                        <SelectItem value="Unemployed">Unemployed</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
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
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h2 className="text-2xl font-black flex items-center gap-3">
                  <User className="h-6 w-6 text-[#F97316]" /> 
                  Extracted Profile
                </h2>
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                   <div className="h-2 w-24 bg-[#020617] rounded-full overflow-hidden shrink-0">
                     <div className="h-full bg-[#F97316]" style={{ width: `${result.profileCompleteness || 0}%` }} />
                   </div>
                   <span className="text-xs font-bold text-[#F97316]">{result.profileCompleteness || 0}% Complete</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(result.profile || {}).map(([key, val]: any) => {
                  if (val === null || val === undefined || val === '') return null;
                  return (
                    <Card key={key} className="bg-[#020617] border-white/10 shadow-lg hover:border-white/20 transition-colors">
                      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                          {getProfileIcon(key)}
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-1">{key}</p>
                          <p className="font-bold text-white text-sm capitalize">{String(val)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Optional: Translation Feedback */}
              {result.translatedText && (
                <div className="flex gap-4 items-center justify-center pt-4">
                   <p className="text-xs text-[#64748B] italic">"{result.translatedText}"</p>
                </div>
              )}
            </div>

            {/* Recommendations */}
            <div className="space-y-8 pt-8">
              <h2 className="text-3xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4">
                <ShieldCheck className="h-8 w-8 text-[#F97316]" />
                Recommended Schemes
              </h2>
              
              {Object.keys(result.recommendations || {}).length === 0 ? (
                <div className="text-center p-12 bg-[#020617] rounded-3xl border border-white/5">
                  <p className="text-[#94A3B8] text-lg">We couldn't find matching schemes right now. Try speaking more details like your age, state, occupation, or income for better results!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(result.recommendations || {}).flatMap(([_, schemes]: any) => schemes).sort((a:any, b:any) => b.matchScore - a.matchScore).map((match: any) => {
                    const isStrong = match.matchScore >= 75;
                    const matchColor = isStrong ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20";

                    return (
                      <Card key={match.schemeId} className="bg-[#020617] border-white/10 hover:border-[#F97316]/30 transition-all duration-300 shadow-xl overflow-hidden flex flex-col h-full group">
                        
                        {/* Header */}
                        <div className="p-6 border-b border-white/5">
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border ${matchColor}`}>
                              {isStrong ? 'Strong Match' : 'Potential Match'} • {match.matchScore}%
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-[#F97316] transition-colors">{match.schemeName}</h3>
                          <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" /> {match.ministry || 'Government of India'}
                          </p>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex-grow flex flex-col gap-5">
                          {match.benefits && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#F97316] mb-2">Key Benefits</p>
                              <p className="text-sm text-white font-medium leading-relaxed">{match.benefits}</p>
                            </div>
                          )}

                          {match.reasons && match.reasons.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-3">Why Recommended</p>
                              <ul className="space-y-2">
                                {match.reasons.map((r: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[#CBD5E1]">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/5 bg-[#0F172A]/50 flex gap-3">
                          <Button 
                            variant="outline" 
                            className="flex-1 bg-transparent border-white/10 hover:bg-white/5 text-white h-12 rounded-xl font-bold"
                            onClick={() => navigate(`/scheme/${match.schemeId}`)}
                          >
                            View Details
                          </Button>
                          <Button 
                            variant="accent" 
                            className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-[#F97316]/20"
                            onClick={() => navigate(`/apply/${match.schemeId}`)}
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
