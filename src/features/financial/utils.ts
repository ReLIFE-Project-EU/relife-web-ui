export const parseArrayInput = (input: string): number[] => {
  const tokens = input.split(",").map((s) => s.trim());
  const invalidTokens: string[] = [];
  const values: number[] = [];

  for (const token of tokens) {
    if (token === "") {
      continue; // Skip empty strings
    }

    const value = Number(token);

    // Validate: must be finite and the token must fully represent the number
    if (!Number.isFinite(value) || !/^-?\d+(\.\d+)?$/.test(token)) {
      invalidTokens.push(token);
    } else {
      values.push(value);
    }
  }

  if (invalidTokens.length > 0) {
    throw new Error(
      `Invalid numeric values: ${invalidTokens.join(", ")}. Please enter valid numbers.`,
    );
  }

  return values;
};
