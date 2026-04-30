import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full bg-white dark:bg-[#0d1117] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.08)] dark:shadow-2xl border border-gray-200 dark:border-[#30363d] p-6 transition-all duration-300 ${className}`}>
      {children}
    </div>
  );
};
