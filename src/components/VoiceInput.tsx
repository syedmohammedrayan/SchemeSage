import React, { useState, useRef, useEffect } from "react";
import { Mic, Loader2, StopCircle, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VoiceInputProps {
  onResult: (text: string, language: string) => void;
}

export default function VoiceInput({ onResult }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("hi-IN"); // Defaulting to Hindi as per request
  const transcriptRef = useRef("");

  useEffect(() => {
    // Stop listening and clear transcript if language changes
    if (isListening) {
      setIsListening(false);
    }
    setTranscript("");
    transcriptRef.current = "";
  }, [language]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      if (transcriptRef.current.trim().length > 0) {
        onResult(transcriptRef.current.trim(), language.split('-')[0]);
      }
      return;
    }

    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      transcriptRef.current = "";
    };

    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
      transcriptRef.current = current;
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error", e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcriptRef.current.trim().length > 0) {
        onResult(transcriptRef.current.trim(), language.split('-')[0]);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-4 mb-12">
      <div className="bg-[#0F172A]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[150px] bg-[#F97316]/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">🎤 Tell us about yourself</h2>
            <p className="text-[#94A3B8] font-medium">Speak naturally in your preferred language to find matching schemes.</p>
          </div>

          <div className="mb-10 z-20">
            <Select value={language} onValueChange={setLanguage} disabled={isListening}>
              <SelectTrigger className="w-[200px] h-12 bg-[#020617] border-white/10 text-white rounded-xl focus:ring-[#F97316]/50">
                <SelectValue placeholder="Choose Language" />
              </SelectTrigger>
              <SelectContent className="bg-[#020617] border-white/10 text-white rounded-xl max-h-[300px]">
                <SelectItem value="en-IN">English</SelectItem>
                <SelectItem value="hi-IN">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="te-IN">తెలుగు (Telugu)</SelectItem>
                <SelectItem value="ta-IN">தமிழ் (Tamil)</SelectItem>
                <SelectItem value="kn-IN">ಕನ್ನಡ (Kannada)</SelectItem>
                <SelectItem value="ml-IN">മലയാളം (Malayalam)</SelectItem>
                <SelectItem value="mr-IN">मराठी (Marathi)</SelectItem>
                <SelectItem value="gu-IN">ગુજરાતી (Gujarati)</SelectItem>
                <SelectItem value="pa-IN">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                <SelectItem value="bn-IN">বাংলা (Bengali)</SelectItem>
                <SelectItem value="or-IN">ଓଡ଼ିଆ (Odia)</SelectItem>
                <SelectItem value="ur-IN">اردو (Urdu)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={toggleListening}
            className={`group relative flex items-center justify-center h-32 w-32 rounded-full transition-all duration-300 shadow-2xl ${
              isListening 
                ? "bg-red-500 hover:bg-red-600 shadow-red-500/30 scale-105 animate-pulse" 
                : "bg-[#F97316] hover:bg-[#EA580C] shadow-[#F97316]/30 hover:scale-105"
            }`}
          >
            {isListening ? (
              <StopCircle className="w-12 h-12 text-white" />
            ) : (
              <Mic className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
            )}
            {/* Ripple rings */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full border-[4px] border-red-500/50 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
                <span className="absolute inset-0 rounded-full border-[2px] border-red-500/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></span>
              </>
            )}
          </button>

          <div className="mt-8 text-center min-h-[60px] flex flex-col items-center justify-center">
            {isListening ? (
              <div className="bg-[#020617] px-6 py-3 rounded-2xl border border-white/5 max-w-md w-full">
                <p className="text-[#F97316] font-bold animate-pulse uppercase tracking-widest text-[10px] mb-2">Listening...</p>
                <p className="text-white font-medium italic min-h-[24px]">
                  {transcript || "Speak now..."}
                </p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/5 px-6 py-4 rounded-2xl max-w-md flex items-start gap-3">
                <Info className="h-5 w-5 text-[#94A3B8] shrink-0 mt-0.5" />
                <div className="text-left text-sm text-[#94A3B8]">
                  <p className="font-bold text-white mb-1">Examples of what to say:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>"I am a 22 year old student from Assam"</li>
                    <li>"मैं मध्य प्रदेश का किसान हूँ"</li>
                    <li>"ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ವ್ಯಾಪಾರ ಮಾಡುತ್ತಿದ್ದೇನೆ"</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}