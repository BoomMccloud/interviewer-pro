export function InterviewTimer({ seconds }: { seconds: number }) {
    // Format seconds into MM:SS
    const formatTime = (totalSeconds: number) => {
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
    }
  
    return <div className="bg-slate-700 px-4 py-2 rounded-md text-white font-mono text-xl">{formatTime(seconds)}</div>
  }
  