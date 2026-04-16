declare module "snarkjs" {
  export const groth16: {
    fullProve(
      input: unknown,
      wasmPath: string,
      zkeyPath: string
    ): Promise<{ proof: Record<string, unknown>; publicSignals: string[] }>;
  };
}
