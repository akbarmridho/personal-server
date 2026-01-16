import { Check, Sparkles, User } from "lucide-react";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { useProfile } from "~/contexts/profile-context";

// Predefined profiles to suggest
const PREDEFINED_PROFILES = ["Akbar", "Razzan", "Awe", "Guest"] as const;

interface ProfileSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for selecting or creating a reading profile
 * Shows predefined profiles with app-wide read tracking support
 */
export function ProfileSelectorModal({
  open,
  onOpenChange,
}: ProfileSelectorModalProps) {
  const { profile, setProfile } = useProfile();

  const handleSelectProfile = (profileName: string) => {
    setProfile(profileName);
    onOpenChange(false);
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
            Choose a profile to track your reading progress across the app. Each
            profile maintains its own reading history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Profile List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Select Profile
            </p>
            <ScrollArea className="h-[240px] pr-4">
              <div className="space-y-2">
                {PREDEFINED_PROFILES.map((name) => (
                  <button
                    key={name}
                    onClick={() => handleSelectProfile(name)}
                    type="button"
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent/50 hover:border-accent transition-all group hover:cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {profile === name && (
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
