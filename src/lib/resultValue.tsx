import { ImagePreview } from "@/components/ui/ImagePreview";
import { isImageUrl } from "@/lib/isImageUrl";

/** Renders a Response-node result value as an image when it's an image URL, otherwise as text. Returns undefined (not an element) for nullish values, so callers passing this straight as OutputBox children get its "No output yet" placeholder for free. */
export function resultValue(value: unknown) {
  if (value == null) return undefined;
  return isImageUrl(value) ? (
    <ImagePreview src={value} className="mx-auto h-32 rounded object-contain" />
  ) : (
    <p className="whitespace-pre-wrap">{String(value)}</p>
  );
}
