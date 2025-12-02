import {
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  Select,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalculator,
  IconInfoCircle,
} from "@tabler/icons-react";
import { LOADING_OVERLAY_PROPS, TECHNICAL_PROFILES } from "../utils";

interface CalculatorLayoutProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  loading: boolean;
  error: string | null;
  profile: string;
  onProfileChange: (value: string) => void;
  onCalculate: () => void;
  calculateButtonLabel: string;
  children: React.ReactNode;
}

export const CalculatorLayout = ({
  title,
  icon,
  description,
  loading,
  error,
  profile,
  onProfileChange,
  onCalculate,
  calculateButtonLabel,
  children,
}: CalculatorLayoutProps) => {
  return (
    <Box pos="relative">
      <LoadingOverlay visible={loading} {...LOADING_OVERLAY_PROPS} />
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

        <Select
          label="Optimization Profile"
          description="Select the weighting profile for the calculation"
          data={TECHNICAL_PROFILES}
          value={profile}
          onChange={(value) => value && onProfileChange(value)}
          allowDeselect={false}
        />

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
    </Box>
  );
};
