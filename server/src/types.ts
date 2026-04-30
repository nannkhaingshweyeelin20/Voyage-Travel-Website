export type UserRole = 'user' | 'admin';

export interface SessionUser {
  id: number;
  role: UserRole;
}

export interface SafeUser {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone: string | null;
  profileImage: string | null;
  createdAt: string;
}

export interface UserRecord extends SafeUser {
  passwordHash: string;
  updatedAt?: string;
  isActive?: boolean;
  name?: string;
}
