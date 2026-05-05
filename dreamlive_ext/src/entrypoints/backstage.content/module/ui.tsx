import ReactDOM from "react-dom/client";
import { InjectedModalOrchestrator } from "../../../features/operations/components/InjectedModalOrchestrator";

/**
 * Tailwind v4 usa @property para sus design tokens (colores, spacing, etc.).
 * El Shadow DOM NO soporta @property, así que estas declaraciones DEBEN
 * vivir en el Light DOM (el <head> del documento).
 * Sin esto, todas las clases de Tailwind que usen variables CSS quedarán vacías.
 */
function injectTailwindProperties() {
  const TAG_ID = "dreamlive-tw-props";
  if (document.getElementById(TAG_ID)) return; // Idempotente

  const style = document.createElement("style");
  style.id = TAG_ID;
  // Declaramos las @property que Tailwind v4 necesita para sus utilidades.
  // Esto hace que las variables CSS de Tailwind funcionen DENTRO del Shadow DOM
  // porque las variables CSS sí se heredan a través del Shadow Boundary.
  style.textContent = `
    /* Tailwind v4 @property fallback para Shadow DOM */
    @property --tw-bg-opacity    { syntax: "<number>"; inherits: false; initial-value: 1; }
    @property --tw-text-opacity  { syntax: "<number>"; inherits: false; initial-value: 1; }
    @property --tw-border-opacity{ syntax: "<number>"; inherits: false; initial-value: 1; }
    @property --tw-shadow        { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-shadow-color  { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-ring-shadow   { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-inset-shadow  { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-blur          { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-brightness    { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-contrast      { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-grayscale     { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-hue-rotate    { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-invert        { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-opacity       { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-saturate      { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-sepia         { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-scale-x       { syntax: "<number>"; inherits: false; initial-value: 1; }
    @property --tw-scale-y       { syntax: "<number>"; inherits: false; initial-value: 1; }
    @property --tw-rotate        { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
    @property --tw-translate-x   { syntax: "<length-percentage>"; inherits: false; initial-value: 0; }
    @property --tw-translate-y   { syntax: "<length-percentage>"; inherits: false; initial-value: 0; }
    @property --tw-skew-x        { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
    @property --tw-skew-y        { syntax: "<angle>"; inherits: false; initial-value: 0deg; }
    @property --tw-backdrop-blur      { syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-backdrop-brightness{ syntax: "*"; inherits: false; initial-value: ; }
    @property --tw-backdrop-saturate  { syntax: "*"; inherits: false; initial-value: ; }

    /* Variables CSS heredables — estas SÍ cruzan el Shadow Boundary */
    :root {
      --color-apple-green:  #34C759;
      --color-primary:      #FF639B;
      --color-apple-blue:   #FF639B;
      --color-apple-purple: #AF52DE;
    }
  `;
  document.head.appendChild(style);
}

export const UiModule = {
  async mount(ctx: any) {
    // Evitar montajes dobles
    if (document.querySelector("dreamlive-backstage-panel")) return;

    // CRÍTICO: Inyectar @property de Tailwind en el Light DOM ANTES de montar
    injectTailwindProperties();

    const ui = await createShadowRootUi(ctx, {
      name: "dreamlive-backstage-panel",
      position: "inline",
      anchor: "body",
      append: "first",
      onMount: (container) => {
        // BLINDAJE DEL HOST (El puente entre TikTok y nuestro código)
        const host = (container.getRootNode() as any)?.host;
        if (host) {
          Object.assign(host.style, {
            all: 'initial',
            position: 'fixed',
            zIndex: '2147483647',
            top: '0',
            left: '0',
            width: '0',
            height: '0',
            pointerEvents: 'none',
          });
        }

        Object.assign(container.style, {
          all: 'initial',
          display: 'block',
          width: '0',
          height: '0',
          position: 'static',
          overflow: 'visible',
          pointerEvents: 'auto',
        });
        const root = ReactDOM.createRoot(container);
        root.render(<InjectedModalOrchestrator />);
        return root;
      },
    });
    ui.mount();
  },

  startAutoMount(ctx: any) {
    this.mount(ctx);
  },
};
