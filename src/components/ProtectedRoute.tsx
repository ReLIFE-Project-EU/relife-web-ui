import {
  Button,
  Center,
  Container,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconLock, IconLogin } from "@tabler/icons-react";
import { signInWithKeycloak, supabase } from "../auth";
import { useSupabaseSession } from "../hooks/useAuth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { session, loading } = useSupabaseSession();

  if (loading) {
    return (
      <Center style={{ height: "50vh" }}>
        <Loader size="lg" type="dots" />
      </Center>
    );
  }

  if (!session) {
    return (
      <Container size="xs">
        <Paper shadow="sm" p="xl" radius="md" withBorder>
          <Stack align="center" gap="lg">
            <ThemeIcon size={60} radius="xl" variant="light" color="relife">
              <IconLock size={30} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Title order={2} ta="center" size="h3" fw={900}>
                Authentication Required
              </Title>
              <Text c="dimmed" ta="center" size="sm" maw={400}>
                You need to sign in to access this section of the application.
                Please authenticate to continue.
              </Text>
            </Stack>

            <Button
              onClick={() => signInWithKeycloak({ supabase })}
              size="md"
              fullWidth
              variant="filled"
              color="relife"
              leftSection={<IconLogin size={20} stroke={1.5} />}
            >
              Sign in with SSO
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }

  return <>{children}</>;
}
