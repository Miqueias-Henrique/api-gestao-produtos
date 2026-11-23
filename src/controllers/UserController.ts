import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as yup from 'yup';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendError } from './sendError';
import { sanitizeUser, UserService } from '../services/UserService';

const userService = new UserService();

export class UserController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object().shape({
        name: yup
          .string()
          .trim()
          .required('O campo nome é obrigatório!')
          .min(3, 'O campo nome deve ter no mínimo 3 caracteres!'),
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O campo e-mail é obrigatório!'),
        password: yup
          .string()
          .required('O campo senha é obrigatório!')
          .min(8, 'O campo senha deve ter no mínimo 8 caracteres!'),
        situationId: yup
          .number()
          .typeError('O campo situação deve ser um número!')
          .integer('O campo situação deve ser um número inteiro!')
          .positive('O campo situação deve ser um inteiro positivo!')
          .required('O campo situação é obrigatório!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const existingUser = await userService.findByEmail(data.email);
      if (existingUser) {
        res.status(400).json({
          error: 'Já existe um usuário cadastrado com esse e-mail.',
        });
        return;
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await userService.create({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        situationId: data.situationId,
        tipoUsuario: 'USER',
      });

      res.status(201).json(sanitizeUser(user));
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao criar usuário');
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await userService.findAll(page, limit);
      res.json({
        ...result,
        data: result.data.map(sanitizeUser),
      });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar usuários');
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      const user = await userService.findById(id);

      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      res.json(sanitizeUser(user));
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar usuário');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);

      const schema = yup.object().shape({
        name: yup
          .string()
          .trim()
          .required('O campo nome é obrigatório!')
          .min(3, 'O campo nome deve ter no mínimo 3 caracteres!'),
        email: yup
          .string()
          .trim()
          .email('E-mail inválido!')
          .required('O campo e-mail é obrigatório!'),
        situationId: yup
          .number()
          .typeError('O campo situação deve ser um número!')
          .integer('O campo situação deve ser um número inteiro!')
          .positive('O campo situação deve ser um inteiro positivo!')
          .required('O campo situação é obrigatório!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const user = await userService.findById(id);
      if (!user) {
        res.status(404).json({ error: 'Usuário não encontrado para atualizar' });
        return;
      }

      const existingUser = await userService.findByEmail(data.email, id);
      if (existingUser) {
        res.status(400).json({
          error: 'Já existe um usuário cadastrado com esse e-mail.',
        });
        return;
      }

      const updated = await userService.update(id, {
        name: data.name,
        email: data.email,
        situationId: data.situationId,
      });

      if (!updated) {
        res.status(404).json({ error: 'Usuário não encontrado para atualizar' });
        return;
      }

      const updatedUser = await userService.findById(id);
      res.json({
        message: 'Usuário atualizado com sucesso',
        user: updatedUser ? sanitizeUser(updatedUser) : undefined,
      });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao atualizar usuário');
    }
  }

  async updatePassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);

      const schema = yup.object().shape({
        password: yup
          .string()
          .required('O campo senha é obrigatório!')
          .min(8, 'A senha deve ter no mínimo 8 caracteres!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const authUser = req.user;
      if (!authUser || !Number.isInteger(authUser.id)) {
        res.status(401).json({ error: 'Usuário não autenticado!' });
        return;
      }

      const requester = await userService.findById(authUser.id);
      if (!requester) {
        res.status(401).json({ error: 'Usuário autenticado não encontrado!' });
        return;
      }

      const isSelf = authUser.id === id;
      if (!isSelf && requester.tipoUsuario !== 'ADMIN') {
        res.status(403).json({
          error: 'Você não tem permissão para alterar a senha deste usuário!',
        });
        return;
      }

      const targetUser = await userService.findById(id);
      if (!targetUser) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      await userService.update(id, { password: hashedPassword });

      res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao atualizar senha');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await userService.delete(id);

      if (!deleted) {
        res.status(404).json({ error: 'Usuário não encontrado para deletar' });
        return;
      }

      res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao deletar usuário');
    }
  }
}
