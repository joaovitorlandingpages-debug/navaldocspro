/**
 * Feature Flags Configuration
 */
export const FEATURE_FLAGS = {
  ENTERPRISE_AI_COMMAND_CENTER_ENABLED: true,
  // Add other flags here
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  // In a real app, this could check process.env or a remote config service
  return FEATURE_FLAGS[flag];
}
