import {
  ActionIcon,
  AppShell,
  Box,
  Group,
  Image,
  Stack,
  Text,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconBrandLinkedin,
  IconWorld,
} from "@tabler/icons-react";
import { forwardRef } from "react";
import euFlag from "../assets/icons/eu.png";

export const LayoutFooter = forwardRef<HTMLDivElement>((_, ref) => {
  const currentYear = new Date().getFullYear();

  return (
    <AppShell.Footer
      ref={ref}
      withBorder
      zIndex={101}
      style={{
        height: "auto",
        backgroundColor:
          "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
      }}
    >
      <Stack gap={0} justify="space-between" h="100%">
        {/* Top Section: EU Notice & Brand */}
        <Box
          py="md"
          px="md"
          style={{
            borderBottom:
              "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
          }}
        >
          <Group
            justify="space-between"
            align="flex-start"
            wrap="wrap-reverse"
            gap="xl"
          >
            <Group gap="md" wrap="nowrap">
              <Image
                src={euFlag}
                alt="EU"
                w={32}
                h={32}
                fit="contain"
                style={{ flexShrink: 0 }}
              />
              <Text size="xs" c="dimmed" lh={1.4}>
                Co-Funded by the European Union. Views and opinions expressed
                are however those of the author(s) only and do not necessarily
                reflect those of the European Union or CINEA. Neither the
                European Union nor CINEA can be held responsible for them.
              </Text>
            </Group>
          </Group>
        </Box>

        <Box py="md" px="lg">
          <Group justify="space-between" align="center">
            <Text size="xs" c="dimmed">
              © {currentYear} ReLIFE Platform. All rights reserved.
            </Text>

            <Group gap="sm">
              <ActionIcon
                size="md"
                color="gray"
                variant="subtle"
                component="a"
                href="https://relife-project.eu/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Main Website"
              >
                <IconWorld size={20} stroke={1.5} />
              </ActionIcon>
              <ActionIcon
                size="md"
                color="gray"
                variant="subtle"
                component="a"
                href="https://github.com/ReLIFE-Project-EU"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <IconBrandGithub size={20} stroke={1.5} />
              </ActionIcon>
              <ActionIcon
                size="md"
                color="gray"
                variant="subtle"
                component="a"
                href="https://www.linkedin.com/company/project-relife/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
              >
                <IconBrandLinkedin size={20} stroke={1.5} />
              </ActionIcon>
            </Group>
          </Group>
        </Box>
      </Stack>
    </AppShell.Footer>
  );
});

LayoutFooter.displayName = "LayoutFooter";
