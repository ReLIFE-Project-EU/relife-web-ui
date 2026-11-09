/** A reading's text, with its explanation on hover when it has one. */

import { Text, Tooltip } from "@mantine/core";
import {
  readingHint,
  readingText,
  type Reading,
  type ReadingStyle,
} from "../../services/appraisalReadout";

interface ReadingTextProps {
  reading: Reading;
  style?: ReadingStyle;
}

export function ReadingText({ reading, style }: ReadingTextProps) {
  const text = readingText(reading, style);
  const hint = readingHint(reading);
  if (!hint) return text;

  return (
    <Tooltip label={hint} withArrow multiline maw={280}>
      <Text span inherit style={{ cursor: "help" }}>
        {text}
      </Text>
    </Tooltip>
  );
}
