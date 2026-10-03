import "./globals.css";
export const viewport = { themeColor: "#000000" };
export const metadata = { title: "Dafonte Tratores – Monitoramento e Telemetria" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
