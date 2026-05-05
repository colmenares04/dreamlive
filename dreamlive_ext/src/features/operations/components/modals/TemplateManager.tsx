import React, { useState, useRef } from "react";
import { Plus, Trash2, Edit2, Check, X, AlertCircle } from "lucide-react";

export interface TemplateManagerProps {
  templates: string[];
  invitationTypes: string[];
  onConfigChange: (templates: string[], invitationTypes: string[]) => void;
  isDarkMode: boolean;
}

const DEFAULT_INVITATIONS = ["Normal", "Elite", "Popular", "Premium"];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  invitationTypes = DEFAULT_INVITATIONS,
  onConfigChange,
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
    onConfigChange([...templates, newTemplateText.trim()], invitationTypes);
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
    onConfigChange(updated, invitationTypes);
    setEditingIndex(null);
    setEditingText("");
  };

  const handleDeleteTemplate = (index: number) => {
    const updated = templates.filter((_, i) => i !== index);
    onConfigChange(updated, invitationTypes);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingText("");
    }
  };

  const toggleInvitationType = (type: string) => {
    let updated: string[];
    if (invitationTypes.includes(type)) {
      updated = invitationTypes.filter(t => t !== type);
    } else {
      updated = [...invitationTypes, type];
    }
    onConfigChange(templates, updated);
  };

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px',
        borderRadius: '16px', transition: 'all 0.5s ease',
        background: isDarkMode ? '#1C1C1E' : '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ 
          margin: 0, fontSize: '16px', fontWeight: '800', letterSpacing: '-0.5px',
          color: isDarkMode ? '#FFFFFF' : '#000000'
        }}>
          Configuración
        </h3>
        <p style={{ 
          margin: 0, fontSize: '12px', fontWeight: '500', 
          color: isDarkMode ? '#8E8E93' : '#636366' 
        }}>
          Personaliza tus invitaciones y mensajes automáticos
        </p>
      </div>


      {/* Formulario de Nueva Plantilla */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ 
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
            color: isDarkMode ? '#8E8E93' : '#8E8E93' 
          }}>
            Nuevo Mensaje
          </label>
          <span style={{ 
            fontSize: '10px', fontWeight: '800', 
            color: templates.length >= 5 ? '#FF453A' : '#AF52DE' 
          }}>
            {templates.length}/5
          </span>
        </div>

        {templates.length < 5 ? (
          <div style={{ 
            display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: '14px',
            background: isDarkMode ? '#2C2C2E' : '#F2F2F7',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)'
          }}>
            <textarea
              ref={addTextareaRef}
              rows={2}
              placeholder="Escribe el mensaje aquí..."
              value={newTemplateText}
              onChange={(e) => setNewTemplateText(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: '500', lineHeight: '1.4', resize: 'none',
                color: isDarkMode ? '#FFFFFF' : '#000000', padding: 0
              }}
            />
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              marginTop: '10px', paddingTop: '10px', 
              borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)' 
            }}>
              <button
                type="button"
                onClick={() => insertVariable("{username}", false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', 
                  padding: '6px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: '700',
                  background: isDarkMode ? 'rgba(175, 82, 222, 0.15)' : 'rgba(175, 82, 222, 0.1)',
                  color: '#AF52DE', border: 'none', cursor: 'pointer'
                }}
              >
                <Plus size={12} />
                {`{username}`}
              </button>
              <button
                type="button"
                onClick={handleAddTemplate}
                disabled={!newTemplateText.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '8px 16px', borderRadius: '100px', fontSize: '12px', fontWeight: '700',
                  background: newTemplateText.trim() ? '#AF52DE' : (isDarkMode ? '#3A3A3C' : '#D1D1D6'),
                  color: '#FFFFFF',
                  border: 'none', cursor: newTemplateText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', 
            borderRadius: '14px', background: 'rgba(255, 69, 58, 0.1)', 
            border: '1px solid rgba(255, 69, 58, 0.2)', color: '#FF453A'
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '12px', fontWeight: '700' }}>Límite alcanzado</span>
          </div>
        )}
      </div>

      {/* Lista de Plantillas */}
      {templates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ 
            fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px',
            color: isDarkMode ? '#8E8E93' : '#8E8E93' 
          }}>
            Tus Plantillas
          </label>
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '8px', 
            maxHeight: '160px', overflowY: 'auto' 
          }} className="custom-scrollbar">
            {templates.map((template, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', flexDirection: 'column', padding: '12px', 
                  borderRadius: '14px', transition: 'all 0.3s ease',
                  background: editingIndex === idx ? 'rgba(175, 82, 222, 0.1)' : (isDarkMode ? '#2C2C2E' : '#F2F2F7'),
                  border: editingIndex === idx ? '1px solid rgba(175, 82, 222, 0.3)' : '1px solid transparent'
                }}
              >
                {editingIndex === idx ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <textarea
                      ref={editTextareaRef}
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        fontSize: '14px', fontWeight: '500', lineHeight: '1.4', resize: 'none',
                        color: isDarkMode ? '#FFFFFF' : '#000000', padding: 0
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => insertVariable("{username}", true)}
                        style={{ background: 'none', border: 'none', color: '#AF52DE', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        + {`{username}`}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => setEditingIndex(null)} style={{ background: 'none', border: 'none', color: isDarkMode ? '#8E8E93' : '#636366', cursor: 'pointer' }}><X size={16} /></button>
                        <button onClick={() => handleSaveEdit(idx)} style={{ background: 'none', border: 'none', color: '#34C759', cursor: 'pointer' }}><Check size={16} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <p style={{ 
                      margin: 0, fontSize: '13px', fontWeight: '500', lineHeight: '1.4', 
                      color: isDarkMode ? '#FFFFFF' : '#1C1C1E',
                      flex: 1
                    }}>
                      {template}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleStartEditing(idx)}
                        style={{ 
                          padding: '6px', borderRadius: '100px', background: 'none', border: 'none',
                          color: isDarkMode ? '#8E8E93' : '#636366',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(idx)}
                        style={{ 
                          padding: '6px', borderRadius: '100px', background: 'none', border: 'none',
                          color: '#FF453A', cursor: 'pointer', opacity: 0.8
                        }}
                      >
                        <Trash2 size={14} />
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
