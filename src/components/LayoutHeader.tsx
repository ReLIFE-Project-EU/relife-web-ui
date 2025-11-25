import { AppShell, Burger, Group, Image, Text } from "@mantine/core";
import { ServiceStatus } from "./ServiceStatus";

interface LayoutHeaderProps {
  opened: boolean;
  onToggle: () => void;
}

export const LayoutHeader = ({ opened, onToggle }: LayoutHeaderProps) => {
  return (
    <AppShell.Header>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="md">
          <Burger
            opened={opened}
            onClick={onToggle}
            hiddenFrom="lg"
            size="sm"
            aria-label="Toggle navigation"
          />
          <Image src="/relife.png" alt="ReLIFE Logo" h={32} w="auto" />
          <Text size="lg" fw={700}>
            ReLIFE Platform
          </Text>
        </Group>

        <Group gap="sm">
          <ServiceStatus autoRefresh={30000} />
        </Group>
      </Group>
    </AppShell.Header>
  );
};
