import {
  Group,
  Loader,
  ActionIcon,
  Tooltip,
  Stack,
  Text,
  ThemeIcon,
} from "@mantine/core";
import {
  IconRefresh,
  IconCloudCheck,
  IconCloudX,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";
import { useServiceHealth } from "../hooks/useServiceHealth";

interface ServiceStatusProps {
  autoRefresh?: number;
  showRefresh?: boolean;
}

export const ServiceStatus = ({
  autoRefresh,
  showRefresh = false,
}: ServiceStatusProps) => {
  const { financial, technical, forecasting, isLoading, refresh } =
    useServiceHealth(autoRefresh);

  const allHealthy = financial && technical && forecasting;
  const allUnhealthy = !financial && !technical && !forecasting;

  const getStatusColor = () => {
    if (allHealthy) return "green";
    if (allUnhealthy) return "red";
    return "yellow";
  };

  const getStatusIcon = () => {
    if (allHealthy) return <IconCloudCheck size={20} />;
    return <IconCloudX size={20} />;
  };

  const getTooltipContent = () => {
    if (isLoading) {
      return <Text size="xs">Loading service status...</Text>;
    }

    const services = [
      { name: "Financial", status: financial },
      { name: "Technical", status: technical },
      { name: "Forecasting", status: forecasting },
    ];

    return (
      <Stack gap={4}>
        {services.map(({ name, status }) => (
          <Group key={name} gap={6}>
            {status ? (
              <IconCircleCheck size={14} color="var(--mantine-color-green-6)" />
            ) : (
              <IconCircleX size={14} color="var(--mantine-color-red-6)" />
            )}
            <Text size="xs">{name}</Text>
          </Group>
        ))}
      </Stack>
    );
  };

  return (
    <Group gap="xs" align="center">
      <Tooltip
        label={getTooltipContent()}
        position="bottom"
        withArrow
        multiline
      >
        <Group gap={4} align="center">
          <ThemeIcon
            color={getStatusColor()}
            size="lg"
            variant="white"
            radius="xl"
          >
            {getStatusIcon()}
          </ThemeIcon>
          {isLoading && <Loader size={14} />}
        </Group>
      </Tooltip>
      {showRefresh && (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Refresh service status"
          aria-busy={isLoading}
          aria-disabled={isLoading}
          size="sm"
        >
          <IconRefresh size={14} />
        </ActionIcon>
      )}
    </Group>
  );
};
