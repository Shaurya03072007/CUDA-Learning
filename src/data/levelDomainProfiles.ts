// Unified Level Domain Profiles Provider for Levels 1 to 36
import { LevelDomainProfile, PROFILES_PART_1 } from './levelDomainProfiles1';
import { PROFILES_PART_2 } from './levelDomainProfiles2';

export type { LevelDomainProfile };

export const LEVEL_DOMAIN_PROFILES: Record<number, LevelDomainProfile> = {
  ...PROFILES_PART_1,
  ...PROFILES_PART_2,
};

export function getLevelDomainProfile(levelNumber: number): LevelDomainProfile {
  if (LEVEL_DOMAIN_PROFILES[levelNumber]) {
    return LEVEL_DOMAIN_PROFILES[levelNumber];
  }
  // Fallback if an unexpected level number is passed
  return LEVEL_DOMAIN_PROFILES[1];
}
