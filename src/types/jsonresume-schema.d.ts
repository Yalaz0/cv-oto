declare module "@jsonresume/schema" {
  export function validate(
    resume: unknown,
    callback: (errors: unknown[] | null, valid: boolean) => void,
  ): void;
}
