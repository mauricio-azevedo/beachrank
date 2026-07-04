import { apiRequest } from '@/lib/api-client';
import type { AcceptClaimResult, ClaimOfferDetail } from '@/types/api';

// --- Recipient: read / confirm / decline the offer (legacy email-anchored claims) ---

export function getClaimOffer(token: string, stubId: string): Promise<ClaimOfferDetail> {
  return apiRequest<ClaimOfferDetail>(`/me/claims/${stubId}`, {
    token,
    cache: 'no-store',
  });
}

export function confirmClaimOffer(token: string, stubId: string): Promise<AcceptClaimResult> {
  return apiRequest<AcceptClaimResult>(`/me/claims/${stubId}/confirm`, {
    method: 'POST',
    token,
  });
}

export function declineClaimOffer(token: string, stubId: string): Promise<{ outcome: 'DECLINED' }> {
  return apiRequest(`/me/claims/${stubId}/decline`, { method: 'POST', token });
}
