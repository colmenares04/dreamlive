import { useEffect, useState, useRef, CSSProperties } from "react";
import { useDraggable } from "@/hooks/useDraggable";

// --- TIPOS ---
interface LogEntry {
  id: string; // Identificador único para keys de React
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

// --- PALETA DE COLORES PERSONALIZADA (Grises & Verdes Técnicos) ---
const theme = {
  bg: {
    main: "#0a0a0a", // Fondo principal casi negro
    header: "#141414", // Cabecera ligeramente más clara
    terminal: "#050505", // Fondo de la consola (negro puro)
    hover: "#1f1f1f", // Hover sutil
  },
  border: {
    subtle: "#262626", // Bordes divisorios sutiles
    accent: "#1a3f2e", // Borde exterior con tinte verde oscuro
  },
  text: {
    primary: "#e5e5e5", // Texto principal claro
    secondary: "#a3a3a3", // Texto secundario gris
    muted: "#525252", // Marcas de tiempo y detalles apagados
  },
  accent: {
    primary: "#10b981", // Verde Esmeralda principal (éxito, activo)
    glow: "rgba(16, 185, 129, 0.15)", // Resplandor verde sutil
    error: "#cf6679", // Rojo desaturado para no romper la estética
    warning: "#d97706", // Ámbar para advertencias
  },
};

// --- ESTILOS CSS-IN-JS ---
const styles: Record<string, CSSProperties> = {
  // Contenedor Principal (Maximizad)
  container: {
    position: "fixed",
    top: "24px",
    left: "24px",
    width: "360px",
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.bg.main,
    border: `1px solid ${theme.border.accent}`,
    borderRadius: "12px",
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px ${theme.border.accent}`,
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    overflow: "hidden",
    zIndex: 2147483647,
    transition: "all 0.2s ease-in-out",
    willChange: "transform", // GPU acceleration hint
  },
  // Estado Minimizado (Píldora)
  minimizedBadge: {
    position: "fixed",
    top: "24px",
    left: "24px",
    padding: "8px 12px 8px 8px",
    backgroundColor: theme.bg.header,
    border: `1px solid ${theme.border.subtle}`,
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 2147483647,
    transition: "transform 0.15s ease, border-color 0.15s ease",
  },
  // Cabecera
  header: {
    padding: "12px 16px",
    backgroundColor: theme.bg.header,
    borderBottom: `1px solid ${theme.border.subtle}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleBlock: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  iconWrapper: {
    width: "28px",
    height: "28px",
    borderRadius: "6px",
    backgroundColor: "rgba(16, 185, 129, 0.1)", // Verde muy sutil
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.accent.primary,
  },
  statusIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: theme.accent.primary,
    boxShadow: `0 0 8px ${theme.accent.primary}`, // Efecto "Glow"
  },
  statusText: {
    fontSize: "11px",
    color: theme.text.secondary,
    fontWeight: 500,
    letterSpacing: "0.3px",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: theme.text.muted,
    cursor: "pointer",
    padding: "4px",
    display: "flex",
    borderRadius: "4px",
    transition: "background 0.15s, color 0.15s",
  },
  // Área de Consola
  terminalArea: {
    height: "280px", // Un poco más alto ahora que no hay stats
    overflowY: "auto",
    padding: "16px",
    backgroundColor: theme.bg.terminal,
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: "11px",
    lineHeight: "1.7",
    scrollbarWidth: "thin",
    scrollbarColor: `${theme.border.subtle} ${theme.bg.terminal}`,
  },
  logRow: {
    display: "grid",
    gridTemplateColumns: "auto 1fr", // La marca de tiempo ocupa lo necesario, el mensaje el resto
    gap: "12px",
    marginBottom: "6px",
    alignItems: "baseline",
  },
  timeStamp: {
    color: theme.text.muted,
    userSelect: "none",
    fontSize: "10px",
  },
  // Footer
  footer: {
    padding: "8px 16px",
    borderTop: `1px solid ${theme.border.subtle}`,
    backgroundColor: theme.bg.header,
    display: "flex",
    justifyContent: "flex-end",
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: theme.text.muted,
    fontSize: "10px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    cursor: "pointer",
    opacity: 0.7,
    transition: "opacity 0.15s",
  },
};

export const BackstagePanel = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [wasOpenBeforeDrag, setWasOpenBeforeDrag] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState("Conectado");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hook Draggable
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 24,
  });

  // Auto-minimize on drag start, auto-maximize on drag end
  useEffect(() => {
    if (isDragging) {
      // Save current state and minimize
      setWasOpenBeforeDrag(isOpen);
      if (isOpen) {
        setIsOpen(false);
      }
    } else if (wasOpenBeforeDrag && !isOpen) {
      // Restore state after drag ends
      setTimeout(() => {
        setIsOpen(true);
      }, 100);
    }
  }, [isDragging]);

  // --- LOGICA DE EVENTOS ---
  useEffect(() => {
    const handleUpdate = (event: Event) => {
      const e = event as CustomEvent;
      const { type, message, data } = e.detail;

      if (type === "LOG") {
        setLogs((prev) => [
          ...prev.slice(-149), // Guardamos hasta 150 logs
          {
            id: Math.random().toString(36).substr(2, 9),
            time: new Date().toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }), // Formato 24h más técnico
            message,
            type: data?.type || "info",
          },
        ]);
      }
      // Eliminado el bloque STATS
      if (type === "STATUS") setStatus(data.status);
    };

    document.addEventListener("dreamlive-backstage-event", handleUpdate);
    return () =>
      document.removeEventListener("dreamlive-backstage-event", handleUpdate);
  }, []);

  // Auto-scroll to bottom when new logs arrive - always scroll for real-time visibility
  useEffect(() => {
    if (scrollRef.current && logs.length > 0) {
      // Always scroll to bottom to see latest logs in real-time
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [logs]);

  // Función para obtener el color del log según su tipo
  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "success":
        return theme.accent.primary;
      case "error":
        return theme.accent.error;
      case "warning":
        return theme.accent.warning;
      default:
        return theme.text.primary; // Info es el color por defecto
    }
  };

  // --- RENDERIZADO MINIMIZADO ---
  if (!isOpen) {
    return (
      <div
        style={{
          ...styles.minimizedBadge,
          // Direct position updates for instant movement
          top: `${position.y}px`,
          left: `${position.x}px`,
          cursor: isDragging ? "grabbing" : "pointer",
        }}
        onMouseDown={handleMouseDown}
        onClick={() => {
          // Un pequeño hack para evitar que el click de drag se confunda con abrir
          if (!isDragging) setIsOpen(true);
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.borderColor = theme.accent.primary)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.borderColor = theme.border.subtle)
        }
      >
        {/* Icono de terminal minimalista */}
        <div
          style={{
            ...styles.iconWrapper,
            width: "20px",
            height: "20px",
            background: theme.accent.primary,
            color: theme.bg.main,
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 17L10 11L4 5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M12 19H20"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          style={{
            color: theme.text.primary,
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          DreamLive
        </span>
        {/* Pequeño indicador de estado si está activo */}
        {status && !status.includes("Esperando") && (
          <div style={styles.statusDot}></div>
        )}
      </div>
    );
  }

  // --- RENDERIZADO MAXIMIZADO ---
  return (
    <div
      style={{
        ...styles.container,
        // Direct position updates for instant movement
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: isDragging ? "scale(1.02)" : "scale(1)",
        boxShadow: isDragging
          ? "0 12px 40px rgba(0,0,0,0.6)"
          : (styles.container.boxShadow as string),
        cursor: isDragging ? "grabbing" : "default",
      }}
    >
      {/* HEADER */}
      <div
        style={{ ...styles.header, cursor: "grab" }}
        onMouseDown={handleMouseDown}
      >
        <div style={styles.headerTitleBlock}>
          {/* Icono de terminal "Prompt" >_ */}
          <div style={styles.iconWrapper}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4 17L10 11L4 5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 19H20"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h3
              style={{
                margin: "0 0 2px 0",
                fontSize: "13px",
                fontWeight: 700,
                color: theme.text.primary,
                letterSpacing: "0.5px",
              }}
            >
              DREAMLIVE_CONSOLE
            </h3>
            <div style={styles.statusIndicator}>
              <div
                style={{
                  ...styles.statusDot,
                  backgroundColor: status.toLowerCase().includes("esperando")
                    ? theme.text.muted
                    : theme.accent.primary,
                  boxShadow: status.toLowerCase().includes("esperando")
                    ? "none"
                    : styles.statusDot.boxShadow,
                }}
              ></div>
              <span style={styles.statusText}>{status}</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag handler from capturing this click
          style={styles.closeBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.bg.hover;
            e.currentTarget.style.color = theme.text.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme.text.muted;
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* TERMINAL LOGS */}
      <div ref={scrollRef} style={styles.terminalArea}>
        {logs.length === 0 && (
          <div
            style={{
              textAlign: "center",
              color: theme.text.muted,
              marginTop: "80px",
              fontStyle: "italic",
              opacity: 0.5,
            }}
          >
            Esperando input del sistema...
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} style={styles.logRow}>
            <span style={styles.timeStamp}>{log.time}</span>
            <span
              style={{ color: getLogColor(log.type), wordBreak: "break-word" }}
            >
              {/* Prefijo visual para el log según tipo */}
              <span
                style={{ marginRight: "8px", opacity: 0.7, fontWeight: 700 }}
              >
                {log.type === "success"
                  ? "✓"
                  : log.type === "error"
                    ? "✗"
                    : log.type === "warning"
                      ? "⚠"
                      : "›"}
              </span>
              {log.message}
            </span>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={styles.footer}>
        <button
          onClick={() => setLogs([])}
          style={styles.clearBtn}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
        >
          Limpiar Output
        </button>
      </div>
    </div>
  );
};
