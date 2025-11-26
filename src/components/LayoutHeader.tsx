import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Group,
  Image,
  Loader,
  Menu,
  Text,
  ActionIcon,
} from "@mantine/core";
import { IconLogin, IconLogout } from "@tabler/icons-react";
import { getKeycloakLogoutUrl, signInWithKeycloak, supabase } from "../auth";
import { useSupabaseSession, useWhoami } from "../hooks/useAuth";
import { ServiceStatus } from "./ServiceStatus";

interface LayoutHeaderProps {
  opened: boolean;
  onToggle: () => void;
}

export const LayoutHeader = ({ opened, onToggle }: LayoutHeaderProps) => {
  const { session, loading: sessionLoading } = useSupabaseSession();
  const { fullName, loading: profileLoading } = useWhoami(session);

  const handleLogin = async () => {
    try {
      const { error } = await signInWithKeycloak({ supabase });
      if (error) {
        console.error("Failed to sign in with Keycloak:", error);
        // TODO: Show user-friendly error notification (e.g., using Mantine notifications)
      }
    } catch (error) {
      console.error("Failed to sign in with Keycloak:", error);
      // TODO: Show user-friendly error notification (e.g., using Mantine notifications)
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    const logoutUrl = getKeycloakLogoutUrl();
    if (logoutUrl) {
      window.location.assign(logoutUrl);
    }
  };

  return (
    <AppShell.Header bg="relife.7" c="white" withBorder={false}>
      <Group h="100%" px="md" justify="space-between">
        <Group gap="md">
          <Burger
            opened={opened}
            onClick={onToggle}
            hiddenFrom="lg"
            size="sm"
            color="white"
            aria-label="Toggle navigation"
          />
          <Image src="/relife.png" alt="ReLIFE Logo" h={32} w="auto" />
          <Text size="lg" fw={700} visibleFrom="sm">
            ReLIFE Platform
          </Text>
        </Group>

        <Group gap="sm">
          <ServiceStatus autoRefresh={30000} />

          {!sessionLoading && (
            <>
              {session ? (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Button
                      variant="subtle"
                      color="gray.0"
                      leftSection={
                        <Avatar radius="xl" size="sm" color="relife.5" />
                      }
                    >
                      {profileLoading ? (
                        <Loader size="xs" color="white" />
                      ) : (
                        <Text
                          span
                          truncate
                          maw={{ base: 50, sm: 150, md: 200 }}
                        >
                          {fullName || session.user.email}
                        </Text>
                      )}
                    </Button>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<IconLogout size={14} />}
                      onClick={handleLogout}
                    >
                      Sign out
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <>
                  <Button
                    variant="white"
                    size="sm"
                    onClick={handleLogin}
                    leftSection={<IconLogin size={20} stroke={1.5} />}
                    visibleFrom="sm"
                  >
                    Sign In
                  </Button>
                  <ActionIcon
                    variant="white"
                    size="lg"
                    onClick={handleLogin}
                    hiddenFrom="sm"
                    aria-label="Sign In"
                  >
                    <IconLogin size={20} stroke={1.5} />
                  </ActionIcon>
                </>
              )}
            </>
          )}
        </Group>
      </Group>
    </AppShell.Header>
  );
};
