import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

const PROFILE_STORAGE_KEY = "app-profile";
const PROFILE_MODAL_SHOWN_KEY = "app-profile-modal-shown";

interface ProfileContextValue {
  profile: string | null;
  setProfile: (newProfile: string) => void;
  clearProfile: () => void;
  hasProfile: boolean;
  shouldShowModal: boolean;
  dismissModal: () => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined,
);

interface ProfileProviderProps {
  children: ReactNode;
}

/**
 * Profile Provider with React Query cache invalidation
 * Manages app-wide user profile for read tracking across all features
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const queryClient = useQueryClient();

  // Initialize profile from localStorage (SSR-safe)
  const [profile, setProfileState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PROFILE_STORAGE_KEY);
  });

  // Check if modal has been shown in this session
  const [modalShown, setModalShown] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(PROFILE_MODAL_SHOWN_KEY) === "true";
  });

  // Determine if modal should be shown (first visit, no profile, not dismissed)
  const shouldShowModal = !profile && !modalShown;

  /**
   * Set profile with cache invalidation
   * Invalidates all profile-dependent queries (read articles, timeline)
   */
  const setProfile = (newProfile: string) => {
    const oldProfile = profile;

    // Update localStorage and state
    localStorage.setItem(PROFILE_STORAGE_KEY, newProfile);
    setProfileState(newProfile);

    // Mark modal as shown
    if (typeof window !== "undefined") {
      sessionStorage.setItem(PROFILE_MODAL_SHOWN_KEY, "true");
    }
    setModalShown(true);

    // Invalidate caches if profile actually changed
    if (oldProfile !== newProfile) {
      // Clear read articles cache for both old and new profiles
      queryClient.invalidateQueries({
        queryKey: ["golden-article-reads"],
      });

      // Clear timeline queries to refetch with new profile context
      queryClient.invalidateQueries({
        queryKey: ["timeline"],
      });

      // Clear document queries
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    }
  };

  /**
   * Clear profile and reset caches
   */
  const clearProfile = () => {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setProfileState(null);

    // Clear all profile-dependent caches
    queryClient.invalidateQueries({
      queryKey: ["golden-article-reads"],
    });
    queryClient.invalidateQueries({
      queryKey: ["timeline"],
    });
  };

  /**
   * Dismiss modal without setting profile
   */
  const dismissModal = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(PROFILE_MODAL_SHOWN_KEY, "true");
    }
    setModalShown(true);
  };

  // Sync profile across tabs (listen to localStorage changes)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PROFILE_STORAGE_KEY) {
        const newProfile = e.newValue;
        setProfileState(newProfile);

        // Invalidate caches when profile changes from another tab
        queryClient.invalidateQueries({
          queryKey: ["golden-article-reads"],
        });
        queryClient.invalidateQueries({
          queryKey: ["timeline"],
        });
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [queryClient]);

  const value: ProfileContextValue = {
    profile,
    setProfile,
    clearProfile,
    hasProfile: !!profile,
    shouldShowModal,
    dismissModal,
  };

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

/**
 * Hook to access profile context
 * @throws Error if used outside ProfileProvider
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}
