export function KeyPointsDisplay({ keyPoints }: { keyPoints: string[] }) {
    return (
      <div>
        <h3 className="text-sm font-medium text-slate-400 mb-1">Key Points to Address:</h3>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {keyPoints.map((point, index) => (
            <li key={index} className="bg-slate-700/50 px-3 py-1 rounded text-sm text-white">
              • {point}
            </li>
          ))}
        </ul>
      </div>
    )
  }
  