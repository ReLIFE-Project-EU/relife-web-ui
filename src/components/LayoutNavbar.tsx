import { AppShell, ScrollArea } from "@mantine/core";
import {
  IconBriefcase,
  IconBuildingEstate,
  IconHome,
  IconHomeHeart,
  IconMessageCircle,
} from "@tabler/icons-react";
import React from "react";
import { useLocation } from "react-router-dom";
import classes from "./LayoutNavbar.module.css";
import { LinksGroup } from "./NavbarLinksGroup";

interface NavItem {
  label: string;
  icon: React.FC<{ size?: number | string; style?: React.CSSProperties }>;
  link?: string;
  external?: boolean;
  links?: { label: string; link: string }[];
}

const FEEDBACK_FORM_URL =
  "https://share.hsforms.com/1KTWnmHp0RjyvgJ-5yD8NcQ2i2ln";

const navigationData: NavItem[] = [
  { label: "Home", icon: IconHome, link: "/" },

  // Group 1: Policymakers, researchers
  {
    label: "Strategy Explorer",
    icon: IconBuildingEstate,
    link: "/strategy-explorer",
  },

  // Group 2: Financial institutions, ESCOs
  {
    label: "Portfolio Advisor",
    icon: IconBriefcase,
    link: "/portfolio-advisor",
  },

  // Group 3: Homeowners
  {
    label: "Home Assistant",
    icon: IconHomeHeart,
    link: "/home-assistant",
  },

  {
    label: "Feedback",
    icon: IconMessageCircle,
    link: FEEDBACK_FORM_URL,
    external: true,
  },
];

export const LayoutNavbar = () => {
  const location = useLocation();
  const activePath = location.pathname;

  const links = navigationData.map((item) => {
    const hasActiveChild = item.links?.some(
      (child) => child.link === activePath || activePath.startsWith(child.link),
    );

    // Check if the active path matches the direct link or is a sub-path (for tool pages)
    const isDirectLinkActive =
      !item.external &&
      item.link &&
      (item.link === activePath || activePath.startsWith(item.link + "/"));

    return (
      <LinksGroup
        {...item}
        key={item.label}
        active={isDirectLinkActive || hasActiveChild}
        activePath={activePath}
      />
    );
  });

  return (
    <AppShell.Navbar className={classes.navbar}>
      <ScrollArea className={classes.links}>
        <div className={classes.linksInner}>{links}</div>
      </ScrollArea>
    </AppShell.Navbar>
  );
};
