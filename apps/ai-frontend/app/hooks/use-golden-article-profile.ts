import { useState } from "react";

const PROFILE_STORAGE_KEY = "golden-article-profile";

/**
 * Hook for managing the current golden article profile stored in localStorage.
 * The profile name is used to track which articles have been read per user.
 */
export function useGoldenArticleProfile() {
  const [profile, setProfileState] = useState<string | null>(() => {
    // SSR-safe check
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PROFILE_STORAGE_KEY);
  });

  const setProfile = (newProfile: string) => {
    localStorage.setItem(PROFILE_STORAGE_KEY, newProfile);
    setProfileState(newProfile);
  };

  const clearProfile = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfileState(null);
  };

  return {
    profile,
    setProfile,
    clearProfile,
    hasProfile: !!profile,
  };
}
