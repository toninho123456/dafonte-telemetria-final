const FIELDS = [["name", "Nome do trator", "text", true], ["brand", "Marca", "text", true], ["model", "Modelo", "text", true], ["year", "Ano", "number", false], ["serial", "Número de série", "text", false], ["hours", "Horímetro (h)", "number", false], ["farm", "Fazenda/propriedade", "text", false], ["operator", "Operador", "text", false]] as const;
type D = Record<string, string | number | null | undefined>;
export default function TractorForm({ action, t, devices, submit }: { action: (fd: FormData) => Promise<void>; t?: D; devices?: { id: string; deviceId: string }[]; submit: string }) {
  return (
    <form action={action} className="grid max-w-xl gap-3 sm:grid-cols-2">
      {FIELDS.map(([n, l, ty, req]) => (
        <label key={n} className="flex flex-col gap-1 text-sm text-zinc-400">{l}
          <input className="input text-zinc-100" name={n} type={ty} step={n === "hours" ? "0.1" : undefined} defaultValue={t?.[n] ?? ""} required={req} />
        </label>
      ))}
      {devices && (
        <label className="flex flex-col gap-1 text-sm text-zinc-400 sm:col-span-2">Dispositivo de telemetria
          <select className="input text-zinc-100" name="deviceId" defaultValue=""><option value="">Sem dispositivo (vincular depois)</option>{devices.map((d) => <option key={d.id} value={d.id}>{d.deviceId}</option>)}</select>
        </label>
      )}
      {!t && <label className="flex flex-col gap-1 text-sm text-zinc-400 sm:col-span-2">Foto do trator (JPG, PNG ou WebP, até 5 MB)<input className="input text-zinc-100" type="file" name="photo" accept="image/jpeg,image/png,image/webp" /></label>}
      <label className="flex flex-col gap-1 text-sm text-zinc-400 sm:col-span-2">Observações<textarea className="input text-zinc-100" name="notes" rows={3} maxLength={500} defaultValue={t?.notes ?? ""} /></label>
      <button className="btn sm:col-span-2">{submit}</button>
    </form>
  );
}
