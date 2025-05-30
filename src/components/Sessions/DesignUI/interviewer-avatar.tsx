"use client"

import { useState, useEffect } from "react"
import { User, Mic } from "lucide-react"

export function InterviewerAvatar() {
  const [speaking, setSpeaking] = useState(false)

  // Simulate interviewer speaking periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeaking((prev) => !prev)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-slate-800 to-slate-900">
      <div className={`relative transition-all duration-300 ${speaking ? "scale-105" : "scale-100"}`}>
        <div className="w-40 h-40 rounded-full bg-slate-700 flex items-center justify-center">
          <User className="w-24 h-24 text-slate-300" />
        </div>
        {speaking && (
          <div className="absolute -bottom-3 left-1/2 transform -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full bg-green-500 text-white text-xs">
            <Mic className="w-3 h-3 animate-pulse" />
            Speaking...
          </div>
        )}
      </div>
      <h3 className="mt-6 text-2xl font-medium text-white">AI Interviewer</h3>
      <p className="text-slate-400">Technical Interview Coach</p>

      <div className="mt-8 max-w-md text-center">
        <p className="text-white text-lg italic">
          {speaking
            ? "I'm interested in hearing about your experience with this technology..."
            : "Listening to your response..."}
        </p>
      </div>
    </div>
  )
}
