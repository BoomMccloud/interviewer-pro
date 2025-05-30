"use client"

import { useState, useEffect } from "react"
// import { InterviewerAvatar } from "~/components/interviewer-avatar"
import { ControlBar } from "./control-bar"
// import { InterviewTimer } from "~/components/interview-timer"
// import { QuestionDisplay } from "~/components/question-display"
// import { KeyPointsDisplay } from "~/components/key-points-display"
import { Button } from "~/components/UI/Button"
// import { interviewQuestions } from "~/data/interview-questions"

// Mock data for now
const mockInterviewQuestions = [
  {
    question: "Tell me about yourself and your experience.",
    keyPoints: ["Professional background", "Relevant skills", "Career goals"]
  }
];

export default function InterviewRoom() {
  const [isStarted, setIsStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const currentQuestion = mockInterviewQuestions[currentQuestionIndex]

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isTimerRunning])

  const startInterview = () => {
    setIsStarted(true)
    setIsTimerRunning(true)
  }

  const nextQuestion = () => {
    if (currentQuestionIndex < mockInterviewQuestions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const endInterview = () => {
    setIsStarted(false)
    setIsTimerRunning(false)
    setCurrentQuestionIndex(0)
    setElapsedTime(0)
  }

  if (!isStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
        <h1 className="text-4xl font-bold text-center">AI Interview Coach</h1>
        <p className="text-xl text-center max-w-2xl">
          Practice your interview skills with our AI interviewer. We&apos;ll provide feedback and suggestions to help you
          improve.
        </p>
        <Button size="lg" onClick={startInterview} className="mt-8">
          Start Interview
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      <div className="flex-1 p-4 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="relative bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden flex-1 flex items-center justify-center">
            {/* <InterviewerAvatar /> */}
            <div className="text-gray-900 dark:text-white">Interviewer Avatar Placeholder</div>
            <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-md text-white text-sm">
              AI Interviewer
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* <InterviewTimer seconds={elapsedTime} /> */}
            <div className="text-gray-900 dark:text-white">Timer: {elapsedTime}s</div>
            <div className="flex-1">
              {/* <QuestionDisplay question={currentQuestion.question} /> */}
              <div className="text-gray-900 dark:text-white">{currentQuestion?.question ?? 'No question available'}</div>
              {/* <KeyPointsDisplay keyPoints={currentQuestion.keyPoints} /> */}
              <div className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                {currentQuestion?.keyPoints?.join(', ') ?? 'No key points'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ControlBar
        onPrevious={previousQuestion}
        onNext={nextQuestion}
        onEnd={endInterview}
        isFirstQuestion={currentQuestionIndex === 0}
        isLastQuestion={currentQuestionIndex === mockInterviewQuestions.length - 1}
      />
    </div>
  )
}
