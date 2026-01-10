import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { getSubsectors } from "~/lib/api/knowledge";
import type { SubsectorOption } from "~/lib/api/types";

/**
 * Hook to fetch available subsectors for filtering
 */
export function useSubsectors(): UseQueryResult<SubsectorOption[], Error> {
  return useQuery({
    queryKey: ["subsectors"],
    queryFn: async () => {
      const taxonomy = await getSubsectors();
      const subsectorList = taxonomy
        .flatMap((sector) => sector.subsectors)
        .map((sub) => ({
          value: sub.name,
          label: sub.name
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      // Remove duplicates just in case
      return Array.from(
        new Map(subsectorList.map((item) => [item.value, item])).values(),
      );
    },
    staleTime: 1000 * 60 * 60, // 1 hour - sectors don't change often
  });
}
