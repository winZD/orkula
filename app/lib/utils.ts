import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CHART_COLORS = [
  "#1b4019",
  "#2d6a2e",
  "#4a8c3f",
  "#6aad5a",
  "#8bc580",
  "#7a6c3a",
  "#a39255",
  "#c4b87a",
  "#5c7a3a",
  "#3d5c2a",
];
