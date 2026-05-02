import { Sun, Moon } from "lucide-react";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { browser } from "wxt/browser";

interface ControlCenterWidgetProps {
  isDarkMode: boolean;
  activeModal: any;
}

export const ControlCenterWidget = ({ isDarkMode, activeModal }: ControlCenterWidgetProps) => {
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 24,
  });

  const toggleTheme = async () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    await browser.storage.local.set({ theme: newTheme });
  };

  if (!activeModal) {
    return null;
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      {/* Botón Secundario: Cambiar Tema */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleTheme();
        }}
        className="dreamlive-theme-btn"
        style={{ 
          width: '32px', 
          height: '32px',
          opacity: 0.8,
          alignSelf: 'center'
        }}
      >
        {isDarkMode ? (
          <Sun size={16} fill="currentColor" strokeWidth={2} />
        ) : (
          <Moon size={16} fill="currentColor" strokeWidth={2} />
        )}
      </button>
    </div>
  );
};
