import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { UserService } from '../services/UserService';

const userService = new UserService();

export async function verifyAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authUser = req.user;

    if (!authUser || !Number.isInteger(authUser.id)) {
      res.status(401).json({ error: 'Usuário não autenticado!' });
      return;
    }

    const user = await userService.findById(authUser.id);
    if (!user) {
      res.status(401).json({ error: 'Usuário não encontrado!' });
      return;
    }

    if (user.tipoUsuario !== 'ADMIN') {
      res.status(403).json({ error: 'Acesso permitido somente para administradores!' });
      return;
    }

    next();
  } catch (error: unknown) {
    console.error('Erro ao verificar administrador:', error);
    res.status(500).json({ error: 'Erro ao verificar permissões!' });
  }
}
