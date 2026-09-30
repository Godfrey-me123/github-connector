declare module 'bwip-js' {
  export interface ToCanvasOptions {
    bcid: string;
    text: string;
    scale?: number;
    height?: number;
    width?: number;
    includetext?: boolean;
    textxalign?: string;
    barcolor?: string;
    backgroundcolor?: string;
    [key: string]: any;
  }

  export function toCanvas(canvas: HTMLCanvasElement | string, options: ToCanvasOptions): HTMLCanvasElement;
  export function toBuffer(options: ToCanvasOptions, callback?: (err: Error, png: Buffer) => void): void;
}
