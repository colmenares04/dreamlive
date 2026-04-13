import { useEffect, useState, useRef } from "react";
import { useDraggable } from "@/hooks/useDraggable";

// --- TIPOS ---
interface LogEntry {
  username: string;
  viewers: number;
  time: string;
  id: string; // Añadido para keys únicas
  likes: number;
}

// --- ICONOS SVG (Para no depender de librerías externas) ---
const Icons = {
  Eye: () => (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Minimize: () => (
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Robot: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  External: () => (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
};

export const ActionPanel = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hook Draggable
  const { position, handleMouseDown, isDragging } = useDraggable({
    x: 24,
    y: 90, // Posición inicial distinta para no solaparse si ambos están abiertos
  });

  useEffect(() => {
    // 1. Manejador de NUEVO LEAD
    const handleNewLead = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { username, viewers, likes } = customEvent.detail; // Obtener likes

      if (!username) return;

      // Si estaba minimizado, mostramos un indicador visual (opcional) o abrimos
      // setIsOpen(true); // Descomentar si quieres que se abra solo

      setLogs((prevLogs) => {
        if (prevLogs.some((log) => log.username === username)) return prevLogs;
        return [
          ...prevLogs,
          {
            id: Math.random().toString(36).substr(2, 9),
            username,
            viewers: viewers || 0,
            likes: likes || 0, // Guardar likes
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ];
      });
    };

    // 2. Manejador de VISIBILIDAD
    const handleStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      setIsVisible(customEvent.detail.active);
      if (customEvent.detail.active) setIsOpen(true);
    };

    document.addEventListener("dreamlive-new-lead", handleNewLead);
    document.addEventListener("dreamlive-status-change", handleStatusChange);

    return () => {
      document.removeEventListener("dreamlive-new-lead", handleNewLead);
      document.removeEventListener(
        "dreamlive-status-change",
        handleStatusChange,
      );
    };
  }, []);

  // Auto-scroll inteligente: Solo si el usuario no está haciendo hover para leer
  useEffect(() => {
    if (scrollRef.current && !isHovered) {
      // Pequeño timeout para asegurar que el DOM se ha actualizado
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [logs, isHovered]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        /* Fuentes y Reset Básico dentro del componente */
        .dl-panel-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: fixed;
          top: 90px;
          left: 24px;
          z-index: 2147483647; /* Máximo Z-Index */
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Estilo Glassmorphism */
        .dl-glass {
          background: rgba(15, 23, 42, 0.85); /* Slate 900 con transparencia */
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            0 4px 6px -1px rgba(0, 0, 0, 0.1), 
            0 2px 4px -1px rgba(0, 0, 0, 0.06),
            0 20px 25px -5px rgba(0, 0, 0, 0.2);
        }

        /* Scrollbar personalizado y elegante */
        .dl-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .dl-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .dl-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .dl-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        /* Animaciones */
        @keyframes dl-slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes dl-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .dl-entry-anim {
          animation: dl-slideIn 0.3s ease-out forwards;
        }

        .dl-pulse-dot {
          width: 8px;
          height: 8px;
          background-color: #10b981;
          border-radius: 50%;
          animation: dl-pulse 2s infinite;
        }
      `}</style>
      /* --- ESTADO MINIMIZADO (Píldora Flotante) --- */
      {!isOpen ? (
        <div
          onMouseDown={handleMouseDown}
          onClick={() => {
            if (!isDragging) setIsOpen(true);
          }}
          className="dl-panel-container dl-glass"
          style={{
            borderRadius: "30px",
            padding: "8px 16px",
            cursor: isDragging ? "grabbing" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "white",
            top: position.y,
            left: position.x,
          }}
        >
          <div className="dl-pulse-dot" />
          <span style={{ fontSize: "13px", fontWeight: 600 }}>DreamLive</span>
          <span
            style={{
              background: "#334155",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "700",
            }}
          >
            {logs.length}
          </span>
        </div>
      ) : (
        /* --- ESTADO EXPANDIDO (Panel Pro) --- */
        <div
          className="dl-panel-container dl-glass"
          style={{
            width: "280px",
            borderRadius: "16px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            top: position.y,
            left: position.x,
            cursor: isDragging ? "grabbing" : "default",
          }}
        >
          {/* HEADER */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              padding: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background:
                "linear-gradient(to right, rgba(255,255,255,0.03), transparent)",
              cursor: "grab",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  background: "linear-gradient(135deg, #6366f1, #a855f7)",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                }}
              >
                <Icons.Robot />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#fff",
                    lineHeight: "1.2",
                  }}
                >
                  DreamLive
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "10px",
                    color: "#94a3b8",
                    fontWeight: "500",
                  }}
                >
                  Tracking Activo <span style={{ color: "#10b981" }}>●</span>
                </p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "600",
                  color: "#94a3b8",
                  background: "rgba(255,255,255,0.05)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                {logs.length} leads
              </span>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  borderRadius: "4px",
                  transition: "0.2s",
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#fff")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#64748b")}
              >
                <Icons.Minimize />
              </button>
            </div>
          </div>

          {/* LISTA DE REGISTROS */}
          <div
            ref={scrollRef}
            className="dl-scroll"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              height: "280px",
              overflowY: "auto",
              position: "relative",
            }}
          >
            {logs.length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                  }}
                >
                  📡
                </div>
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#e2e8f0",
                    }}
                  >
                    Esperando datos...
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: "11px" }}>
                    Navega en TikTok Live
                  </p>
                </div>
              </div>
            ) : (
              <div style={{ padding: "0" }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="dl-entry-anim"
                    style={{
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "background 0.2s",
                      cursor: "default",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                      }}
                    >
                      <a
                        href={`https://www.tiktok.com/@${log.username}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#f1f5f9",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.color = "#38bdf8")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.color = "#f1f5f9")
                        }
                      >
                        @{log.username}
                        <span style={{ opacity: 0.5 }}>
                          <Icons.External />
                        </span>
                      </a>
                      <span
                        style={{
                          fontSize: "10px",
                          color: "#64748b",
                          fontFamily: "monospace",
                        }}
                      >
                        {log.time}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background:
                          log.likes && log.likes > 0
                            ? "rgba(244, 63, 94, 0.1)" // Rose background for likes
                            : "rgba(16, 185, 129, 0.1)", // Green for viewers
                        padding: "4px 8px",
                        borderRadius: "20px",
                        border:
                          log.likes && log.likes > 0
                            ? "1px solid rgba(244, 63, 94, 0.2)"
                            : "1px solid rgba(16, 185, 129, 0.2)",
                      }}
                    >
                      <span
                        style={{
                          color:
                            log.likes && log.likes > 0 ? "#f43f5e" : "#10b981",
                          display: "flex",
                          fontSize: "12px",
                        }}
                      >
                        {log.likes && log.likes > 0 ? "❤️" : <Icons.Eye />}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color:
                            log.likes && log.likes > 0 ? "#fb7185" : "#34d399",
                        }}
                      >
                        {log.likes && log.likes > 0
                          ? log.likes > 1000
                            ? (log.likes / 1000).toFixed(1) + "k"
                            : log.likes
                          : log.viewers > 1000
                            ? (log.viewers / 1000).toFixed(1) + "k"
                            : log.viewers}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FOOTER */}
          <div
            style={{
              padding: "8px 16px",
              background: "rgba(0,0,0,0.2)",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              fontSize: "10px",
              color: "#64748b",
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            POWERED BY DREAMLIVE
          </div>
        </div>
      )}
    </>
  );
};
