import type { MetadataRoute } from "next";
// Permite "Adicionar à tela inicial" no celular.
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Dafonte Tratores – Monitoramento", short_name: "Dafonte", start_url: "/", display: "standalone", background_color: "#000000", theme_color: "#f2b01e", icons: [{ src: "/brand/dafonte.jpg", sizes: "any", type: "image/jpeg" }] };
}
