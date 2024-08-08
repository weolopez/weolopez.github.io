/**
 * Compute n choose k
 * @param n n to choose from
 * @param k to choose k
 * @returns Result
 */
export declare const comb: (n: number, k: number) => number;
/**
 * Return all n-length combinations from an array
 * @param array Input array
 * @param n Length of combinations
 * @returns An array of n-length combinations
 */
export declare const getCombinations: <T>(array: T[], n: number) => T[][];
