import { AppShell, NavLink, ScrollArea, Text, ThemeIcon } from "@mantine/core";
import {
  IconBook,
  IconExternalLink,
  IconHome,
  IconMessageCircle,
} from "@tabler/icons-react";
import type { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { RELIFE_TOOLS } from "../constants/tools";
import classes from "./LayoutNavbar.module.css";

const FEEDBACK_FORM_URL =
  "https://share.hsforms.com/1KTWnmHp0RjyvgJ-5yD8NcQ2i2ln";

const WIKI_URL = "https://github.com/ReLIFE-Project-EU/relife-wiki/wiki";

const RESOURCES = [
  { label: "Wiki", icon: IconBook, href: WIKI_URL },
  { label: "Feedback", icon: IconMessageCircle, href: FEEDBACK_FORM_URL },
];

const navLinkClassNames = { root: classes.link, label: classes.label };

const NavIcon = ({
  icon: Icon,
  color,
}: {
  icon: ComponentType<{ size?: number }>;
  color?: string;
}) => (
  <ThemeIcon variant="light" color={color} size={30}>
    <Icon size={18} />
  </ThemeIcon>
);

const SectionLabel = ({ children }: { children: string }) => (
  <Text size="xs" fw={700} c="dimmed" tt="uppercase" px="sm" mt="lg" mb="xs">
    {children}
  </Text>
);

export const LayoutNavbar = () => {
  const { pathname } = useLocation();

  return (
    <AppShell.Navbar p="sm">
      <AppShell.Section grow component={ScrollArea}>
        <NavLink
          component={Link}
          to="/"
          label="Home"
          active={pathname === "/"}
          classNames={navLinkClassNames}
          leftSection={<NavIcon icon={IconHome} />}
        />

        <SectionLabel>Tools</SectionLabel>
        {RELIFE_TOOLS.map((tool) => (
          <NavLink
            key={tool.link}
            component={Link}
            to={tool.link}
            label={tool.navLabel}
            description={tool.audience}
            color={tool.color}
            active={
              pathname === tool.link || pathname.startsWith(`${tool.link}/`)
            }
            classNames={navLinkClassNames}
            leftSection={<NavIcon icon={tool.icon} color={tool.color} />}
          />
        ))}

        <SectionLabel>Resources</SectionLabel>
        {RESOURCES.map((resource) => (
          <NavLink
            key={resource.label}
            component="a"
            href={resource.href}
            target="_blank"
            rel="noopener noreferrer"
            label={resource.label}
            classNames={navLinkClassNames}
            leftSection={<NavIcon icon={resource.icon} color="gray" />}
            rightSection={
              <IconExternalLink size={14} color="var(--mantine-color-dimmed)" />
            }
          />
        ))}
      </AppShell.Section>
    </AppShell.Navbar>
  );
};
