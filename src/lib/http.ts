export class HttpError extends Error { constructor(public status: number, msg = "Erro") { super(msg) } }
export const fail = (e: unknown) => {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Erro interno" }, { status: 500 });
};
