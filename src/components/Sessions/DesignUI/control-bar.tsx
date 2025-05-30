"use client"

import { Button } from "@/components/ui/button"
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
    <div className="bg-slate-900 border-t border-slate-800 p-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMic}
            className={isMicOn ? "bg-slate-700" : "bg-red-500 hover:bg-red-600"}
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onPrevious} disabled={isFirstQuestion} className="bg-slate-700">
            <ChevronLeft className="h-5 w-5 mr-1" />
            Previous
          </Button>
          <Button variant="outline" onClick={onNext} disabled={isLastQuestion} className="bg-slate-700">
            Next
            <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
        </div>

        <Button variant="destructive" onClick={onEnd} className="bg-red-500 hover:bg-red-600">
          <PhoneOff className="h-5 w-5 mr-2" />
          End Interview
        </Button>
      </div>
    </div>
  )
}
