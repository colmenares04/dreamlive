import { useState, useCallback, useRef, useEffect } from "react";

interface Position {
  x: number;
  y: number;
}

export const useDraggable = (initialPosition: Position = { x: 24, y: 24 }) => {
  const [position, setPosition] = useState<Position>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef<Position>({ x: 0, y: 0 });
  const rafId = useRef<number | null>(null);
  const pendingPosition = useRef<Position | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      setIsDragging(true);
      offset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      // Evitar selección de texto mientras se arrastra
      document.body.style.userSelect = "none";
    },
    [position],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        // Store the pending position
        pendingPosition.current = {
          x: e.clientX - offset.current.x,
          y: e.clientY - offset.current.y,
        };

        // Only schedule an update if one isn't already pending
        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(() => {
            if (pendingPosition.current) {
              setPosition(pendingPosition.current);
              pendingPosition.current = null;
            }
            rafId.current = null;
          });
        }
      }
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = "";

    // Cancel any pending animation frame
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      // Cleanup animation frame on unmount
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return { position, handleMouseDown, isDragging };
};
