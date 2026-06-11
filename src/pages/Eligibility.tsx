import React, { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import VoiceInput from "@/components/VoiceInput";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, MapPin, Briefcase, IndianRupee, ExternalLink, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";

const Eligibility = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <Navbar />

      <main className="container mx-auto px-4 py-32 max-w-5xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">
            Discover <span className="text-[#F97316]">Your Benefits</span>
          </h1>
        </div>

        {/* Voice Input Component */}
        <VoiceInput onResult={handleVoiceResult} />

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
              <div className="flex gap-4 items-center justify-center pt-4">
                 <p className="text-xs text-[#64748B] italic">"{result.translatedText}"</p>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-8 pt-8">
              <h2 className="text-3xl font-black text-white flex items-center gap-3 border-b border-white/10 pb-4">
                <ShieldCheck className="h-8 w-8 text-[#F97316]" />
                Recommended Schemes
              </h2>
              
              {Object.keys(result.recommendations || {}).length === 0 ? (
                <div className="text-center p-12 bg-[#020617] rounded-3xl border border-white/5">
                  <p className="text-[#94A3B8] text-lg">No direct matches found. Try providing more details like income or caste!</p>
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
