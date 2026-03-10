import { Link, useLocation } from "react-router";
import { LayoutDashboard, TreePine, Wheat } from "lucide-react";
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
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Groves", href: "/groves", icon: TreePine },
  { title: "Harvests", href: "/harvests", icon: Wheat },
];

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

  return (
    <Sidebar collapsible="icon" className="border-r border-forest/20">
      <SidebarHeader className="flex h-14 items-center justify-center border-b border-cream/20 bg-forest px-4">
        {open && (
          <span className="text-lg font-semibold text-cream">Orkula</span>
        )}{" "}
      </SidebarHeader>
      <SidebarContent className="bg-cream text-forest">
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={location.pathname === item.href}
                  >
                    <Link to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {open && (
        <SidebarFooter className="border-t px-4 py-3">
          <div className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {user.tenant.name} &middot; {user.role}
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
