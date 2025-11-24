import { useState } from "react";
import {
  Group,
  Box,
  Collapse,
  ThemeIcon,
  Text,
  UnstyledButton,
  rem,
} from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import classes from "./NavbarLinksGroup.module.css";

interface LinksGroupProps {
  icon: React.FC<{ size?: number | string; style?: React.CSSProperties }>;
  label: string;
  initiallyOpened?: boolean;
  links?: { label: string; link: string }[];
  link?: string; // Added for single items that are links themselves
  active?: boolean; // Added to support active state for single items
  onNavigate?: (link: string) => void; // Callback for navigation
  activeHash?: string; // Added to support active state for child items
}

export function LinksGroup({
  icon: Icon,
  label,
  initiallyOpened,
  links,
  link,
  active,
  onNavigate,
  activeHash,
}: LinksGroupProps) {
  const hasLinks = Array.isArray(links);
  const [opened, setOpened] = useState(initiallyOpened || false);

  const items = (hasLinks ? links : []).map((item) => {
    return (
      <Text<"a">
        component="a"
        className={classes.link}
        href={item.link}
        key={item.label}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.(item.link);
        }}
        data-active={
          activeHash ? activeHash === item.link || undefined : undefined
        }
      >
        {item.label}
      </Text>
    );
  });

  if (!hasLinks && link) {
    return (
      <UnstyledButton
        component="a"
        href={link}
        className={classes.control}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.(link);
        }}
        data-active={active || undefined}
      >
        <Group justify="space-between" gap={0}>
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="light" size={30}>
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
        </Group>
      </UnstyledButton>
    );
  }

  return (
    <>
      <UnstyledButton
        onClick={() => setOpened((o) => !o)}
        className={classes.control}
        data-active={active || undefined}
      >
        <Group justify="space-between" gap={0}>
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="light" size={30}>
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
          {hasLinks && (
            <IconChevronRight
              className={classes.chevron}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: opened ? "rotate(-90deg)" : "none",
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
}
