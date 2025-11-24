import {
  AppShell,
  Burger,
  Group,
  Text,
  ActionIcon,
  Tooltip,
  Image,
} from "@mantine/core";
import { IconBook, IconLogin } from "@tabler/icons-react";
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

          <Tooltip label="View documentation">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              component="a"
              href="#docs"
              aria-label="Documentation"
            >
              <IconBook size={20} />
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Sign in to your account">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              component="a"
              href="#login"
              aria-label="Login"
            >
              <IconLogin size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </AppShell.Header>
  );
};
