export type Role = 'admin' | 'nurse';
export type Status = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  status: Status;
  name: string | null;
  birthday: string | null;
  gender: string | null;
  address: string | null;
  created_at: string;
}

export interface AuthProfile {
  session: any;
  user: any;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
}
