export {}

declare global {
  interface Window {
    __wordhexProfile?: Record<string, unknown>
  }
}
