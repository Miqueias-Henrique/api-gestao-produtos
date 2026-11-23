import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: { id: number };
}

export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Token inválido ou expirado!' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    res.status(401).json({ error: 'Formato do token inválido! Utilize Bearer TOKEN.' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Chave secreta JWT não configurada!' });
    return;
  }

  try {
    const decoded = jwt.verify(parts[1], secret);

    if (typeof decoded === 'string' || typeof decoded.id !== 'number') {
      res.status(401).json({ error: 'Token inválido ou expirado!' });
      return;
    }

    req.user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado!' });
  }
}
