import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as yup from 'yup';
import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { UserService } from '../services/UserService';
import { MailConfigError, MailService } from '../services/MailService';
import { sendError } from './sendError';

const userService = new UserService();
const mailService = new MailService();

const RECOVER_EXPIRATION_MS = 30 * 60 * 1000;

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object({
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O e-mail é obrigatório!'),
        password: yup.string().required('A senha é obrigatória!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const user = await userService.findByEmailWithSituation(data.email);
      if (!user) {
        res.status(401).json({ error: 'E-mail ou senha inválidos!' });
        return;
      }

      if (!user.situation || user.situation.nameSituation !== 'Ativo') {
        res.status(403).json({
          error: 'Usuário inativo ou pendente. Procure o administrador!',
        });
        return;
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        res.status(401).json({ error: 'E-mail ou senha inválidos!' });
        return;
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        res.status(500).json({ error: 'Chave JWT não configurada!' });
        return;
      }

      const token = jwt.sign({ id: user.id }, secret, { expiresIn: '1d' });

      res.status(200).json({
        message: 'Login realizado com sucesso!',
        token,
      });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao realizar login');
    }
  }

  async validateToken(req: AuthRequest, res: Response): Promise<void> {
    res.status(200).json({
      message: 'Token válido!',
      userId: req.user?.id,
    });
  }

  async recoverPassword(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object({
        urlRecoverPassword: yup
          .string()
          .trim()
          .url('Informe uma URL válida!')
          .required('A URL é obrigatória!'),
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O e-mail é obrigatório!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const user = await userService.findByEmail(data.email);
      if (!user) {
        res.status(200).json({
          message:
            'Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.',
        });
        return;
      }

      const recoverKey = crypto.randomBytes(32).toString('hex');
      const link = new URL(data.urlRecoverPassword);
      link.searchParams.set('email', data.email);
      link.searchParams.set('key', recoverKey);

      await mailService.sendRecoverPasswordEmail(data.email, user.name, link.toString());

      user.recoverPassword = recoverKey;
      user.recoverPasswordExpiresAt = new Date(Date.now() + RECOVER_EXPIRATION_MS);
      await userService.save(user);

      res.status(200).json({
        message: 'E-mail enviado! Verifique sua caixa de entrada!',
      });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      if (error instanceof MailConfigError) {
        res.status(500).json({ error: error.message });
        return;
      }
      sendError(res, error, 'Erro ao gerar ou enviar o link de recuperação');
    }
  }

  async validateRecoverPassword(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object({
        recoverPassword: yup
          .string()
          .trim()
          .required('A chave de recuperação é obrigatória!'),
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O e-mail é obrigatório!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const user = await userService.findByRecoverKey(data.email, data.recoverPassword);
      if (!user) {
        res.status(404).json({
          error: 'A chave de recuperação é inválida ou já foi utilizada!',
        });
        return;
      }

      if (
        !user.recoverPasswordExpiresAt ||
        user.recoverPasswordExpiresAt.getTime() < Date.now()
      ) {
        user.recoverPassword = null;
        user.recoverPasswordExpiresAt = null;
        await userService.save(user);

        res.status(400).json({
          error: 'A chave de recuperação expirou! Solicite uma nova.',
        });
        return;
      }

      res.status(200).json({ message: 'A chave de recuperação é válida!' });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao validar a chave de recuperação');
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object({
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O e-mail é obrigatório!'),
        key: yup
          .string()
          .trim()
          .required('A chave de recuperação é obrigatória!'),
        password: yup
          .string()
          .min(8, 'A senha deve ter pelo menos 8 caracteres!')
          .required('A nova senha é obrigatória!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const user = await userService.findByRecoverKey(data.email, data.key);
      if (!user) {
        res.status(400).json({
          error: 'Link de recuperação inválido ou já utilizado!',
        });
        return;
      }

      if (
        !user.recoverPasswordExpiresAt ||
        user.recoverPasswordExpiresAt.getTime() <= Date.now()
      ) {
        user.recoverPassword = null;
        user.recoverPasswordExpiresAt = null;
        await userService.save(user);

        res.status(400).json({
          error: 'Link de recuperação expirado! Solicite uma nova recuperação.',
        });
        return;
      }

      user.password = await bcrypt.hash(data.password, 10);
      user.recoverPassword = null;
      user.recoverPasswordExpiresAt = null;
      await userService.save(user);

      res.status(200).json({ message: 'Senha alterada com sucesso!' });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao alterar a senha');
    }
  }
}
