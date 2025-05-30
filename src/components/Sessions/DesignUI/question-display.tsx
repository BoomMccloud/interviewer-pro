export function QuestionDisplay({ question }: { question: string }) {
    return (
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-400 mb-1">Current Question:</h3>
        <p className="text-white text-lg">{question}</p>
      </div>
    )
  }
  