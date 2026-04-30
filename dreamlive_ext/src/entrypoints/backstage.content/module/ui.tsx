import ReactDOM from "react-dom/client";
import { BackstagePanel } from "../../../features/operations/components/BackstagePanel";

export const UiModule = {
  async mount(ctx: any) {
    // Evitar montajes dobles
    if (document.querySelector("dreamlive-backstage-panel")) return;

    const ui = await createShadowRootUi(ctx, {
      name: "dreamlive-backstage-panel",
      position: "inline",
      anchor: "body",
      append: "last",
      onMount: (container) => {
        const host = container.getRootNode() as any;
        if (host?.host)
          Object.assign(host.host.style, {
            position: "fixed",
            zIndex: "2147483647",
            top: "0",
            left: "0",
            pointerEvents: "none",
          });
        container.style.pointerEvents = "auto";
        const root = ReactDOM.createRoot(container);
        root.render(<BackstagePanel />);
        return root;
      },
    });
    ui.mount();
  },

  startAutoMount(ctx: any) {
    this.mount(ctx);
    // Reintentar montaje por si TikTok borra el DOM (SPA navigation)
    setInterval(() => this.mount(ctx), 3000);
  },
};
