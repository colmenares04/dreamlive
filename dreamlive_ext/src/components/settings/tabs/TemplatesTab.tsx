import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/utils/supabase";
import { licenseService } from "@/services/licenseService";
import { toast } from "sonner";
import { Search, Filter, MessageSquare, Plus, Trash2, CheckCircle2 } from "lucide-react";

export const TemplatesTab = () => {
  const [keywords, setKeywords] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [invitationTypes, setInvitationTypes] = useState<string[]>([]);

  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const license = await licenseService.getStoredLicense();
      const licenseId = (license as any)?.key;
      if (!licenseId) return;

      try {
        const { data } = await (supabase.from("licenses") as any)
          .select("keywords, message_templates, invitation_types")
          .eq("license_key", licenseId)
          .single();

        if (data) {
          if (data.keywords) setKeywords(data.keywords.replaceAll("/", "\n"));

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

          if (data.invitation_types && Array.isArray(data.invitation_types)) {
            setInvitationTypes(data.invitation_types);
          } else {
            setInvitationTypes(["Normal", "Elite", "Popular", "Premium"]);
          }
        }
      } catch (e) {
        console.log("Error al cargar", e);
      }
    };
    loadData();
  }, []);

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

  const toggleInvitationType = (type: string) => {
    if (invitationTypes.includes(type)) {
      setInvitationTypes(invitationTypes.filter((t) => t !== type));
    } else {
      setInvitationTypes([...invitationTypes, type]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* SECTION: KEYWORDS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Search size={14} className="text-indigo-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Targeting Keywords</h3>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <textarea
            className="w-full p-4 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-indigo-500 outline-none min-h-[100px] transition-all resize-none placeholder:text-slate-300"
            placeholder="Introduce una palabra por línea para filtrar directos..."
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <Button
            className="w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            onClick={saveKeywords}
            isLoading={loadingKeys}
          >
            Sincronizar Filtros
          </Button>
        </div>
      </section>

      {/* SECTION: FILTERS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Filter size={14} className="text-amber-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Invitaciones Permitidas</h3>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {["Normal", "Elite", "Popular", "Premium"].map((type) => {
              const isActive = invitationTypes.includes(type);
              const colorMap: any = {
                Normal: "bg-blue-500",
                Elite: "bg-orange-500",
                Popular: "bg-purple-600",
                Premium: "bg-cyan-500"
              };
              
              return (
                <button
                  key={type}
                  onClick={() => toggleInvitationType(type)}
                  className={`
                    relative flex items-center justify-center h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300
                    ${isActive
                      ? `${colorMap[type]} text-white border-transparent shadow-lg shadow-black/10 scale-[1.02]`
                      : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }
                  `}
                >
                  {isActive && <CheckCircle2 size={12} className="absolute left-3" />}
                  {type}
                </button>
              );
            })}
          </div>
          <Button
            variant="secondary"
            className="w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900"
            onClick={saveInvitationTypes}
            isLoading={loadingTypes}
          >
            Guardar Configuración
          </Button>
        </div>
      </section>

      {/* SECTION: MESSAGES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <MessageSquare size={14} className="text-emerald-500" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Mensajes de Contacto</h3>
          </div>
          <span className="text-[8px] font-black px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg border border-emerald-500/20">
            Variable: {"{username}"}
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="space-y-3">
            {templates.map((msg, index) => (
              <div key={index} className="space-y-1.5 animate-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="relative group">
                  <textarea
                    className="w-full p-4 pr-12 text-[11px] font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl focus:border-emerald-500 outline-none transition-all resize-none min-h-[70px] placeholder:text-slate-300"
                    placeholder="Escribe el mensaje de invitación..."
                    value={msg}
                    maxLength={300}
                    onChange={(e) => handleUpdateTemplate(index, e.target.value)}
                  />
                  <button
                    onClick={() => handleRemoveTemplate(index)}
                    className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-end px-2">
                   <span className={`text-[8px] font-black uppercase ${msg.length > 250 ? "text-rose-500" : "text-slate-400"}`}>
                     {msg.length} / 300
                   </span>
                </div>
              </div>
            ))}

            {templates.length < 5 && (
              <button
                onClick={handleAddTemplate}
                className="w-full h-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-500/5 transition-all group"
              >
                <Plus size={16} className="group-hover:scale-125 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Añadir Variante</span>
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            className="w-full h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={saveTemplates}
            isLoading={loadingMsgs}
          >
            Actualizar Plantillas
          </Button>
        </div>
      </section>

      <div className="flex items-center justify-center gap-2 py-4">
        <CheckCircle2 size={14} className="text-slate-300" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          Configuración aplicada en tiempo real.
        </p>
      </div>
    </div>
  );
};
