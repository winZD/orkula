import { Link, useLocation } from "react-router";
import { LayoutDashboard, TreePine, Wheat, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";

const navItems = [
  { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { titleKey: "groves", href: "/dashboard/groves", icon: TreePine },
  { titleKey: "harvests", href: "/dashboard/harvests", icon: Wheat },
] as const;

interface AppSidebarProps {
  user: {
    firstName: string | null;
    lastName: string | null;
    role: string;
    tenant: { name: string };
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const location = useLocation();
  const { open } = useSidebar();
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="icon" className="border-r border-forest/20">
      <SidebarHeader className="flex h-14 items-center justify-center border-b border-cream/20 bg-forest px-4">
        {open && (
          <span className="text-lg font-semibold text-cream">Orkula</span>
        )}{" "}
      </SidebarHeader>
      <SidebarContent className="bg-cream text-forest">
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={t(item.titleKey)}
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t bg-forest text-cream">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip={t("settings")}
              isActive={location.pathname === "/dashboard/settings"}
              className="text-cream hover:bg-cream/10 hover:text-cream data-[active=true]:bg-cream/20 data-[active=true]:text-cream"
            >
              <Link to="/dashboard/settings">
                <Settings />
                <span>{t("settings")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {open && (
          <div className="px-2 pb-1">
            <div className="text-sm font-medium">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-cream/50">
              {user.tenant.name} &middot; {user.role}
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
