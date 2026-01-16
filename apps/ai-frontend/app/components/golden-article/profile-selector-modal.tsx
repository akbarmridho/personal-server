import { Check, Loader2, Plus, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { useGoldenArticleProfile } from "~/hooks/use-golden-article-profile";
import { useReadArticles } from "~/hooks/use-read-articles";

// Predefined profiles to suggest
const PREDEFINED_PROFILES = ["Akbar", "Sarah", "Guest"] as const;

interface ProfileOption {
  name: string;
  articleCount: number;
  isLoading: boolean;
}

interface ProfileSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for selecting or creating a golden article reading profile
 * Shows predefined profiles and allows creating custom ones
 */
export function ProfileSelectorModal({
  open,
  onOpenChange,
}: ProfileSelectorModalProps) {
  const { profile, setProfile } = useGoldenArticleProfile();
  const [customProfile, setCustomProfile] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Fetch article counts for predefined profiles
  const profileOptions: ProfileOption[] = PREDEFINED_PROFILES.map((name) => {
    const { data: articleIds, isLoading } = useReadArticles(name);
    return {
      name,
      articleCount: articleIds?.length || 0,
      isLoading,
    };
  });

  const handleSelectProfile = (profileName: string) => {
    setProfile(profileName);
    onOpenChange(false);
  };

  const handleCreateProfile = async () => {
    if (!customProfile.trim()) return;

    setIsCreating(true);
    try {
      setProfile(customProfile.trim());
      onOpenChange(false);
      setCustomProfile("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customProfile.trim()) {
      handleCreateProfile();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Select Reading Profile</DialogTitle>
          </div>
          <DialogDescription>
            Choose a profile to track which articles you've read, or create a
            new one. Each profile has its own reading history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Predefined Profiles */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Existing Profiles
            </p>
            <ScrollArea className="h-[180px] pr-4">
              <div className="space-y-2">
                {profileOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleSelectProfile(option.name)}
                    disabled={option.isLoading}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        {option.isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">
                          {option.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {option.isLoading
                            ? "Loading..."
                            : `${option.articleCount} article${option.articleCount !== 1 ? "s" : ""} read`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile === option.name && (
                        <Badge
                          variant="default"
                          className="bg-primary text-primary-foreground"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Create New Profile */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Create New Profile
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter profile name..."
                  value={customProfile}
                  onChange={(e) => setCustomProfile(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isCreating}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleCreateProfile}
                disabled={!customProfile.trim() || isCreating}
                size="icon"
                variant="default"
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
