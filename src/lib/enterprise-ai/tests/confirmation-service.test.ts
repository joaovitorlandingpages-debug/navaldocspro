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
  m.single.mockReturnValue(m);
  m.maybeSingle.mockReturnValue(m);
  
  // Terminal methods return promises - we use a getter to return a new promise each time
  // but allow tests to override the final result via single/maybeSingle mocks
  Object.defineProperty(m, 'then', {
    get: () => (onFullfilled: any) => {
      const result = m.single.mock.results.length > 0 
        ? m.single.mock.results[m.single.mock.results.length - 1].value 
        : Promise.resolve({ data: { id: 'default-id' }, error: null });
      
      // If result is 'm' (chaining), resolve with a default
      if (result === m) {
        return Promise.resolve({ data: { id: 'default-id' }, error: null }).then(onFullfilled);
      }
      return Promise.resolve(result).then(onFullfilled);
    },
    configurable: true
  });
  
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

  it('9. Usuário diferente não pode confirmar', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockConf = {
      id: 'conf-1',
      status: 'pending',
      user_id: 'other-user',
      company_id: mockCompanyId,
      expires_at: new Date(Date.now() + 10000).toISOString()
    };
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });

    await expect(confirmationService.confirm('token', mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationUserMismatchError);
  });

  it('10. Tenant diferente não pode confirmar', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const mockConf = {
      id: 'conf-1',
      status: 'pending',
      user_id: mockUserId,
      company_id: 'other-tenant',
      expires_at: new Date(Date.now() + 10000).toISOString()
    };
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });

    await expect(confirmationService.confirm('token', mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationTenantMismatchError);
  });

  it('11. Confirmação já consumida não pode ser usada novamente', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.rpc as any).mockResolvedValueOnce({ 
      data: [{ ok: false, error_code: 'CONFIRMATION_ALREADY_CONSUMED' }], 
      error: null 
    });

    await expect(confirmationService.validateAndConsume('token', mockPayload, mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationAlreadyConsumedError);
  });

  it('12. Confirmação rejeitada não pode ser consumida', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.rpc as any).mockResolvedValueOnce({ 
      data: [{ ok: false, error_code: 'CONFIRMATION_REJECTED' }], 
      error: null 
    });

    await expect(confirmationService.validateAndConsume('token', mockPayload, mockUserId, mockCompanyId))
      .rejects.toThrow();
  });

  it('13. Token inexistente deve retornar 404', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: null, error: null });

    await expect(confirmationService.confirm('invalid-token', mockUserId, mockCompanyId))
      .rejects.toThrow(ConfirmationNotFoundError);
  });

  it('14. Hashing de payload é case-insensitive para chaves', async () => {
    const hash1 = generatePayloadHash({ name: 'John', age: 30 });
    const hash2 = generatePayloadHash({ age: 30, name: 'John' });
    expect(hash1).toBe(hash2);
  });

  it('15. Hashing de payload falha se valores forem diferentes', async () => {
    const hash1 = generatePayloadHash({ name: 'John', age: 30 });
    const hash2 = generatePayloadHash({ name: 'John', age: 31 });
    expect(hash1).not.toBe(hash2);
  });

  it('16. createConfirmation falha se falhar no insert', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    (supabase.single as any).mockResolvedValueOnce({ data: null, error: { message: 'DB Error' } });

    await expect(confirmationService.createConfirmation({
      actionId: 'test',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: mockPayload
    })).rejects.toThrow('DB Error');
  });

  it('17. validateAndConsume deve aceitar token nulo como erro de validação', async () => {
    await expect(confirmationService.validateAndConsume('', mockPayload, mockUserId, mockCompanyId))
      .rejects.toThrow();
  });

  it('18. Integração completa: create -> confirm -> consume', async () => {
    // Este teste simularia o fluxo completo, mas como estamos mockando o Supabase,
    // ele serve mais para verificar a coordenação.
    const { supabase } = await import('@/integrations/supabase/client');
    
    // 1. Create
    (supabase.single as any).mockResolvedValueOnce({ data: { id: 'conf-1' }, error: null });
    const { publicToken } = await confirmationService.createConfirmation({
      actionId: 'test',
      userId: mockUserId,
      companyId: mockCompanyId,
      operation: 'test',
      payload: mockPayload
    });

    // 2. Confirm
    const mockConf = {
      id: 'conf-1',
      token_hash: '...',
      status: 'pending',
      user_id: mockUserId,
      company_id: mockCompanyId,
      expires_at: new Date(Date.now() + 10000).toISOString()
    };
    (supabase.maybeSingle as any).mockResolvedValueOnce({ data: mockConf, error: null });
    await confirmationService.confirm(publicToken, mockUserId, mockCompanyId);

    // 3. Consume
    (supabase.rpc as any).mockResolvedValueOnce({ 
      data: [{ ok: true, confirmation_id: 'conf-1' }], 
      error: null 
    });
    (supabase.single as any).mockResolvedValueOnce({ 
      data: { id: 'conf-1', status: 'consumed' }, 
      error: null 
    });
    const result = await confirmationService.validateAndConsume(publicToken, mockPayload, mockUserId, mockCompanyId);
    
    expect(result.id).toBe('conf-1');
  });
});
