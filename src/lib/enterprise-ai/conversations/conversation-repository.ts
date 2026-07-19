import { supabase } from "@/integrations/supabase/client";
import { 
  AIConversation, 
  AIConversationMessage, 
  CreateConversationParams, 
  AppendMessageParams 
} from "./conversation-types";

export class ConversationRepository {
  async createConversation(companyId: string, userId: string, params: CreateConversationParams): Promise<AIConversation> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        company_id: companyId,
        user_id: userId,
        title: params.title || 'Nova conversa',
        status: 'active',
        context_state: {}
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapConversation(data);
  }

  async listConversations(companyId: string, userId: string): Promise<AIConversation[]> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('company_id', companyId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data.map(this.mapConversation);
  }

  async getConversation(id: string, companyId: string): Promise<AIConversation | null> {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return this.mapConversation(data);
  }

  async getMessages(conversationId: string, companyId: string, limit = 50): Promise<AIConversationMessage[]> {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data.map(this.mapMessage);
  }

  async appendMessage(companyId: string, userId: string, params: AppendMessageParams): Promise<AIConversationMessage> {
    const { data, error } = await supabase
      .from('ai_conversation_messages')
      .insert({
        conversation_id: params.conversationId,
        company_id: companyId,
        user_id: userId,
        role: params.role,
        content: params.content,
        intent: params.intent,
        agent_id: params.agentId,
        execution_id: params.executionId,
        tool_calls: params.toolCalls || [],
        references: params.references || [],
        metadata: params.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation timestamp
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.conversationId);

    return this.mapMessage(data);
  }

  async updateContextState(id: string, companyId: string, state: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('ai_conversations')
      .update({ 
        context_state: state,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;
  }

  private mapConversation(row: any): AIConversation {
    return {
      id: row.id,
      companyId: row.company_id,
      userId: row.user_id,
      title: row.title,
      status: row.status,
      summary: row.summary,
      contextState: row.context_state,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapMessage(row: any): AIConversationMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      companyId: row.company_id,
      userId: row.user_id,
      role: row.role,
      content: row.content,
      intent: row.intent,
      agentId: row.agent_id,
      executionId: row.execution_id,
      toolCalls: row.tool_calls,
      references: row.references,
      metadata: row.metadata,
      createdAt: row.created_at
    };
  }
}
