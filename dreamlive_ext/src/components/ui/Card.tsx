import React from 'react';

interface CardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, children, fullWidth = false }) => (
  <div className={`bg-card p-3 rounded-xl shadow-card hover:shadow-card-hover transition-all border border-border ${fullWidth ? 'col-span-2' : ''}`}>
    <h2 className="text-[11px] font-semibold text-text-main mb-0.5">{title}</h2>
    <p className="text-[9px] text-text-soft mb-2 leading-tight">{subtitle}</p>
    {children}
  </div>
);