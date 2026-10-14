import nodemailer from "nodemailer";
// Com SMTP_HOST definido envia de verdade. Sem ele, em desenvolvimento o texto aparece no console do servidor.
export async function sendMail(to: string, subject: string, body: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    if (process.env.NODE_ENV !== "production") { console.log(`[mail:dev] para ${to} | ${subject}\n${body}`); return }
    throw new Error("Configure o envio de e-mail (SMTP_HOST, SMTP_USER, SMTP_PASS) antes de usar em produção");
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  await t.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, text: body });
}
