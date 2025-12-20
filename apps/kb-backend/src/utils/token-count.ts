import { getEncoding } from "js-tiktoken";

const encoder = getEncoding("gpt2");

export const countToken = (text: string) => {
  return encoder.encode(text).length;
};

export const takeFirstNTokens = (text: string, n: number) => {
  const tokens = encoder.encode(text);
  const sliced = tokens.slice(0, n);
  return encoder.decode(sliced);
};
