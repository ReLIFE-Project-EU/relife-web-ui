/**
 * File type icon component.
 */

import { ThemeIcon } from "@mantine/core";
import {
  IconFile,
  IconFileSpreadsheet,
  IconFileTypeCsv,
  IconJson,
} from "@tabler/icons-react";

interface FileIconProps {
  mimeType: string;
  size?: number;
}

const MIME_TYPE_ICONS: Record<
  string,
  { icon: typeof IconFile; color: string }
> = {
  "text/csv": { icon: IconFileTypeCsv, color: "green" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    icon: IconFileSpreadsheet,
    color: "teal",
  },
  "application/vnd.ms-excel": { icon: IconFileSpreadsheet, color: "teal" },
  "application/json": { icon: IconJson, color: "blue" },
};

export function FileIcon({ mimeType, size = 20 }: FileIconProps) {
  const { icon: Icon, color } = MIME_TYPE_ICONS[mimeType] ?? {
    icon: IconFile,
    color: "gray",
  };

  return (
    <ThemeIcon variant="light" color={color} size="md">
      <Icon size={size} />
    </ThemeIcon>
  );
}
