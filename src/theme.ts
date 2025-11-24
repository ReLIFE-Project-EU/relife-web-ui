import { createTheme } from "@mantine/core";

const relifeGreen = [
  "#F5FAEC", // very light greenish yellow (tint, 0)
  "#F0FBD5", // lemon tint (1)
  "#EAF4B5", // light pear (2)
  "#DBE99E", // upper mid tint (3)
  "#C8DF7A", // muted apple green tint (4)
  "#8DC63F", // apple green (base, 5)
  "#50B848", // leafy green (6)
  "#289048", // forest green (7)
  "#FDB913", // orange (8, accent)
  "#3B3B3C", // off black (9)
] as const;

export const theme = createTheme({
  colors: {
    relife: relifeGreen,
  },
  primaryColor: "relife",
  defaultRadius: "md",
});
