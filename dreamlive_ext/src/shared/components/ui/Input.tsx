import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  const hasError = !!error;
  
  return (
    <div className="space-y-1">
      <div className={`relative rounded-md border ${hasError ? 'border-red-500' : 'border-gray-300 dark:border-[#30363d]'} px-3 py-2 shadow-sm focus-within:border-${hasError ? 'red-500' : '[#175DDC]'} dark:focus-within:border-${hasError ? 'red-500' : '[#238636]'} focus-within:ring-1 focus-within:ring-${hasError ? 'red-500' : '[#175DDC]'} dark:focus-within:ring-${hasError ? 'red-500' : '[#238636]'} transition-all bg-white dark:bg-[#161b22] ${className}`}>
        <label className={`absolute -top-2 left-2 -mt-px inline-block bg-white dark:bg-[#0d1117] px-1 text-[11px] ${hasError ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {label}
        </label>
        <input
          className="block w-full border-0 p-0 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:ring-0 text-sm focus:outline-none bg-transparent"
          {...props}
        />
      </div>
      {hasError && (
        <p className="text-[10px] text-red-500 px-1">{error}</p>
      )}
    </div>
  );
};
