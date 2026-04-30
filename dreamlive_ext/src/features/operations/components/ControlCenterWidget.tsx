import React from "react";
import { Sun, Moon } from "lucide-react";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { browser } from "wxt/browser";

interface ControlCenterWidgetProps {
  isDarkMode: boolean;
}

export const ControlCenterWidget = ({ isDarkMode }: ControlCenterWidgetProps) => {
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 24,
  });

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    await browser.storage.local.set({ theme: newTheme });
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className="dreamlive-widget-toggle"
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto'
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleTheme();
        }}
        className="dreamlive-theme-btn"
        title={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      >
        {isDarkMode ? (
          <Sun size={20} fill="currentColor" strokeWidth={2} />
        ) : (
          <Moon size={20} fill="currentColor" strokeWidth={2} />
        )}
      </button>
    </div>
  );
};
