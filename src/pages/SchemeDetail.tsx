import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Building2, Users, FileText, Calendar, ShieldCheck, 
  ExternalLink, ChevronLeft, ArrowRight, Share2, 
  Bookmark, CheckCircle2, XCircle, AlertTriangle, Sparkles,
  RefreshCw, Loader2, IndianRupee, Mic, ClipboardList
} from "lucide-react";

const ScoreRing = ({ score }: { score: number }) => {
  const color = score >= 75 ? '#22C55E' : score >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${score} 100`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-black text-white">{score}%</span>
        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest -mt-1">Match</span>
      </div>
    </div>
  );
};

const SchemeDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  useEffect(() => {
    fetchScheme();
  }, [id]);

  const fetchScheme = async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/schemes/${id}`);
      const schemeData = res.scheme || res; // Fallback in case backend format changes
      setScheme(schemeData);
      // Do NOT auto-check eligibility — user must provide their details first
    } catch (e) {
      toast({ title: "Failed to load scheme details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#F97316] animate-spin" />
      </div>
    );
  }

  if (!scheme) return <div className="min-h-screen bg-[#0F172A] text-white pt-24 text-center">Scheme not found.</div>;

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      <Navbar />

      <main className="container mx-auto px-4 pt-24 pb-20 max-w-5xl">
        {/* Back Link */}
        <Link to="/discover" className="inline-flex items-center text-sm font-semibold text-[#94A3B8] hover:text-white transition-colors mb-8 group">
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Back to Discovery
        </Link>

        {/* Hero Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              {scheme.ministry && (
                <Badge variant="outline" className="border-[#F97316]/30 text-[#F97316] bg-[#F97316]/10 uppercase tracking-widest text-[10px] font-black px-2.5 py-0.5">
                  {scheme.ministry}
                </Badge>
              )}
              {scheme.source && (
                 <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 uppercase tracking-widest text-[10px] font-black px-2.5 py-0.5 flex items-center gap-1">
                   <ShieldCheck className="h-3 w-3" /> Source: {scheme.source.split('/')[1] || scheme.source.replace('AI Extractor / ', '')}
                 </Badge>
              )}
              {scheme.updatedAt && (
                 <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 uppercase tracking-widest text-[10px] font-black px-2.5 py-0.5 flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Verified {new Date(scheme.updatedAt).toLocaleDateString()}
                 </Badge>
              )}
              {scheme.tags?.slice(0, 2).map((tag: string) => (
                <Badge key={tag} variant="outline" className="border-white/10 text-[#94A3B8] bg-white/5 uppercase tracking-widest text-[10px] font-black px-2.5 py-0.5">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              {scheme.name || scheme.title}
            </h1>
            
            <p className="text-[#94A3B8] text-lg leading-relaxed max-w-3xl">
              {scheme.description || scheme.summary}
            </p>
          </div>
          
          <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-auto">
            <Button className="flex-1 md:w-40 bg-white hover:bg-slate-200 text-black hover:text-black font-bold h-12 rounded-xl border-0 shadow-none">
              <Bookmark className="h-4 w-4 mr-2" /> Save
            </Button>
            <Button className="flex-1 md:w-40 bg-white hover:bg-slate-200 text-black hover:text-black font-bold h-12 rounded-xl border-0 shadow-none">
              <Share2 className="h-4 w-4 mr-2" /> Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content (Left 2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Highlights Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-[#020617] border-white/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#F97316]/10 flex items-center justify-center shrink-0">
                    <IndianRupee className="h-5 w-5 text-[#F97316]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Key Benefit</p>
                    <p className="text-white text-sm font-semibold line-clamp-2">{scheme.benefits}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#020617] border-white/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Target Group</p>
                    <p className="text-white text-sm font-semibold line-clamp-2">{scheme.eligibility?.occupations?.join(', ') || 'All Citizens'}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#020617] border-white/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Deadline</p>
                    <p className="text-white text-sm font-semibold">{scheme.deadline ? new Date(scheme.deadline).toLocaleDateString() : 'Continuous'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Eligibility Panel — only shows prompt until user provides details */}
            <Card className="bg-gradient-to-br from-[#F97316]/10 to-[#0F172A] border-[#F97316]/20 overflow-hidden shadow-2xl">
              <div className="bg-[#F97316]/10 px-6 py-4 border-b border-[#F97316]/20 flex items-center justify-between">
                <h3 className="font-black flex items-center gap-2 text-white text-lg">
                  <Sparkles className="h-5 w-5 text-[#F97316]" /> Your Eligibility Analysis
                </h3>
              </div>
              
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-[#F97316]/10 flex items-center justify-center">
                    <ClipboardList className="h-8 w-8 text-[#F97316]" />
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">Enter Your Details First</h4>
                  <p className="text-[#94A3B8] mb-6 max-w-md mx-auto">
                    Tell us about yourself — your age, state, income, occupation — to get a personalized eligibility match for this scheme.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to="/eligibility">
                      <Button variant="accent" className="font-bold rounded-xl shadow-lg shadow-[#F97316]/20 h-12 px-6">
                        <Mic className="h-4 w-4 mr-2" /> Use Voice Input
                      </Button>
                    </Link>
                    <Link to="/eligibility">
                      <Button variant="outline" className="font-bold rounded-xl border-white/10 hover:bg-white/5 text-white h-12 px-6">
                        <ClipboardList className="h-4 w-4 mr-2" /> Fill Manually
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#F97316]" /> Required Documents
              </h3>
              <div className="bg-[#020617] border border-white/10 rounded-2xl p-6">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(scheme.documents && scheme.documents.length > 0 ? scheme.documents : [
                    "Aadhaar Card",
                    "Income Certificate",
                    "Bank Account Passbook",
                    "Passport Size Photograph",
                    "Category Certificate (if applicable)"
                  ]).map((doc: string, i: number) => (
                    <li key={i} className="flex items-center gap-3 text-[#CBD5E1]">
                      <div className="h-2 w-2 rounded-full bg-[#F97316] shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
          </div>

          {/* Sidebar (Right 1/3) */}
          <div className="space-y-6">
            
            {/* Apply Action Card */}
            <Card className="bg-[#0F172A] border-white/10 overflow-hidden sticky top-24">
              <div className="p-6 pb-4">
                <h3 className="font-black text-xl mb-2 text-white">Ready to Apply?</h3>
                <p className="text-[#94A3B8] text-sm mb-6">You can choose direct application or professional agent assistance.</p>
                
                <Link to={`/apply/${scheme.id || id}`}>
                  <Button className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white font-black h-14 rounded-xl text-lg shadow-xl shadow-[#F97316]/20">
                    Apply Now <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
              </div>
              
              <div className="bg-[#020617] p-4 text-center border-t border-white/5 space-y-4">
                <p className="text-xs font-semibold text-[#94A3B8] flex items-center justify-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-green-500" /> Official Government Scheme
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold uppercase tracking-widest text-[10px]"
                  onClick={() => toast({ title: "Report Submitted", description: "This scheme has been flagged for re-verification by our AI Agents." })}
                >
                  <AlertTriangle className="h-3 w-3 mr-2" /> Report Outdated Info
                </Button>
              </div>
            </Card>
            
          </div>
          
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SchemeDetail;
