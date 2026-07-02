export interface PercentBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Converts a 0-100 percentage crop box into pixel coordinates against the
 * real probed image dimensions. width/height are clamped to a minimum of 1px
 * — a 0-width/height crop isn't a valid ffmpeg `crop` filter argument.
 */
export function percentBoxToPixels(box: PercentBox, dimensions: { width: number; height: number }): PixelBox {
  return {
    x: Math.round((box.x / 100) * dimensions.width),
    y: Math.round((box.y / 100) * dimensions.height),
    width: Math.max(1, Math.round((box.width / 100) * dimensions.width)),
    height: Math.max(1, Math.round((box.height / 100) * dimensions.height)),
  };
}
