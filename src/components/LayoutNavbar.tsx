import { AppShell, ScrollArea } from "@mantine/core";
import {
  IconBriefcase,
  IconBuildingEstate,
  IconHome,
  IconHomeHeart,
  IconTools,
} from "@tabler/icons-react";
import React from "react";
import { useLocation } from "react-router-dom";
import classes from "./LayoutNavbar.module.css";
import { LinksGroup } from "./NavbarLinksGroup";

interface NavItem {
  label: string;
  icon: React.FC<{ size?: number | string; style?: React.CSSProperties }>;
  link?: string;
  links?: { label: string; link: string }[];
}

const navigationData: NavItem[] = [
  { label: "Home", icon: IconHome, link: "/" },

  // Group 1: Policymakers, researchers
  {
    label: "Strategy Explorer",
    icon: IconBuildingEstate,
    links: [{ label: "Overview", link: "/strategy-explorer" }],
  },

  // Group 2: Financial institutions, ESCOs
  {
    label: "Portfolio Advisor",
    icon: IconBriefcase,
    links: [{ label: "Overview", link: "/portfolio-advisor" }],
  },

  // Group 3: Homeowners
  {
    label: "Home Assistant",
    icon: IconHomeHeart,
    links: [{ label: "Overview", link: "/home-assistant" }],
  },

  // Direct access to underlying calculators and services
  {
    label: "Expert Tools",
    icon: IconTools,
    links: [
      { label: "Financial Calculator", link: "/financial" },
      { label: "Technical Analysis", link: "/technical" },
      { label: "Forecasting", link: "/forecasting" },
    ],
  },
];

export const LayoutNavbar = () => {
  const location = useLocation();
  const activePath = location.pathname;

  const links = navigationData.map((item) => {
    const hasActiveChild = item.links?.some(
      (child) => child.link === activePath || activePath.startsWith(child.link),
    );

    return (
      <LinksGroup
        {...item}
        key={item.label}
        active={item.link === activePath || hasActiveChild}
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
