import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  // Add any custom props here if needed, e.g., variant, size
}

const Button: React.FC<ButtonProps> = ({ children, className, ...props }) => {
  return (
    <button
      className={`button ${className ?? ''}`} // Uses .button from globals.css and allows overriding/extending
      {...props}
    >
      {children}
    </button>
  );
};

export default Button; 