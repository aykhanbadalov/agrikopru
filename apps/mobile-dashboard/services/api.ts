import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../constants/config';

export type ScoreResult = {
  score: number;
  risk_band: 'LOW' | 'MEDIUM' | 'HIGH';
  credit_limit_tl: number | null;
  model_version: string;
  repayment_probability: number;
  feature_contributions: Record<string, number>;
};

export type Farmer = {
  id: string;
  full_name: string;
  phone: string;
  cooperative_member: boolean;
  farming_history_years?: number | null;
  land_size_ha?: number | null;
  region?: string | null;
  latest_score: ScoreResult | null;
};

export type Contract = {
  id: string;
  farmer_id: string;
  buyer_name: string;
  product_type: string;
  quantity_kg: number;
  price_per_kg: number;
  total_value_tl: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  signed_at: string | null;
  created_at: string;
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || 'Hata'), { status: res.status });
  return body as T;
}

export function getFarmers(limit = 50): Promise<Farmer[]> {
  return apiFetch<Farmer[]>(`/api/farmers?limit=${limit}`);
}

export function getFarmerByPhone(phone: string): Promise<Farmer> {
  return apiFetch<Farmer>(`/api/farmers?phone=${encodeURIComponent(phone)}`);
}

export function getFarmer(id: string): Promise<Farmer> {
  return apiFetch<Farmer>(`/api/farmers/${id}`);
}

export function getContracts(params: {
  farmer_id?: string;
  buyer_name?: string;
  status?: string;
}): Promise<Contract[]> {
  const q = new URLSearchParams();
  if (params.farmer_id) q.set('farmer_id', params.farmer_id);
  if (params.buyer_name) q.set('buyer_name', params.buyer_name);
  if (params.status) q.set('status', params.status);
  return apiFetch<Contract[]>(`/api/contracts?${q.toString()}`);
}

export function sendConfirmOtp(
  contractId: string,
  farmerId: string,
): Promise<{ demoCode: string }> {
  return apiFetch<{ demoCode: string }>(`/api/contracts/${contractId}/send-confirm-otp`, {
    method: 'POST',
    body: JSON.stringify({ farmer_id: farmerId }),
  });
}

export function confirmContract(
  contractId: string,
  farmer_id: string,
  code: string,
): Promise<Contract> {
  return apiFetch<Contract>(`/api/contracts/${contractId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ farmer_id, code }),
  });
}

export function sendCreateOtp(buyerPhone: string): Promise<{ demoCode: string }> {
  return apiFetch<{ demoCode: string }>('/api/contracts/send-create-otp', {
    method: 'POST',
    body: JSON.stringify({ buyer_phone: buyerPhone }),
  });
}

export function createContract(body: {
  farmer_id: string;
  buyer_name: string;
  product_type: string;
  quantity_kg: number;
  price_per_kg: number;
  buyer_phone: string;
  code: string;
}): Promise<Contract> {
  return apiFetch<Contract>('/api/contracts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export type ScoreHistoryPoint = {
  score: number;
  risk_band: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
};

export function getScoreHistory(farmerId: string): Promise<ScoreHistoryPoint[]> {
  return apiFetch<ScoreHistoryPoint[]>(`/api/farmers/${farmerId}/score-history`);
}

export type Buyer = {
  id: string;
  company_name: string;
  phone: string;
  created_at: string;
};

export type Session = {
  role: 'farmer' | 'buyer';
  user: Farmer | Buyer;
};

export type RegistrationPending = {
  requiresVerification: true;
  phone: string;
  role: 'farmer' | 'buyer';
  demoCode: string;
};

export function authLogin(phone: string, password: string): Promise<Session> {
  return apiFetch<Session>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });
}

export function authRegister(payload: Record<string, unknown>): Promise<RegistrationPending> {
  return apiFetch<RegistrationPending>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function authVerifyRegistration(
  phone: string,
  role: string,
  code: string,
): Promise<Session> {
  return apiFetch<Session>('/api/auth/verify-registration', {
    method: 'POST',
    body: JSON.stringify({ phone, role, code }),
  });
}

export function authResendOtp(phone: string, role: string): Promise<{ demoCode: string }> {
  return apiFetch<{ demoCode: string }>('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ phone, role }),
  });
}

export function authChangePassword(
  phone: string,
  role: string,
  old_password: string,
  new_password: string,
): Promise<void> {
  return apiFetch<void>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ phone, role, old_password, new_password }),
  });
}

export type CKSExtractResult = {
  land_size_ha: number | null;
  parcel_no: string | null;
  confidence: number;
  warning: string | null;
  source: 'ocr_extracted';
  national_id?: string | null;
  full_name?: string | null;
  birth_date?: string | null;
  settlement?: string | null;
  phone?: string | null;
};

export async function authRegisterMultipart(
  fields: Record<string, string>,
  cksFileUri: string,
): Promise<RegistrationPending> {
  const result = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/auth/register`,
    cksFileUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'cks_document',
      parameters: fields,
    }
  );
  const body = JSON.parse(result.body);
  if (result.status < 200 || result.status >= 300) {
    throw Object.assign(new Error(body.error || 'Hata'), { status: result.status });
  }
  return body as RegistrationPending;
}

export function getCKSDocument(farmerId: string): Promise<{ url: string }> {
  return apiFetch<{ url: string }>(`/api/farmers/${farmerId}/cks-document`);
}

export async function extractCKS(imageUri: string): Promise<CKSExtractResult> {
  const result = await FileSystem.uploadAsync(
    `${API_BASE_URL}/api/ocr/extract-cks`,
    imageUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
    }
  );
  const body = JSON.parse(result.body);
  if (result.status < 200 || result.status >= 300) {
    throw Object.assign(new Error(body.error || 'OCR hatası'), { status: result.status });
  }
  return body as CKSExtractResult;
}
