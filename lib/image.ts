import type { AuraProject, ImageRef } from "@/lib/schema";

export function getImage(
  project: AuraProject,
  id: string | undefined,
): ImageRef | undefined {
  if (!id) return undefined;
  return project.imagery.find((i) => i.id === id);
}

export function imageUrl(
  project: AuraProject,
  id: string | undefined,
  fallbackQuery = "abstract",
): string {
  const img = getImage(project, id);
  if (img?.url) return img.url;
  return `https://picsum.photos/seed/${encodeURIComponent(
    id ?? fallbackQuery,
  )}/1600/900`;
}

export function aspectClass(aspect?: ImageRef["aspect"]): string {
  switch (aspect) {
    case "1/1":
      return "aspect-square";
    case "4/3":
      return "aspect-[4/3]";
    case "3/4":
      return "aspect-[3/4]";
    case "9/16":
      return "aspect-[9/16]";
    case "21/9":
      return "aspect-[21/9]";
    case "16/9":
    default:
      return "aspect-[16/9]";
  }
}
