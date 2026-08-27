"use client";

import { useState, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";

export default function DictationButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, onTranscript]);

  if (!supported) {
    return <p className="text-xs text-gray-600">Dictation isn't supported in this browser — try Chrome.</p>;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${
        listening
          ? "bg-red-500/15 text-red-400 border-red-500/30"
          : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-gray-200"
      }`}
    >
      {listening ? <MicOff size={13} /> : <Mic size={13} />}
      {listening ? "Stop dictating" : "Dictate"}
    </button>
  );
}
