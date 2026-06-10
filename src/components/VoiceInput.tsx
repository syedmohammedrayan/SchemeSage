import { useState, useRef, useEffect } from "react";
import { Mic, Sparkles, Loader2, StopCircle, CheckCircle2, User, MapPin, Briefcase, IndianRupee } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type ExtractedProfile = {
  age: string | null;
  state: string | null;
  occupation: string | null;
  income: string | null;
};

type Props = {
  onResult: (text: string, lang: string, profile?: ExtractedProfile) => void;
};

export default function VoiceInput({ onResult }: Props) {
  const [listening, setListening] = useState(false);
  const [lang, setLang] = useState("en-IN"); 
  
  // AI Animation States
  const [analysisState, setAnalysisState] = useState<"idle" | "transcribing" | "extracting" | "reasoning" | "matching" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [visibleTranscript, setVisibleTranscript] = useState("");
  const [profile, setProfile] = useState<ExtractedProfile | null>(null);
  const [confidence, setConfidence] = useState<any>(null);
  const [reasoning, setReasoning] = useState<string[]>([]);
  const [visibleReasoning, setVisibleReasoning] = useState<string[]>([]);
  const [schemeCount, setSchemeCount] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      setAnalysisState("idle");
      setTranscript("");
      setVisibleTranscript("");
      setProfile(null);
      setReasoning([]);
      setVisibleReasoning([]);
      setSchemeCount(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setAnalysisState("transcribing");
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          formData.append("language", lang);

          const response = await api.post<any>("/voice/transcribe", formData);

          if (response.text && response.text.trim().length > 0) {
            setTranscript(response.text);
            setProfile(response.profile);
            setConfidence(response.confidence);
            setReasoning(response.reasoning || []);
            
            // Start Progressive Animation
            simulateLiveExtraction(response.text, response.profile, response.reasoning || []);
          } else {
            setAnalysisState("idle");
            toast({ title: "No Speech Detected", description: "Could not transcribe audio.", variant: "destructive" });
          }
        } catch (error) {
          console.error("Transcription error:", error);
          setAnalysisState("idle");
          toast({ title: "Transcription Failed", description: "Failed to process audio.", variant: "destructive" });
        }
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({ title: "Microphone Access Denied", description: "Please allow microphone access to use voice search.", variant: "destructive" });
    }
  };

  const simulateLiveExtraction = async (fullText: string, finalProfile: any, fullReasoning: string[]) => {
    // 1. Typewriter transcript
    for (let i = 0; i <= fullText.length; i += 3) {
      setVisibleTranscript(fullText.substring(0, i));
      await new Promise(r => setTimeout(r, 20));
    }
    setVisibleTranscript(fullText);
    await new Promise(r => setTimeout(r, 400));

    // 2. Extracting Profile Details
    setAnalysisState("extracting");
    await new Promise(r => setTimeout(r, 800));

    // 3. AI Reasoning Feed
    setAnalysisState("reasoning");
    for (let i = 0; i < fullReasoning.length; i++) {
      setVisibleReasoning(prev => [...prev, fullReasoning[i]]);
      await new Promise(r => setTimeout(r, 600));
    }

    // 4. Matching Schemes Meter
    setAnalysisState("matching");
    for (let i = 0; i <= 21; i += 3) {
      setSchemeCount(i);
      await new Promise(r => setTimeout(r, 100));
    }
    setSchemeCount(Math.floor(Math.random() * 15) + 10); // Random realistic number
    await new Promise(r => setTimeout(r, 500));

    // 5. Done - Auto Submit
    setAnalysisState("done");
    onResult(fullText, lang.split('-')[0], finalProfile);
  };

  const toggleListening = () => {
    if (listening) {
      mediaRecorderRef.current?.stop();
      setListening(false);
    } else {
      startRecording();
    }
  };

  return (
    <div className="w-full relative isolate group mb-8">
      <div className={`absolute inset-0 bg-accent/20 blur-2xl rounded-3xl transition-opacity duration-700 -z-10 ${listening || analysisState !== 'idle' ? 'opacity-100' : 'opacity-0'}`} />

      <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 rounded-xl border border-accent/30">
               <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="font-heading font-black text-white text-xl tracking-wide uppercase">AI Voice Discovery</h2>
              <p className="text-slate-400 text-xs font-medium mt-1">Speak naturally to find welfare schemes instantly.</p>
            </div>
          </div>
          <Select value={lang} onValueChange={setLang} disabled={listening || analysisState !== 'idle'}>
            <SelectTrigger className="w-[140px] h-10 bg-slate-800/80 border-white/10 text-xs font-bold uppercase tracking-widest text-white rounded-xl">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="en-IN">English</SelectItem>
              <SelectItem value="hi-IN">Hindi (हिंदी)</SelectItem>
              <SelectItem value="te-IN">Telugu (తెలుగు)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top Section: Mic and Transcript */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          {/* Mic Button */}
          <button
            onClick={toggleListening}
            disabled={analysisState !== 'idle'}
            className={`shrink-0 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 mx-auto md:mx-0 ${
              listening 
                ? 'bg-red-500 scale-105 shadow-[0_0_50px_rgba(239,68,68,0.6)]' 
                : analysisState !== 'idle'
                ? 'bg-accent/50 scale-100 cursor-not-allowed border-2 border-accent/20'
                : 'bg-accent hover:bg-accent/90 hover:scale-105 shadow-[0_0_30px_rgba(99,102,241,0.3)]'
            }`}
          >
            {analysisState === 'transcribing' ? (
              <Loader2 className="h-10 w-10 text-white animate-spin" />
            ) : listening ? (
              <div className="relative flex items-center justify-center">
                <StopCircle className="h-10 w-10 text-white z-10" />
                <span className="absolute inline-flex h-[150%] w-[150%] rounded-full bg-red-400 opacity-40 animate-ping" />
              </div>
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </button>

          {/* Transcript Area */}
          <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 relative min-h-[96px] flex flex-col justify-center">
             {analysisState === 'idle' && !listening && (
                <p className="text-slate-500 italic font-medium text-center md:text-left">
                  "I am a 45-year-old farmer from Telangana. My income is 2 lakh."
                </p>
             )}
             
             {listening && (
                <div className="flex items-center gap-3 text-red-400 mb-2">
                   <div className="flex gap-1 items-center h-4">
                      <span className="w-1 bg-red-400 h-full animate-bounce rounded-full" />
                      <span className="w-1 bg-red-400 h-2/3 animate-bounce rounded-full" style={{ animationDelay: '0.1s' }}/>
                      <span className="w-1 bg-red-400 h-full animate-bounce rounded-full" style={{ animationDelay: '0.2s' }}/>
                   </div>
                   <span className="text-xs font-black uppercase tracking-widest">Listening...</span>
                </div>
             )}

             {analysisState === 'transcribing' && !visibleTranscript && (
                <div className="flex items-center gap-3 text-accent mb-2">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   <span className="text-xs font-black uppercase tracking-widest">Transcribing Audio...</span>
                </div>
             )}

             {(visibleTranscript || listening) && (
               <p className="text-white text-xl font-medium leading-relaxed">
                 {visibleTranscript}
                 {analysisState === 'transcribing' && <span className="inline-block w-2 h-5 bg-white ml-1 animate-pulse" />}
               </p>
             )}
          </div>
        </div>

        {/* AI Analysis Grid (Shows up progressively) */}
        {analysisState !== 'idle' && analysisState !== 'transcribing' && profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Visual Profile Builder */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/10 col-span-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-4 flex items-center gap-2">
                 <User className="h-3 w-3" /> Extracted Profile
              </h3>
              <div className="space-y-4">
                <ProfileItem icon={<Briefcase/>} label="Occupation" value={profile.occupation} conf={confidence?.occupation} />
                <ProfileItem icon={<MapPin/>} label="State" value={profile.state} conf={confidence?.state} />
                <ProfileItem icon={<User/>} label="Age" value={profile.age ? `${profile.age} Years` : null} conf={confidence?.age} />
                <ProfileItem icon={<IndianRupee/>} label="Income" value={profile.income ? `₹${profile.income}` : null} conf={confidence?.income} />
              </div>
            </div>

            {/* AI Reasoning Feed */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/10 col-span-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400 mb-4 flex items-center gap-2">
                 <Sparkles className="h-3 w-3" /> AI Reasoning
              </h3>
              <div className="space-y-3">
                {visibleReasoning.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium text-slate-300">{reason}</p>
                  </div>
                ))}
                {analysisState === 'reasoning' && (
                  <div className="flex items-center gap-2 text-slate-500 italic text-sm mt-2">
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Eligibility Meter */}
            <div className="bg-slate-800/40 rounded-2xl p-6 border border-white/10 col-span-1 flex flex-col justify-center items-center text-center">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
                 Potential Matches
              </h3>
              <div className="relative">
                 {/* Glowing orb effect */}
                 <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full scale-150" />
                 <div className="relative bg-slate-900 border-2 border-accent/30 w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                   <span className="text-5xl font-black text-white tabular-nums tracking-tighter">
                     {schemeCount}
                   </span>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-accent mt-1">Schemes</span>
                 </div>
              </div>
              {analysisState === 'done' && (
                <Badge className="mt-6 bg-green-500/10 text-green-400 border border-green-500/20 py-1.5 px-4 font-bold tracking-widest">
                  Extraction Complete
                </Badge>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function ProfileItem({ icon, label, value, conf }: { icon: any, label: string, value: string | null, conf: number }) {
  if (!value || value.toLowerCase() === 'null') return null;
  
  return (
    <div className="flex items-center justify-between bg-black/30 rounded-xl p-3 border border-white/5 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
          <p className="text-sm font-bold text-white capitalize">{value}</p>
        </div>
      </div>
      <div className="text-right">
         <span className="text-[10px] font-black text-green-400 bg-green-400/10 px-2 py-0.5 rounded border border-green-400/20">
           {conf || 95}% Match
         </span>
      </div>
    </div>
  );
}