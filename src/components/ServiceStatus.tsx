import { Badge, Group, Loader, ActionIcon, Alert } from "@mantine/core";
import {
  IconRefresh,
  IconAlertCircle,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useServiceHealth } from "../hooks/useServiceHealth";

interface ServiceStatusProps {
  autoRefresh?: number;
}

export const ServiceStatus = ({ autoRefresh }: ServiceStatusProps) => {
  const { financial, technical, forecasting, isLoading, error, refresh } =
    useServiceHealth(autoRefresh);

  const getServiceBadge = (
    name: string,
    healthy: boolean,
    icon: React.ReactNode,
  ) => (
    <Badge
      color={healthy ? "green" : "red"}
      variant="filled"
      leftSection={icon}
    >
      {name}
    </Badge>
  );

  return (
    <Group gap="sm" align="center">
      {isLoading && <Loader size="xs" />}
      {!isLoading && (
        <>
          {getServiceBadge(
            "Financial",
            financial,
            financial ? <IconCheck size={14} /> : <IconX size={14} />,
          )}
          {getServiceBadge(
            "Technical",
            technical,
            technical ? <IconCheck size={14} /> : <IconX size={14} />,
          )}
          {getServiceBadge(
            "Forecasting",
            forecasting,
            forecasting ? <IconCheck size={14} /> : <IconX size={14} />,
          )}
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh service status"
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </>
      )}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          variant="light"
          p="xs"
        >
          {error}
        </Alert>
      )}
    </Group>
  );
};
