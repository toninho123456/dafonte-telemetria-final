import Tracker from "./Tracker";
export const metadata = { title: "Rastreador pelo celular – Dafonte" };
export default function Page() {
  return (<main className="mx-auto grid max-w-md gap-4 p-4"><h1 className="text-xl font-bold">Rastreador pelo celular</h1>
    <p className="text-sm text-zinc-400">Use o GPS deste aparelho como se fosse o dispositivo do trator. Cadastre o dispositivo em <b>Dispositivos</b>, vincule a um trator, gere a chave e preencha abaixo. Precisa de HTTPS e da permissão de localização. Deixe esta tela aberta e o aparelho desbloqueado.</p>
    <Tracker /></main>);
}
