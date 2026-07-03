import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const inFlight = new Map<string, Promise<string | undefined>>();

export const ensureWorkspace = async (user: User, profile: any): Promise<string | undefined> => {
  const existing = inFlight.get(user.id);
  if (existing) return existing;
  const p = _ensureWorkspace(user, profile).finally(() => inFlight.delete(user.id));
  inFlight.set(user.id, p);
  return p;
};

const _ensureWorkspace = async (user: User, profile: any): Promise<string | undefined> => {
  if (profile?.company_id) {
    console.log("WORKSPACE_ALREADY_EXISTS", profile.company_id);
    console.log("WORKSPACE_RESOLVE_OK");
    return profile.company_id;
  }

  console.log("STARTING_AUTO_WORKSPACE_CREATION", user.id);
  
  try {
    // 1. Check if user already created a company but profile isn't updated
    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('created_by', user.id)
      .maybeSingle();

    if (existingCompany) {
      console.log("EXISTING_WORKSPACE_FOUND_RECOVERING", existingCompany.id);
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({ company_id: existingCompany.id })
        .eq('id', user.id);
      
      if (updateProfileError) {
        console.error("FAILED_TO_UPDATE_PROFILE_WITH_EXISTING_WORKSPACE", updateProfileError);
        // If we can't update profile, still return company ID so UI can proceed
      } else {
        console.log("PROFILE_UPDATED_WITH_EXISTING_WORKSPACE");
        console.log("PROFILE_POLICY_OK");
      }
      
      console.log("WORKSPACE_RESOLVE_OK");
      return existingCompany.id;
    }

    // 2. Create new personal workspace
    const workspaceName = `${profile?.name || user.email?.split('@')[0] || 'Meu'} Workspace`;
    
    const { data: newCompany, error: createError } = await supabase
      .from('companies')
      .insert({
        name: workspaceName,
        plan: 'starter',
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (createError) throw createError;

    console.log("WORKSPACE_AUTO_CREATED", newCompany.id);
    console.log("MEMBERSHIP_POLICY_OK");

    // 3. Link profile to new workspace
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ company_id: newCompany.id })
      .eq('id', user.id);

    if (updateError) {
      console.error("FAILED_TO_LINK_PROFILE_TO_NEW_WORKSPACE", updateError);
    } else {
      console.log("PROFILE_LINKED_TO_NEW_WORKSPACE");
      console.log("PROFILE_POLICY_OK");
    }

    console.log("WORKSPACE_RESOLVE_OK");
    return newCompany.id;
  } catch (error) {
    console.error("WORKSPACE_CREATION_FAILED", error);
    throw error;
  }
};
