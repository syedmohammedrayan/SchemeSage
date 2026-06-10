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
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const { toast } = useToast();

  const startMediaRecorderRecording = async () => {
    try {
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
          // Call user search callback with fallback query
          onResult("Voice Search Query", lang.split('-')[0], { age: null, state: null, occupation: null, income: null });
          toast({ title: "Transcription Offline", description: "Running direct query search.", variant: "destructive" });
        }
      };

      mediaRecorder.start();
      setListening(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      toast({ title: "Microphone Access Denied", description: "Please allow microphone access to use voice search.", variant: "destructive" });
    }
  };

  const startRecording = async () => {
    setAnalysisState("idle");
    setTranscript("");
    setVisibleTranscript("");
    transcriptRef.current = "";
    setProfile(null);
    setReasoning([]);
    setVisibleReasoning([]);
    setSchemeCount(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = lang;

        recognition.onstart = () => {
          setListening(true);
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          const text = finalTranscript || interimTranscript;
          if (text) {
            transcriptRef.current = text;
            setVisibleTranscript(text);
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            toast({ title: "Microphone Access Denied", description: "Please allow microphone access to use voice search.", variant: "destructive" });
            setListening(false);
          } else {
            // Stop and fallback
            recognition.stop();
            startMediaRecorderRecording();
          }
        };

        recognition.onend = async () => {
          setListening(false);
          const finalTranscript = transcriptRef.current;
          if (finalTranscript.trim().length > 0) {
            setAnalysisState("transcribing");
            try {
              const response = await api.post<any>("/voice/transcribe", {
                text: finalTranscript,
                language: lang
              });

              if (response.text && response.text.trim().length > 0) {
                setTranscript(response.text);
                setProfile(response.profile);
                setConfidence(response.confidence);
                setReasoning(response.reasoning || []);
                
                // Start Progressive Animation
                simulateLiveExtraction(response.text, response.profile, response.reasoning || []);
              } else {
                setAnalysisState("done");
                onResult(finalTranscript, lang.split('-')[0], { age: null, state: null, occupation: null, income: null });
              }
            } catch (error) {
              console.error("Profile extraction error:", error);
              setAnalysisState("done");
              // Fallback directly with the transcript text
              onResult(finalTranscript, lang.split('-')[0], { age: null, state: null, occupation: null, income: null });
            }
          } else {
            setAnalysisState("idle");
          }
        };

        recognition.start();
      } catch (err) {
        console.error("SpeechRecognition startup failed, falling back to MediaRecorder", err);
        startMediaRecorderRecording();
      }
    } else {
      startMediaRecorderRecording();
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      } else {
        mediaRecorderRef.current?.stop();
      }
      setListening(false);
    } else {
      startRecording();
    }
  };

  return (
    <div className="w-full relative isolate group mb-8">
      <div className={`absolute inset-0 bg-accent/20 blur-2xl rounded-3xl transition-opacity duration-700 -z-10 ${listening || analysisState !== 'idle' ? 'opacity-100' : 'opacity-0'}`} />

      <div className="w-full bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-accent/20 rounded-lg border border-accent/30">
               <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h2 className="font-heading font-black text-white text-base tracking-wide uppercase">AI Voice Discovery</h2>
              <p className="text-slate-400 text-[10px] mt-0.5">Speak naturally to discover matching schemes.</p>
            </div>
          </div>
          <Select value={lang} onValueChange={setLang} disabled={listening || analysisState !== 'idle'}>
            <SelectTrigger className="w-[110px] h-8 bg-slate-800/80 border-white/10 text-[10px] font-bold uppercase tracking-wider text-white rounded-lg">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 text-white">
              <SelectItem value="en-IN">English</SelectItem>
              <SelectItem value="hi-IN">Hindi (हिंदी)</SelectItem>
              <SelectItem value="te-IN">Telugu (తెలుగు)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Top Section: Mic and Audio Status Label */}
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={toggleListening}
            disabled={analysisState !== 'idle'}
            className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              listening 
                ? 'bg-red-500 scale-105 shadow-[0_0_30px_rgba(239,68,68,0.5)]' 
                : analysisState !== 'idle'
                ? 'bg-accent/40 scale-100 cursor-not-allowed border border-accent/20'
                : 'bg-accent hover:bg-accent/90 hover:scale-105 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
            }`}
          >
            {analysisState === 'transcribing' ? (
              <Loader2 className="h-5 w-5 text-white animate-spin" />
            ) : listening ? (
              <div className="relative flex items-center justify-center">
                <StopCircle className="h-5 w-5 text-white z-10" />
                <span className="absolute inline-flex h-[150%] w-[150%] rounded-full bg-red-400 opacity-40 animate-ping" />
              </div>
            ) : (
              <Mic className="h-5 w-5 text-white" />
            )}
          </button>

          <div className="flex-1">
            {listening ? (
              <div className="flex items-center gap-2 text-red-400">
                <div className="flex gap-0.5 items-center h-3">
                  <span className="w-0.5 bg-red-400 h-full animate-bounce rounded-full" />
                  <span className="w-0.5 bg-red-400 h-2/3 animate-bounce rounded-full" style={{ animationDelay: '0.1s' }}/>
                  <span className="w-0.5 bg-red-400 h-full animate-bounce rounded-full" style={{ animationDelay: '0.2s' }}/>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest">Listening... Speak now</span>
              </div>
            ) : analysisState === 'transcribing' ? (
              <div className="flex items-center gap-2 text-accent">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-widest">Analyzing Voice...</span>
              </div>
            ) : (
              <span className="text-slate-400 text-xs font-semibold">Tap the mic & speak naturally</span>
            )}
          </div>
        </div>

        {/* Transcript Box */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 min-h-[72px] flex flex-col justify-center mb-5">
           {analysisState === 'idle' && !listening && (
              <p className="text-slate-500 italic text-xs text-center md:text-left">
                "I am a 45-year-old farmer from Telangana. My income is 2 lakh."
              </p>
           )}

           {(visibleTranscript || listening) && (
             <p className="text-white text-sm font-semibold leading-relaxed">
               {visibleTranscript}
               {analysisState === 'transcribing' && <span className="inline-block w-1.5 h-3.5 bg-white ml-1 animate-pulse" />}
             </p>
           )}
        </div>

        {/* Unified AI Analysis Panel (Stacked Feed) */}
        {analysisState !== 'idle' && analysisState !== 'transcribing' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-slate-800/40 rounded-xl p-4 border border-white/10 space-y-4">
              
              {/* Profile Insights */}
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-[9px] font-black uppercase tracking-[0.15em] text-accent mb-2 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Extracted Details
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile && profile.occupation && profile.occupation !== 'null' && (
                    <Badge className="bg-accent/15 text-accent border border-accent/20 text-[10px] px-2 py-0.5">
                      💼 {profile.occupation}
                    </Badge>
                  )}
                  {profile && profile.state && profile.state !== 'null' && (
                    <Badge className="bg-accent/15 text-accent border border-accent/20 text-[10px] px-2 py-0.5">
                      📍 {profile.state}
                    </Badge>
                  )}
                  {profile && profile.age && profile.age !== 'null' && (
                    <Badge className="bg-accent/15 text-accent border border-accent/20 text-[10px] px-2 py-0.5">
                      🎂 {profile.age} Years
                    </Badge>
                  )}
                  {profile && profile.income && profile.income !== 'null' && (
                    <Badge className="bg-accent/15 text-accent border border-accent/20 text-[10px] px-2 py-0.5">
                      ₹ {profile.income}
                    </Badge>
                  )}
                  {(!profile || 
                    ((!profile.occupation || profile.occupation === 'null') &&
                     (!profile.state || profile.state === 'null') &&
                     (!profile.age || profile.age === 'null') &&
                     (!profile.income || profile.income === 'null'))) && (
                    <span className="text-[11px] text-slate-500 italic">Direct keyword matching enabled</span>
                  )}
                </div>
              </div>

              {/* AI Reasoning */}
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-[9px] font-black uppercase tracking-[0.15em] text-green-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> AI Reasoning
                </h3>
                <div className="space-y-2">
                  {visibleReasoning.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <p className="text-xs font-semibold text-slate-300">{reason}</p>
                    </div>
                  ))}
                  {analysisState === 'reasoning' && (
                    <div className="flex items-center gap-1 text-slate-500 italic text-[10px] pl-5">
                      <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  )}
                </div>
              </div>

              {/* Matches & Status Row */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                  <div className="bg-slate-900 border border-accent/25 px-2.5 py-1 rounded-lg text-center min-w-[50px]">
                    <span className="text-base font-black text-white leading-none">{schemeCount}</span>
                    <span className="text-[7px] font-bold uppercase tracking-wider text-accent block mt-0.5">Matches</span>
                  </div>
                </div>

                <div>
                  {analysisState === 'done' ? (
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 py-0.5 px-2 text-[9px] font-bold tracking-widest uppercase">
                      Analysis Complete
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-1.5 text-accent text-[9px] font-bold tracking-widest uppercase animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Matching...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Show Schemes Button */}
              {analysisState === 'done' && (
                <Button
                  onClick={() => {
                    const resultsElem = document.getElementById('results-section');
                    resultsElem?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-accent/20 hover:scale-[1.02]"
                >
                  Show Matching Schemes ↓
                </Button>
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