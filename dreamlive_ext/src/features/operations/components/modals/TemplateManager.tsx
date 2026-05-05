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
        background: isDarkMode ? 'var(--apple-bg-secondary)' : '#FFFFFF',
        border: '1px solid var(--apple-border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ 
          margin: 0, fontSize: '15px', fontWeight: '900', letterSpacing: '-0.3px',
          color: 'var(--apple-text-main)'
        }}>
          Configuración
        </h3>
        <p style={{ 
          margin: 0, fontSize: '11px', fontWeight: '600', 
          color: 'var(--apple-text-sub)', letterSpacing: '0.2px'
        }}>
          Personaliza tus invitaciones y mensajes automáticos
        </p>
      </div>


      {/* Formulario de Nueva Plantilla */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <label style={{ 
            fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px',
            color: 'var(--apple-text-sub)' 
          }}>
            Nuevo Mensaje
          </label>
          <span style={{ 
            fontSize: '10px', fontWeight: '900', 
            color: templates.length >= 5 ? '#FF453A' : 'var(--color-primary)' 
          }}>
            {templates.length}/5
          </span>
        </div>

        {templates.length < 5 ? (
          <div style={{ 
            display: 'flex', flexDirection: 'column', padding: '14px', borderRadius: '16px',
            background: 'var(--apple-bg)',
            border: '1px solid var(--apple-border)',
            transition: 'all 0.3s ease'
          }}>
            <textarea
              ref={addTextareaRef}
              rows={2}
              placeholder="Escribe el mensaje aquí..."
              value={newTemplateText}
              onChange={(e) => setNewTemplateText(e.target.value)}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none',
                fontSize: '13px', fontWeight: '600', lineHeight: '1.5', resize: 'none',
                color: 'var(--apple-text-main)', padding: 0
              }}
            />
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
              marginTop: '12px', paddingTop: '10px', 
              borderTop: '1px solid var(--apple-border)' 
            }}>
              <button
                type="button"
                onClick={() => insertVariable("{username}", false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px', 
                  padding: '6px 14px', borderRadius: '100px', fontSize: '11px', fontWeight: '800',
                  background: 'rgba(255, 99, 155, 0.1)',
                  color: 'var(--color-primary)', border: 'none', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={12} strokeWidth={3} />
                {`{username}`}
              </button>
              <button
                type="button"
                onClick={handleAddTemplate}
                disabled={!newTemplateText.trim()}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '8px 18px', borderRadius: '100px', fontSize: '11px', fontWeight: '900',
                  background: newTemplateText.trim() ? 'var(--color-primary-gradient)' : 'var(--apple-btn-disabled)',
                  color: '#FFFFFF',
                  border: 'none', cursor: newTemplateText.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: newTemplateText.trim() ? '0 4px 10px rgba(255, 99, 155, 0.2)' : 'none'
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', 
            borderRadius: '16px', background: 'rgba(255, 69, 58, 0.05)', 
            border: '1px solid rgba(255, 69, 58, 0.1)', color: '#FF453A'
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '12px', fontWeight: '800' }}>Límite de plantillas alcanzado</span>
          </div>
        )}
      </div>

      {/* Lista de Plantillas */}
      {templates.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ 
            fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px',
            color: 'var(--apple-text-sub)' 
          }}>
            Tus Plantillas
          </label>
          <div style={{ 
            display: 'flex', flexDirection: 'column', gap: '10px', 
            maxHeight: '200px', overflowY: 'auto' 
          }} className="custom-scrollbar">
            {templates.map((template, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', flexDirection: 'column', padding: '14px', 
                  borderRadius: '16px', transition: 'all 0.3s ease',
                  background: editingIndex === idx ? 'rgba(255, 99, 155, 0.05)' : 'var(--apple-bg)',
                  border: editingIndex === idx ? '1px solid var(--color-primary)' : '1px solid var(--apple-border)'
                }}
              >
                {editingIndex === idx ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea
                      ref={editTextareaRef}
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      style={{
                        width: '100%', background: 'transparent', border: 'none', outline: 'none',
                        fontSize: '13px', fontWeight: '600', lineHeight: '1.5', resize: 'none',
                        color: 'var(--apple-text-main)', padding: 0
                      }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--apple-border)', paddingTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => insertVariable("{username}", true)}
                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
                      >
                        + {`{username}`}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => setEditingIndex(null)} style={{ background: 'none', border: 'none', color: 'var(--apple-text-sub)', cursor: 'pointer' }}><X size={18} /></button>
                        <button onClick={() => handleSaveEdit(idx)} style={{ background: 'none', border: 'none', color: '#34C759', cursor: 'pointer' }}><Check size={18} strokeWidth={3} /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <p style={{ 
                      margin: 0, fontSize: '13px', fontWeight: '600', lineHeight: '1.5', 
                      color: 'var(--apple-text-main)',
                      flex: 1
                    }}>
                      {template}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        onClick={() => handleStartEditing(idx)}
                        style={{ 
                          padding: '6px', borderRadius: '10px', background: 'var(--apple-bg-secondary)', border: '1px solid var(--apple-border)',
                          color: 'var(--apple-text-sub)',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(idx)}
                        style={{ 
                          padding: '6px', borderRadius: '10px', background: 'rgba(255, 69, 58, 0.05)', border: '1px solid rgba(255, 69, 58, 0.1)',
                          color: '#FF453A', cursor: 'pointer'
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
