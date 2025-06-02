'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface ThemeContextType {
  theme: string;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  // Set mounted to true after hydration to prevent mismatch
  useEffect(() => {
    setMounted(true);
    
    // Check for saved theme in localStorage or system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
      console.log('Found saved theme:', savedTheme);
      setTheme(savedTheme);
    } else if (prefersDark) {
      console.log('System prefers dark mode');
      setTheme('dark');
    } else {
      console.log('Using default light theme');
    }
  }, []);

  useEffect(() => {
    if (!mounted) return; // Don't run before hydration
    
    console.log('Applying theme:', theme);
    
    // Apply .dark class to document element for Tailwind
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      console.log('Added dark class to html element');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Removed dark class from html element');
    }
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('Toggling theme from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => { /* noop until mounted */ } }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme toggle button with floating design
export const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-6 right-6 z-40 group">
      <button 
        onClick={toggleTheme}
        className="w-12 h-12 rounded-full bg-slate-800/80 dark:bg-white/80 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-800 border border-slate-600/50 dark:border-slate-300/50 hover:border-slate-600 dark:hover:border-slate-300 cursor-pointer transition-all duration-200 backdrop-blur-sm shadow-lg hover:shadow-xl flex items-center justify-center group-hover:scale-105"
        title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      
      {/* Tooltip on hover */}
      <div className="absolute right-0 top-full mt-2 px-3 py-1 bg-slate-800 dark:bg-white text-white dark:text-slate-800 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg">
        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
      </div>
    </div>
  );
}; 