import { useHubUrl } from "@/widgets/use-hub-url";

export function useArtworkUrl(picture: string | undefined): string | null {
  return useHubUrl(picture);
}
