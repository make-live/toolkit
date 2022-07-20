export interface Strategy {
  prepare: (
    container: HTMLDivElement,
    url: string | URL,
    onData: (data: unknown) => void,
  ) => void;
}
