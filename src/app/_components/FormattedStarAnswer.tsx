import React from 'react';

interface FormattedStarAnswerProps {
  text: string;
}

/**
 * A component that takes a raw answer string and formats the inline S.T.A.R.
 * markers with unique colors and bold text to make them stand out.
 */
export default function FormattedStarAnswer({ text }: FormattedStarAnswerProps) {
  // This regex splits the string by the (Marker) patterns, but keeps the markers in the resulting array.
  const parts = text.split(/(\((?:Situation|Task|Action|Result)\))/g);

  const getMarkerClass = (marker: string) => {
    switch (marker) {
      case '(Situation)':
        return 'font-bold text-blue-600 dark:text-blue-400';
      case '(Task)':
        return 'font-bold text-purple-600 dark:text-purple-400';
      case '(Action)':
        return 'font-bold text-green-600 dark:text-green-400';
      case '(Result)':
        return 'font-bold text-orange-600 dark:text-orange-400';
      default:
        return '';
    }
  };
  
  // If parsing fails for any reason, just render the original text to avoid crashing.
  if (parts.length <= 1) {
    return <p>{text}</p>;
  }

  return (
    <p>
      {parts.map((part, index) => {
        const markerClass = getMarkerClass(part);
        if (markerClass) {
          return (
            <span key={index} className={markerClass}>
              {' '}{part}{' '}
            </span>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </p>
  );
} 