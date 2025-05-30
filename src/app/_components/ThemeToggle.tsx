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

// Theme toggle button with pure Tailwind classes
export const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      <button 
        onClick={toggleTheme}
        className="block px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white border border-slate-600 dark:border-slate-500 cursor-pointer text-sm transition-colors"
      >
        Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode (Current: {theme})
      </button>
      
      {/* Test div to verify dark mode classes work */}
      <div className="px-2 py-1 text-xs bg-white dark:bg-black text-black dark:text-white border border-gray-300 dark:border-gray-600 rounded">
        Test: {theme} mode
      </div>
    </div>
  );
}; 