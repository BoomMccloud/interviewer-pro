export function QuestionDisplay({ question }: { question: string }) {
    return (
      <div className="mb-2">
        <h3 className="text-sm font-medium text-slate-400 dark:text-slate-300 mb-1">Current Question:</h3>
        <p className="text-white dark:text-gray-100 text-lg">{question}</p>
      </div>
    )
  }
  