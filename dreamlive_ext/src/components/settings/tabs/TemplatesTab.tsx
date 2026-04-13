import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { toast } from "sonner";

export const TemplatesTab = () => {
  const [keywords, setKeywords] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);

  // ✅ NUEVO ESTADO PARA TIPOS
  const [invitationTypes, setInvitationTypes] = useState<string[]>([]);

  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false); // Loading para el nuevo botón

  // 1. CARGAR DATOS
  useEffect(() => {
    const loadData = async () => {
      const license = await licenseService.getStoredLicense();
      const licenseId = (license as any)?.key;
      if (!licenseId) return;

      try {
        const { data } = await (supabase.from("licenses") as any)
          .select("keywords, message_templates, invitation_types") // 👈 AGREGADO
          .eq("license_key", licenseId)
          .single();

        if (data) {
          if (data.keywords) setKeywords(data.keywords.replaceAll("/", "\n"));

          // Cargar Templates
          if (data.message_templates && Array.isArray(data.message_templates)) {
            const filtered = data.message_templates.filter(
              (t: string) => t && t.trim() !== "",
            );
            setTemplates(
              filtered.length > 0
                ? filtered
                : ["Hola {username}, me gusta tu contenido."],
            );
          } else {
            setTemplates(["Hola {username}, me gusta tu contenido."]);
          }

          // ✅ CARGAR TIPOS DE INVITACIÓN
          if (data.invitation_types && Array.isArray(data.invitation_types)) {
            setInvitationTypes(data.invitation_types);
          } else {
            // Default si no existe aún
            setInvitationTypes(["Normal", "Elite", "Popular", "Premium"]);
          }
        }
      } catch (e) {
        console.log("Error al cargar", e);
      }
    };
    loadData();
  }, []);

  // 2. GUARDAR PALABRAS CLAVE
  const saveKeywords = async () => {
    setLoadingKeys(true);
    try {
      const license = await licenseService.getStoredLicense();
      const licenseId = (license as any)?.key;

      const cleanKeywords = keywords
        .split("\n")
        .map((k) => k.trim())
        .filter((k) => k.length > 0)
        .join("/");

      const { error } = await (supabase.from("licenses") as any)
        .update({ keywords: cleanKeywords })
        .eq("license_key", licenseId);

      if (error) throw error;
      toast.success("Palabras clave actualizadas");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoadingKeys(false);
    }
  };

  // ✅ 3. GUARDAR TIPOS DE INVITACIÓN (NUEVA FUNCIÓN)
  const saveInvitationTypes = async () => {
    setLoadingTypes(true);
    try {
      const license = await licenseService.getStoredLicense();
      const licenseId = (license as any)?.key;

      const { error } = await (supabase.from("licenses") as any)
        .update({ invitation_types: invitationTypes })
        .eq("license_key", licenseId);

      if (error) throw error;
      toast.success("Filtros de invitación actualizados");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoadingTypes(false);
    }
  };

  // 4. GUARDAR MENSAJES
  const saveTemplates = async () => {
    setLoadingMsgs(true);
    try {
      const license = await licenseService.getStoredLicense();
      const licenseId = (license as any)?.key;

      const { error } = await (supabase.from("licenses") as any)
        .update({ message_templates: templates })
        .eq("license_key", licenseId);

      if (error) throw error;
      toast.success("Mensajes guardados");
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  // --- HANDLERS UI ---
  const handleAddTemplate = () => {
    if (templates.length < 5) {
      setTemplates([...templates, ""]);
    } else {
      toast.error("Máximo 5 mensajes permitidos");
    }
  };

  const handleUpdateTemplate = (index: number, value: string) => {
    const newTemplates = [...templates];
    newTemplates[index] = value;
    setTemplates(newTemplates);
  };

  const handleRemoveTemplate = (index: number) => {
    if (templates.length > 1) {
      setTemplates(templates.filter((_, i) => i !== index));
    } else {
      setTemplates([""]);
    }
  };

  // ✅ HANDLER PARA TOGGLE DE TIPOS
  const toggleInvitationType = (type: string) => {
    if (invitationTypes.includes(type)) {
      setInvitationTypes(invitationTypes.filter((t) => t !== type));
    } else {
      setInvitationTypes([...invitationTypes, type]);
    }
  };

  return (
    <div className="space-y-6 p-1 bg-white">
      {/* SECCIÓN 1: PALABRAS CLAVE */}
      <section className="p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="text-[12px] font-black uppercase text-gray-600 tracking-widest px-1">
          Búsqueda por Keywords
        </h3>
        <textarea
          className="w-full p-3 text-xs bg-white text-gray-800 border border-gray-300 rounded-xl focus:border-blue-500 outline-none min-h-[80px] transition-all shadow-inner"
          placeholder="Palabras separadas por línea..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-xl text-[11px]"
          onClick={saveKeywords}
          disabled={loadingKeys}
        >
          {loadingKeys ? "Guardando..." : "Actualizar Palabras"}
        </Button>
      </section>

      {/* ✅ SECCIÓN 2: TIPOS DE INVITACIÓN (NUEVA) */}
      <section className="p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="text-[12px] font-black uppercase text-gray-600 tracking-widest px-1">
          Filtros de Invitación
        </h3>

        <div className="flex gap-2 flex-wrap">
          {["Normal", "Elite", "Popular", "Premium"].map((type) => {
            const isActive = invitationTypes.includes(type);
            // Colores según el tipo (Estilo visual)
            let activeClass = "bg-gray-800 text-white border-gray-800";
            if (type === "Premium")
              activeClass = "bg-[#2CB8C5] text-white border-[#2CB8C5]";
            if (type === "Elite")
              activeClass = "bg-orange-500 text-white border-orange-500";
            if (type === "Popular")
              activeClass = "bg-purple-600 text-white border-purple-600";
            if (type === "Normal")
              activeClass = "bg-blue-600 text-white border-blue-600";

            return (
              <button
                key={type}
                onClick={() => toggleInvitationType(type)}
                className={`
                  flex-1 py-2 rounded-xl text-[11px] font-bold border transition-all duration-200
                  ${isActive
                    ? `${activeClass} shadow-md scale-[1.02]`
                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }
                `}
              >
                {isActive && <span className="mr-1">✓</span>}
                {type}
              </button>
            );
          })}
        </div>

        <Button
          className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 rounded-xl text-[11px]"
          onClick={saveInvitationTypes}
          disabled={loadingTypes}
        >
          {loadingTypes ? "Guardando..." : "Guardar Filtros"}
        </Button>
      </section>

      {/* SECCIÓN 3: MENSAJES */}
      <section className="p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[12px] font-black uppercase text-gray-600 tracking-widest">
            Plantillas de Mensaje
          </h3>
          <span className="text-[9px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
            {"{username}"} OK
          </span>
        </div>

        <div className="space-y-3">
          {templates.map((msg, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 group animate-in slide-in-from-right-2 duration-200"
            >
              <div className="relative">
                <textarea
                  className="w-full pl-3 pr-8 py-2 text-xs bg-white text-gray-800 border border-gray-300 rounded-xl focus:border-emerald-500 outline-none shadow-sm transition-all resize-none overflow-hidden min-h-[60px]"
                  placeholder="Escribe tu mensaje..."
                  value={msg}
                  maxLength={300}
                  onChange={(e) => {
                    handleUpdateTemplate(index, e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                  onFocus={(e) => {
                    e.target.style.height = "auto";
                    e.target.style.height = e.target.scrollHeight + "px";
                  }}
                />
                <button
                  onClick={() => handleRemoveTemplate(index)}
                  className="absolute right-2 top-2 text-gray-300 hover:text-red-500 p-1"
                >
                  ✕
                </button>
              </div>
              <div className="text-[10px] text-right text-gray-400 font-mono px-1">
                {msg.length}/300 caracteres
              </div>
            </div>
          ))}

          {templates.length < 5 && (
            <button
              onClick={handleAddTemplate}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 group"
            >
              <span className="text-lg group-hover:scale-125 transition-transform">
                +
              </span>
              <span className="text-[10px] font-bold uppercase">
                Añadir otra variante
              </span>
            </button>
          )}
        </div>

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-[11px]"
          onClick={saveTemplates}
          disabled={loadingMsgs}
        >
          {loadingMsgs ? "Guardando..." : "Guardar Mensajes"}
        </Button>
      </section>

      <p className="text-[12px] text-gray-600 text-center italic px-4 leading-tight">
        El bot usará estas configuraciones para filtrar y contactar.
      </p>
    </div>
  );
};
