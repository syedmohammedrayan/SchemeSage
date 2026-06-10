import VoiceInput from "../components/VoiceInput";
import SchemeCard from "../components/SchemeCard";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { categories, occupations, indianStates } from "@/data/schemes";
import { Search, User, FileText, Shield, MapPin, Send, Star, Phone, CheckCircle, Sparkles, Mic, History, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSchemes, useSaveScheme } from "@/hooks/useSchemes";
import { useAIRecommendations } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Discover = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Profile capture state
  const [profile, setProfile] = useState({ 
    age: "", 
    gender: "", 
    occupation: "", 
    income: "", 
    state: "", 
    category: "", 
    guestName: "", 
    guestPhone: "" 
  });
  
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [agentDialog, setAgentDialog] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en-IN");

  // Fetch agents based on selected state
  useEffect(() => {
    const activeState = profile.state;
    if (activeState) {
      api.get<any[]>(`/agents?location=${activeState}`)
        .then(setAgents)
        .catch(console.error);
    }
  }, [profile.state]);

  // Queries
  const { data: schemes = [], isLoading: schemesLoading } = useSchemes(
    searchQuery ? { search: searchQuery } : undefined
  );
  const { data: recommendations, isLoading: recLoading, refetch: fetchRecs } = useAIRecommendations(showRecommendations, selectedLang, profile, searchQuery);

  // Text-to-speech logic for accessibility
  const speak = (text: string, lang: string) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    speechSynthesis.speak(utterance);
  };

  const handleVoice = (text: string, lang: string) => {
    setSearchQuery(text);
    setSelectedLang(lang);
    setShowRecommendations(true);
    toast({ title: "Voice Captured", description: `Searching for: \"${text}\"` });
  };

  useEffect(() => {
    if (recommendations && recommendations.length > 0) {
      const top = recommendations[0];
      const message = `I found ${recommendations.length} schemes for you. Top match is ${top.scheme.name}`;
      speak(message, selectedLang);
    }
  }, [recommendations]);

  const findSchemes = () => {
    if (!profile.age || !profile.state) {
      toast({ title: "Incomplete Profile", description: "Please enter at least age and state for accurate matching.", variant: "destructive" });
      return;
    }
    setShowRecommendations(true);
    // Scroll to results
    const resultsElem = document.getElementById('results-section');
    resultsElem?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAgentRequest = async () => {
    if (!selectedAgent) return;
    try {
      await api.post("/agents/request", {
        agentId: selectedAgent.id,
        userName: profile.guestName || "Interested Citizen",
        userPhone: profile.guestPhone || "",
        message: agentMessage || "I need help with scheme applications."
      });
      toast({ title: "Request Sent!", description: `${selectedAgent.fullName} will contact you shortly.` });
      setAgentDialog(false);
      setAgentMessage("");
      setSelectedAgent(null);
    } catch (e) {
      toast({ title: "Request Failed", description: "Could not send request. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <Navbar />
      
      {/* Hero / Header Section */}
      <div className="relative pt-12 pb-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-accent/5 blur-[120px] rounded-full" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge variant="outline" className="border-accent/30 text-accent mb-4 px-4 py-1 bg-accent/5 backdrop-blur-md">
            <Sparkles className="h-3 w-3 mr-2" /> AI-Powered Discovery
          </Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4 tracking-tight">
            Find Your <span className="text-accent">Welfare Match</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Speak or enter your details below. Our AI scans hundreds of government schemes to find the ones you are eligible for.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-4 pb-20 space-y-12">
        {/* Voice and Profile Capture Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Profile Form */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="bg-slate-900/50 border-white/10 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <FileText className="h-24 w-24" />
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <User className="h-5 w-5 text-accent" /> Personalized Search
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Fill in your details for a tailored eligibility report.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                   <div className="space-y-2">
                     <Label className="text-slate-300">Age</Label>
                     <Input 
                      type="number" 
                      placeholder="e.g. 25" 
                      value={profile.age} 
                      onChange={(e) => setProfile({ ...profile, age: e.target.value })} 
                      className="bg-slate-800/50 border-white/10 focus:border-accent text-white" 
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-slate-300">Gender</Label>
                     <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                       <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-white/10 text-white">
                         <SelectItem value="male">Male</SelectItem>
                         <SelectItem value="female">Female</SelectItem>
                         <SelectItem value="other">Other</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-slate-300">State / Location</Label>
                     <Select value={profile.state} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                       <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select State" /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-white/10 text-white h-[300px]">
                         {indianStates.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-slate-300">Occupation</Label>
                     <Select value={profile.occupation} onValueChange={(v) => setProfile({ ...profile, occupation: v })}>
                       <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-white/10 text-white">
                         {occupations.map((o) => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-slate-300">Annual Income (₹)</Label>
                     <Input 
                      type="number" 
                      placeholder="e.g. 250000" 
                      value={profile.income} 
                      onChange={(e) => setProfile({ ...profile, income: e.target.value })} 
                      className="bg-slate-800/50 border-white/10 focus:border-accent text-white" 
                     />
                   </div>
                   <div className="space-y-2">
                     <Label className="text-slate-300">Category</Label>
                     <Select value={profile.category} onValueChange={(v) => setProfile({ ...profile, category: v })}>
                       <SelectTrigger className="bg-slate-800/50 border-white/10 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                       <SelectContent className="bg-slate-900 border-white/10 text-white">
                         {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                </div>
                
                <Button 
                  onClick={findSchemes} 
                  variant="accent" 
                  size="lg" 
                  className="w-full h-14 text-lg shadow-lg shadow-accent/20" 
                  disabled={recLoading}
                >
                  <Search className="h-5 w-5 mr-2" /> 
                  {recLoading ? "AI is matching your profile..." : "Generate My Scheme Report"}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500 group-focus-within:text-accent transition-colors" />
              </div>
              <Input 
                placeholder="Or search by scheme name, tag, or ministry..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="h-14 pl-12 bg-slate-900/30 border-white/10 text-white text-lg focus:bg-slate-900/50 transition-all rounded-2xl"
              />
            </div>
          </div>

          {/* Right: Voice Input Section */}
          <div className="lg:col-span-4 h-full">
            <VoiceInput onResult={handleVoice} />
          </div>
        </div>

        {/* Results Section */}
        <section id="results-section" className="scroll-mt-24">
          {showRecommendations && recommendations && recommendations.length > 0 && (
            <div className="space-y-6 mb-12">
               <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-accent" />
                 </div>
                 <div>
                   <h2 className="text-2xl font-bold font-heading">AI Matches for You</h2>
                   <p className="text-slate-400 text-sm">Ranked by eligibility probability</p>
                 </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map((rec: any) => (
                    <div key={rec.schemeId} className="transform transition-all hover:-translate-y-1">
                      <SchemeCard
                        scheme={rec.scheme}
                        matchScore={rec.matchScore}
                        matchReason={rec.reason}
                      />
                    </div>
                  ))}
               </div>
            </div>
          )}

          {(!showRecommendations || !recommendations?.length) && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                <History className="h-6 w-6 text-slate-500" /> 
                {searchQuery ? `Search Results for \"${searchQuery}\"` : "All Regional Schemes"}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schemesLoading ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-80 bg-slate-900/30 animate-pulse rounded-2xl border border-white/5" />
                  ))
                ) : schemes.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                     <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                     <p className="text-slate-500">No schemes found for your current filters.</p>
                     <Button variant="link" className="text-accent" onClick={() => { setSearchQuery(""); setShowRecommendations(false); }}>Reset Search</Button>
                  </div>
                ) : (
                  schemes.map((scheme: any) => (
                    <SchemeCard key={scheme.id} scheme={scheme} />
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* Professional Assistance Section */}
        {agents && agents.length > 0 && (
          <section className="bg-slate-900/30 rounded-3xl p-8 border border-white/5">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
               <div>
                  <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
                    <Shield className="h-6 w-6 text-accent" /> Connect with Professional Agents
                  </h2>
                  <p className="text-slate-400 mt-1">Get free 1-on-1 assistance with these applications in {profile.state}.</p>
               </div>
               <Badge className="bg-accent/10 text-accent border-accent/20 px-4 py-1.5 h-fit">
                 {agents.length} Verified Agents Online
               </Badge>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <Card key={agent.id} className="bg-slate-900/50 border-white/10 hover:border-accent/40 transition-all group">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div className="bg-accent/10 h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-accent text-xl">
                             {agent.fullName?.charAt(0)}
                           </div>
                           <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/20 bg-green-500/5 uppercase">
                             <CheckCircle className="h-2.5 w-2.5 mr-1" /> Trust Verified
                           </Badge>
                        </div>
                        <h4 className="font-bold text-lg">{agent.fullName}</h4>
                        <div className="space-y-2 mt-3 mb-6">
                           <div className="flex items-center gap-2 text-sm text-slate-400">
                             <MapPin className="h-3.5 w-3.5 text-accent" /> {agent.state}{agent.district ? `, ${agent.district}` : ''}
                           </div>
                           <div className="flex items-center gap-2 text-sm text-slate-400">
                             <Star className="h-3.5 w-3.5 text-amber-500" /> 
                             Expertise: <span className="text-slate-200 capitalize">{agent.expertise}</span>
                           </div>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full border-white/10 hover:bg-accent hover:text-white transition-all rounded-xl"
                          onClick={() => { setSelectedAgent(agent); setAgentMessage(""); setAgentDialog(true); }}
                        >
                          <Phone className="h-4 w-4 mr-2" /> Request Callback
                        </Button>
                     </CardContent>
                  </Card>
                ))}
             </div>
          </section>
        )}
      </main>

      <Footer />

      {/* Agent Request Modal */}
      <Dialog open={agentDialog} onOpenChange={setAgentDialog}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
              <Phone className="h-6 w-6 text-accent" /> Professional Quote
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-base">
              Request a free callback from <span className="text-white font-semibold">{selectedAgent?.fullName}</span>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Your Full Name</Label>
                <Input
                  placeholder="e.g. Rahul Kumar"
                  value={profile.guestName}
                  onChange={(e) => setProfile({ ...profile, guestName: e.target.value })}
                  className="bg-slate-800/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Contact Number</Label>
                <Input
                  placeholder="e.g. 9876543210"
                  value={profile.guestPhone}
                  onChange={(e) => setProfile({ ...profile, guestPhone: e.target.value })}
                  className="bg-slate-800/50 border-white/10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">How can {selectedAgent?.fullName} help you?</Label>
              <Textarea
                placeholder="E.g. I need help finding eligible health schemes for my family."
                value={agentMessage}
                onChange={(e) => setAgentMessage(e.target.value)}
                rows={4}
                className="bg-slate-800/50 border-white/10 resize-none"
              />
            </div>

            <div className="bg-accent/5 p-4 rounded-2xl border border-accent/10 flex items-start gap-3">
               <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
               <p className="text-xs text-slate-400 leading-relaxed">
                 By clicking send, you agree to share your contact details with the verified agent. They will reach out via call or WhatsApp.
               </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 border-white/10" onClick={() => setAgentDialog(false)}>Cancel</Button>
            <Button variant="accent" className="flex-1 shadow-lg shadow-accent/20" onClick={handleAgentRequest}>
               <Send className="h-4 w-4 mr-2" /> Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discover;
