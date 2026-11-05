// Id's en klok komen van buiten, zodat de kern deterministisch te testen is.

export interface Env {
  readonly now: () => number;
  /** Willekeurige, unieke tekst (crypto.randomUUID in de browser). */
  readonly uuid: () => string;
  /** Stabiele naam van dit toestel; wordt in elke gebeurtenis gezet. */
  readonly device: string;
}

export const newId = (env: Env, prefix: string): string => `${prefix}:${env.uuid()}`;
