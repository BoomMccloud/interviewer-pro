"use client"

import { Mic, MicOff, PhoneOff, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface ControlBarProps {
  onPrevious: () => void
  onNext: () => void
  onEnd: () => void
  isFirstQuestion: boolean
  isLastQuestion: boolean
}

export function ControlBar({ onPrevious, onNext, onEnd, isFirstQuestion, isLastQuestion }: ControlBarProps) {
  const [isMicOn, setIsMicOn] = useState(true)

  const toggleMic = () => setIsMicOn(!isMicOn)

  return (
    <div className="h-16 bg-gray-100 dark:bg-slate-900 border border-gray-300 dark:border-gray-600 rounded-lg mx-0 my-4 py-2 px-6">
      <div className="h-full flex items-center justify-between">
        {/* Left - Microphone */}
        <div className="flex items-center">
          <button
            onClick={toggleMic}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white border-none cursor-pointer transition-colors ${
              isMicOn 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Center - Navigation */}
        <div className="flex items-center gap-2">
          <button 
            onClick={onPrevious} 
            disabled={isFirstQuestion}
            className={`h-10 px-8 rounded-lg flex items-center gap-2 border-none transition-colors ${
              isFirstQuestion 
                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed' 
                : 'bg-gray-300 dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-400 dark:hover:bg-slate-600'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>
          <button 
            onClick={onNext} 
            disabled={isLastQuestion}
            className={`h-10 px-8 rounded-lg flex items-center gap-2 border-none transition-colors ${
              isLastQuestion 
                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed' 
                : 'bg-gray-300 dark:bg-slate-700 text-gray-900 dark:text-white cursor-pointer hover:bg-gray-400 dark:hover:bg-slate-600'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right - End Interview */}
        <div className="flex items-center">
          <button 
            onClick={onEnd}
            className="h-10 px-12 rounded-lg flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white border-none cursor-pointer transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
          </button>
        </div>
      </div>
    </div>
  )
}
