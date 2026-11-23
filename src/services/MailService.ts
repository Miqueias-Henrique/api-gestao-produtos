import nodemailer from 'nodemailer';

export class MailConfigError extends Error {
  constructor() {
    super('As configurações do servidor de e-mail estão incompletas!');
    this.name = 'MailConfigError';
  }
}

export class MailService {
  async sendRecoverPasswordEmail(to: string, userName: string, link: string): Promise<void> {
    const host = process.env.EMAIL_HOST;
    const port = process.env.EMAIL_PORT;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;
    const from = process.env.EMAIL_FROM;

    if (!host || !port || !user || !pass || !from) {
      throw new MailConfigError();
    }

    const appName = process.env.APP || 'WEB II API';

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: `Recuperação de senha - ${appName}`,
      text: `Prezado(a) ${userName},\n\nRecebemos sua solicitação de recuperação de senha.\n\nAcesse o link abaixo para cadastrar uma nova senha:\n\n${link}\n\nAtenciosamente,\n${appName}`,
      html: `
        <p>Prezado(a) ${userName},</p>
        <p>Recebemos sua solicitação de recuperação de senha.</p>
        <p><a href="${link}">Clique aqui para cadastrar uma nova senha</a></p>
        <p>Atenciosamente,<br>${appName}</p>
      `,
    });
  }
}
