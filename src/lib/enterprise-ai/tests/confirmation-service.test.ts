import { describe, it, expect, vi, beforeEach } from 'vitest';
import { confirmationService } from '../actions/confirmation/confirmation-service';
import { generatePayloadHash } from '../actions/confirmation/payload-hash';
import { ConfirmationStatus } from '../actions/confirmation/confirmation-types';
import { 
  ConfirmationNotFoundError, 
  ConfirmationExpiredError,
  ConfirmationUserMismatchError,
  ConfirmationTenantMismatchError,
  ConfirmationPayloadMismatchError,
  ConfirmationAlreadyConsumedError
} from '../actions/confirmation/confirmation-errors';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => {
  const m = {
    single: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    from: vi.fn(),
    rpc: vi.fn(),
    maybeSingle: vi.fn()
  };
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.insert.mockReturnValue(m);
  m.update.mockReturnValue(m);
  m.eq.mockReturnValue(m);
  m.maybeSingle.mockReturnValue(Promise.resolve({ data: null, error: null }));
  return { supabase: m };
});

describe('ConfirmationService (Sprint 5.0.1)', () => {
  const mockUserId = 'user-123';
  const mockCompanyId = 'company-456';
  const mockPayload = { action: 'test', id: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Token deve ser criptograficamente aleatório e ter entropia suficiente', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.single as any).mockResolvedValueOnce({ data: { id: 'conf-1' }, error: null });

    const res1 = await confirmationService.createConfirmation({
      actionId: 'test-action',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: mockPayload
    });

    const res2 = await confirmationService.createConfirmation({
      actionId: 'test-action',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: mockPayload
    });

    expect(res1.publicToken).toBeDefined();
    expect(res1.publicToken.length).toBeGreaterThan(32);
    expect(res1.publicToken).not.toBe(res2.publicToken);
  });

  it('2. Token não deve ser armazenado em texto puro (deve ser hash)', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.single as any).mockResolvedValueOnce({ data: { id: 'conf-1' }, error: null });

    const { publicToken } = await confirmationService.createConfirmation({
      actionId: 'test-action',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: mockPayload
    });

    const insertCall = (supabase.insert as any).mock.calls[0][0];
    expect(insertCall.token_hash).toBeDefined();
    expect(insertCall.token_hash).not.toBe(publicToken);
    expect(insertCall.token_hash.length).toBe(64); // SHA-256 hex
  });

  it('3. Payload hash deve ser persistido determinísticamente', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.single as any).mockResolvedValueOnce({ data: { id: 'conf-1' }, error: null });

    const payload = { b: 2, a: 1 }; // Unsorted
    await confirmationService.createConfirmation({
      actionId: 'test-action',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: payload
    });

    const hash1 = (supabase.insert as any).mock.calls[0][0].payload_hash;
    const hash2 = generatePayloadHash({ a: 1, b: 2 }); // Sorted
    expect(hash1).toBe(hash2);
  });

  it('4. Confirmação válida altera status para confirmed', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockConf = {
      id: 'conf-1',
      token_hash: 'hash-1',
      status: 'pending',
      user_id: mockUserId,
      company_id: mockCompanyId,
      expires_at: new Date(Date.now() + 10000).toISOString()
    };
    
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });
    (supabase.update as any).mockReturnThis();
    
    await confirmationService.confirm('public-token', mockUserId, mockCompanyId);

    const updateCall = (supabase.update as any).mock.calls[0][0];
    expect(updateCall.status).toBe(ConfirmationStatus.CONFIRMED);
    expect(updateCall.confirmed_at).toBeDefined();
  });

  it('5. Rejeição válida altera status para rejected', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockConf = {
      id: 'conf-1',
      token_hash: 'hash-1',
      status: 'pending',
      user_id: mockUserId,
      company_id: mockCompanyId,
      expires_at: new Date(Date.now() + 10000).toISOString()
    };
    
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });
    
    await confirmationService.reject('public-token', mockUserId, mockCompanyId);

    const updateCall = (supabase.update as any).mock.calls[0][0];
    expect(updateCall.status).toBe(ConfirmationStatus.REJECTED);
    expect(updateCall.rejected_at).toBeDefined();
  });

  it('6. Token expirado deve lançar erro e atualizar status', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockConf = {
      id: 'conf-1',
      status: 'pending',
      user_id: mockUserId,
      company_id: mockCompanyId,
      expires_at: new Date(Date.now() - 10000).toISOString() // Expired
    };
    
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });
    
    await expect(confirmationService.confirm('token', mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationExpiredError);

    const updateCall = (supabase.update as any).mock.calls[0][0];
    expect(updateCall.status).toBe(ConfirmationStatus.EXPIRED);
  });

  it('7. validateAndConsume utiliza RPC para atomicidade', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.rpc as any).mockResolvedValueOnce({ 
      data: [{ ok: true, confirmation_id: 'conf-1' }], 
      error: null 
    });
    (supabase.single as any).mockResolvedValueOnce({ 
      data: { id: 'conf-1', status: 'consumed' }, 
      error: null 
    });

    await confirmationService.validateAndConsume('token', mockPayload, mockUserId, mockCompanyId);

    expect(supabase.rpc).toHaveBeenCalledWith('consume_ai_action_confirmation', expect.any(Object));
  });

  it('8. validateAndConsume lança erro se RPC retornar erro', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.rpc as any).mockResolvedValueOnce({ 
      data: [{ ok: false, error_code: 'CONFIRMATION_PAYLOAD_MISMATCH' }], 
      error: null 
    });

    await expect(confirmationService.validateAndConsume('token', mockPayload, mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationPayloadMismatchError);
  });
});
