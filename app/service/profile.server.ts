import { hrtime } from "node:process";

export async function time<T>(cb: () => T) {
  const start = hrtime.bigint();
  const value = await cb();
  const end = hrtime.bigint();
  const ms = Number(end - start) / 1_000_000;
  return [value, ms] as const;
}

export function getRandomNumber(min: number, max: number) {
  if (min > max) {
    throw new Error("Minimum value must be less than maximum value");
  }
  const range = max - min + 1;
  return Math.floor(Math.random() * range) + min;
}
