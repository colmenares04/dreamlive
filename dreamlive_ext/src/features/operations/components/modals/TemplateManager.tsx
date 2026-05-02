import React, { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, AlertCircle } from "lucide-react";

export interface TemplateManagerProps {
  templates: string[];
  onTemplatesChange: (newTemplates: string[]) => void;
  isDarkMode: boolean;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onTemplatesChange,
  isDarkMode
}) => {
  const [newTemplateText, setNewTemplateText] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  
  const addTextareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (variable: string, isEditing: boolean) => {
    const ref = isEditing ? editTextareaRef : addTextareaRef;
    const text = isEditing ? editingText : newTemplateText;
    const setText = isEditing ? setEditingText : setNewTemplateText;

    if (ref.current) {
      const start = ref.current.selectionStart;
      const end = ref.current.selectionEnd;
      const inserted = text.slice(0, start) + variable + text.slice(end);
      setText(inserted);

      // Restore cursor position after the inserted variable
      setTimeout(() => {
        if (ref.current) {
          ref.current.focus();
          const newCursorPos = start + variable.length;
          ref.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    } else {
      setText(text + variable);
    }
  };

  const handleAddTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateText.trim() || templates.length >= 5) return;
    onTemplatesChange([...templates, newTemplateText.trim()]);
    setNewTemplateText("");
  };

  const handleStartEditing = (index: number) => {
    setEditingIndex(index);
    setEditingText(templates[index]);
  };

  const handleSaveEdit = (index: number) => {
    if (!editingText.trim()) return;
    const updated = [...templates];
    updated[index] = editingText.trim();
    onTemplatesChange(updated);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDeleteTemplate = (index: number) => {
    const updated = templates.filter((_, i) => i !== index);
    onTemplatesChange(updated);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingText("");
    }
  };

  return (
    <div 
      className={`flex flex-col gap-4 p-5 rounded-[12px] border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-[#1C1C1E] border-[#2C2C2E] text-white' 
          : 'bg-[#F2F2F7] border-[#D1D1D6] text-[#1C1C1E]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[14px] font-bold tracking-tight">Gestor de Plantillas</h3>
          <p className={`text-[11px] font-medium ${isDarkMode ? 'text-[#8E8E93]' : 'text-[#636366]'}`}>
            Define hasta 5 plantillas personalizadas
          </p>
        </div>
        <span className={`text-[11px] font-bold px-3 py-1 rounded-[6px] border ${
          templates.length >= 5
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 animate-pulse'
            : isDarkMode ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-white border-gray-200 text-gray-600'
        }`}>
          {templates.length} / 5
        </span>
      </div>

      {/* Formulario de Nueva Plantilla */}
      {templates.length < 5 ? (
        <form onSubmit={handleAddTemplate} className="flex flex-col gap-3">
          <textarea
            ref={addTextareaRef}
            rows={2}
            placeholder="Escribe el mensaje de la plantilla..."
            value={newTemplateText}
            onChange={(e) => setNewTemplateText(e.target.value)}
            className={`w-full px-3.5 py-2 rounded-[8px] text-[13px] font-medium focus:outline-none focus:ring-1 transition-all border leading-relaxed resize-none ${
              isDarkMode 
                ? 'bg-[#2C2C2E] border-[#3A3A3C] text-white focus:ring-blue-500/40 focus:border-blue-500' 
                : 'bg-white border-[#C7C7CC] text-black focus:ring-blue-500/30 focus:border-blue-500'
            }`}
          />
          <div className="flex items-center justify-between gap-2 px-0.5">
            <button
              type="button"
              onClick={() => insertVariable("{username}", false)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-[6px] border transition-all ${
                isDarkMode 
                  ? 'bg-[#2C2C2E] border-[#3A3A3C] hover:bg-[#3A3A3C] text-[#0A84FF]' 
                  : 'bg-white border-[#C7C7CC] hover:bg-[#F2F2F7] text-[#007AFF]'
              }`}
            >
              + {`{username}`}
            </button>
            <button
              type="submit"
              disabled={!newTemplateText.trim()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-bold transition-all shadow-sm ${
                newTemplateText.trim()
                  ? 'bg-[#007AFF] text-white hover:bg-[#0062CC]'
                  : 'bg-[#D1D1D6] text-[#8E8E93] cursor-not-allowed opacity-50'
              }`}
            >
              <Plus size={14} />
              <span>Añadir Plantilla</span>
            </button>
          </div>
        </form>
      ) : (
        <div className={`flex items-center gap-2 p-3.5 rounded-[8px] border ${
          isDarkMode ? 'bg-amber-500/5 border-amber-500/10 text-amber-400' : 'bg-amber-50/50 border-amber-200 text-amber-600'
        }`}>
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-[12px] font-bold">Límite alcanzado (Máximo 5 plantillas)</span>
        </div>
      )}

      {/* Lista de Plantillas */}
      {templates.length > 0 && (
        <div className="flex flex-col gap-3 mt-1">
          <span className={`text-[11px] font-bold tracking-tight uppercase ${
            isDarkMode ? 'text-[#8E8E93]' : 'text-[#636366]'
          }`}>
            Tus Plantillas Guardadas
          </span>

          <div className="flex flex-col gap-2.5 max-h-[190px] overflow-y-auto pr-1">
            {templates.map((template, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-3 p-3.5 rounded-[8px] border transition-all ${
                  editingIndex === idx
                    ? isDarkMode ? 'bg-[#2C2C2E] border-[#0A84FF]' : 'bg-[#E5E5EA] border-[#007AFF]'
                    : isDarkMode ? 'bg-[#2C2C2E] border-[#3A3A3C]' : 'bg-white border-[#E5E5EA] shadow-sm'
                }`}
              >
                {editingIndex === idx ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      ref={editTextareaRef}
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-[8px] text-[13px] font-medium focus:outline-none focus:ring-1 transition-all border leading-relaxed resize-none ${
                        isDarkMode 
                          ? 'bg-[#1C1C1E] border-[#3A3A3C] text-white focus:ring-blue-500/40 focus:border-blue-500' 
                          : 'bg-white border-[#007AFF] text-black focus:ring-blue-500/30 focus:border-blue-500'
                      }`}
                    />
                    <div className="flex items-center justify-between gap-2 px-0.5">
                      <button
                        type="button"
                        onClick={() => insertVariable("{username}", true)}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-[6px] border transition-all ${
                          isDarkMode 
                            ? 'bg-[#1C1C1E] border-[#3A3A3C] hover:bg-[#2C2C2E] text-[#0A84FF]' 
                            : 'bg-white border-[#C7C7CC] hover:bg-[#F2F2F7] text-[#007AFF]'
                        }`}
                      >
                        + {`{username}`}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className={`p-2 rounded-[6px] border transition-all ${
                            isDarkMode ? 'bg-[#1C1C1E] border-[#3A3A3C] hover:bg-[#3A3A3C]' : 'bg-[#E5E5EA] border-[#C7C7CC] hover:bg-[#D1D1D6]'
                          }`}
                        >
                          <X size={15} className="text-[#8E8E93]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(idx)}
                          disabled={!editingText.trim()}
                          className={`p-2 rounded-[6px] transition-all text-white shadow-sm ${
                            editingText.trim()
                              ? 'bg-[#34C759] hover:bg-[#28A745]'
                              : 'bg-[#D1D1D6] opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <Check size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className={`text-[13px] font-medium leading-relaxed flex-1 break-words ${
                      isDarkMode ? 'text-[#E5E5EA]' : 'text-[#3A3A3C]'
                    }`}>
                      {template}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditing(idx)}
                        className={`p-2 rounded-[6px] border transition-all ${
                          isDarkMode 
                            ? 'bg-[#1C1C1E] border-[#3A3A3C] hover:bg-[#3A3A3C] text-[#E5E5EA]' 
                            : 'bg-[#F2F2F7] border-[#D1D1D6] hover:bg-[#E5E5EA] text-[#3A3A3C]'
                        }`}
                        title="Editar Plantilla"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(idx)}
                        className="p-2 rounded-[6px] border border-red-200/20 bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all"
                        title="Eliminar Plantilla"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
