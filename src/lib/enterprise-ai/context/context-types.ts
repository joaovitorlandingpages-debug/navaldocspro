export interface AIContextState {
  lastProcessId?: string;
  lastProcessReference?: string;
  lastCustomerId?: string;
  lastCustomerReference?: string;
  lastVesselId?: string;
  lastVesselReference?: string;
  lastDocumentIds?: string[];
  lastIntent?: string;
  lastAgentId?: string;
  lastExecutedTools?: string[];
  lastSearchResults?: any[];
  selectedResultIndex?: number;
  updatedAt: string;
}

export interface ContextResolution {
  entityType: 'process' | 'customer' | 'vessel' | 'document' | 'none';
  entityId?: string;
  confidence: number;
  source: 'direct' | 'context' | 'reference';
}
