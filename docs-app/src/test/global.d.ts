/**
 * Global type declarations for test environment
 */

declare global {
  var fetch: any;
  var URL: {
    createObjectURL: (blob: Blob) => string;
    revokeObjectURL: (url: string) => void;
  };
  var IntersectionObserver: any;
}

export {};
