import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'outline' | 'danger' | 'success';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = "w-full py-1.5 rounded-full text-[11px] font-medium transition-transform active:scale-95 flex items-center justify-center gap-2";
  
  const styles = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    accent: "bg-accent text-white hover:bg-accent-hover",
    outline: "bg-transparent border border-border text-text-soft hover:bg-bg-main",
    danger: "bg-danger text-white",
    success: "bg-success text-white animate-pulse"
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};