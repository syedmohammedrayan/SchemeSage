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
    <div className="w-full max-w-2xl mx-auto mt-8 mb-16 relative">
      <div className="bg-[#0F172A] border border-slate-800 p-8 md:p-12 rounded-3xl shadow-xl">
        
        <div className="relative z-10 flex flex-col items-center">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-100 mb-3 tracking-tight">
              Voice Assistant
            </h2>
            <p className="text-slate-400 font-medium text-base">Speak naturally in your preferred language to check eligibility.</p>
          </div>

          <div className="mb-12 w-full max-w-[240px]">
            <Select value={language} onValueChange={setLanguage} disabled={isListening}>
              <SelectTrigger className="w-full h-12 bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-200 rounded-xl focus:ring-1 focus:ring-slate-500 transition-colors">
                <div className="flex items-center gap-2 px-1">
                  <SelectValue placeholder="Choose Language" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-200 rounded-xl shadow-xl">
                <SelectItem value="en-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">English</SelectItem>
                <SelectItem value="hi-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">हिन्दी (Hindi)</SelectItem>
                <SelectItem value="te-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">తెలుగు (Telugu)</SelectItem>
                <SelectItem value="ta-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">தமிழ் (Tamil)</SelectItem>
                <SelectItem value="kn-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">ಕನ್ನಡ (Kannada)</SelectItem>
                <SelectItem value="ml-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">മലയാളം (Malayalam)</SelectItem>
                <SelectItem value="mr-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">मराठी (Marathi)</SelectItem>
                <SelectItem value="gu-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">ગુજરાતી (Gujarati)</SelectItem>
                <SelectItem value="pa-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">ਪੰਜਾਬੀ (Punjabi)</SelectItem>
                <SelectItem value="bn-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">বাংলা (Bengali)</SelectItem>
                <SelectItem value="or-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">ଓଡ଼ିଆ (Odia)</SelectItem>
                <SelectItem value="ur-IN" className="focus:bg-slate-800 focus:text-slate-100 rounded-lg cursor-pointer">اردو (Urdu)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            {isListening && (
              <div className="absolute -inset-2 rounded-full border border-red-500/20 animate-ping" />
            )}
            
            <button
              onClick={toggleListening}
              className={`flex items-center justify-center h-28 w-28 rounded-full transition-colors duration-200 shadow-md ${
                isListening 
                  ? "bg-red-500 hover:bg-red-600" 
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isListening ? (
                <StopCircle className="w-10 h-10 text-white" />
              ) : (
                <Mic className="w-10 h-10 text-white" />
              )}
            </button>
          </div>

          <div className="mt-12 text-center min-h-[80px] w-full flex flex-col items-center justify-center">
            {isListening ? (
              <div className="w-full flex flex-col items-center">
                <span className="flex items-center gap-2 text-red-500 font-semibold uppercase tracking-wider text-xs mb-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Recording
                </span>
                <p className="text-slate-200 text-lg font-medium min-h-[32px] max-w-lg px-4">
                  {transcript || "Listening..."}
                </p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 px-6 py-5 rounded-xl max-w-md w-full flex items-start gap-4">
                <div className="mt-0.5">
                  <Info className="h-5 w-5 text-slate-400" />
                </div>
                <div className="text-left text-sm text-slate-400">
                  <p className="font-semibold text-slate-300 mb-2">Examples of what to say:</p>
                  <ul className="space-y-2 list-none">
                    <li className="flex items-start gap-2 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" /> "I am a 22 year old student from Assam"</li>
                    <li className="flex items-start gap-2 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" /> "मैं मध्य प्रदेश का किसान हूँ"</li>
                    <li className="flex items-start gap-2 text-slate-400"><span className="w-1.5 h-1.5 rounded-full bg-slate-600 mt-1.5 shrink-0" /> "ನಾನು ಬೆಂಗಳೂರಿನಲ್ಲಿ ವ್ಯಾಪಾರ ಮಾಡುತ್ತಿದ್ದೇನೆ"</li>
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