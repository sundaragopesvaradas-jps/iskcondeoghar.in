/**
 * Next.js may type imported images as StaticImageData ({ src, ... }).
 * CRA treated them as string URLs. Normalize for <img src=...>.
 */
export function assetSrc(image: string | { src: string }): string {
  return typeof image === 'string' ? image : image.src;
}
