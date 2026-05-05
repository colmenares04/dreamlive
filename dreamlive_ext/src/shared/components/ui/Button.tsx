import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon, 
  className = '', 
  disabled, 
  ...props 
}) => {
  const baseStyles = "w-full rounded-full py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-[#175DDC] hover:bg-blue-700 text-white dark:bg-[#238636] dark:hover:bg-[#2ea043]",
    outline: "bg-white dark:bg-transparent border border-[#175DDC] dark:border-[#30363d] text-[#175DDC] dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-[#161b22] dark:hover:text-white",
    ghost: "bg-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {!isLoading && children}
    </button>
  );
};
