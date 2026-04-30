import { NextFunction, Request, Response } from 'express';
import { findUserById, toSafeUser } from './userRepository';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const user = await findUserById(req.session.user.id);
  if (!user || !user.isActive) {
    req.session.destroy(() => undefined);
    return res.status(401).json({ message: 'Session is no longer valid.' });
  }

  req.authUser = toSafeUser(user);
  return next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.authUser || req.authUser.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
}
