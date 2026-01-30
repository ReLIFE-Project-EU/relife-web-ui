/**
 * OpeningsInputs Component
 * DEPRECATED: Window/glazing properties are now archetype properties,
 * not user inputs. This component is kept for backward compatibility but should
 * not be used in the archetype-based workflow.
 */

import { Text, Alert } from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

export function OpeningsInputs() {
  return (
    <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
      <Text size="sm">
        Window and glazing properties are determined by the selected building
        archetype and cannot be customized at this stage.
      </Text>
    </Alert>
  );
}
