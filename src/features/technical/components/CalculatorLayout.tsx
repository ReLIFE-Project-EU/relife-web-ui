import { Alert, Button, Group, Stack, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconInfoCircle,
} from "@tabler/icons-react";

interface CalculatorLayoutProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  loading: boolean;
  error: string | null;
  onCalculate: () => void;
  calculateButtonLabel: string;
  children: React.ReactNode;
}

/**
 * CalculatorLayout
 *
 * Layout component for calculator forms. Loading overlay is now handled
 * globally via GlobalLoadingOverlay, but `loading` prop is still used
 * to disable the calculate button during operations.
 */
export const CalculatorLayout = ({
  title,
  icon,
  description,
  loading,
  error,
  onCalculate,
  calculateButtonLabel,
  children,
}: CalculatorLayoutProps) => {
  return (
    <Stack gap="md">
      <Group>
        {icon}
        <Text fw={500} size="lg">
          {title}
        </Text>
      </Group>

      <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />}>
        {description}
      </Alert>

      {children}

      <Button
        onClick={onCalculate}
        leftSection={<IconCalculator size={16} />}
        mt="md"
        disabled={loading}
      >
        {calculateButtonLabel}
      </Button>

      {error && (
        <Alert
          color="red"
          title="Error"
          icon={<IconAlertCircle size={16} />}
          mt="md"
        >
          {error}
        </Alert>
      )}
    </Stack>
  );
};
