import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Menu, X, User as UserIcon, MessageSquare, Briefcase, PlusCircle, ShieldCheck, Route, Heart, Bell } from "lucide-react";
import { CarCarrierIcon } from "@/components/icons/CarCarrierIcon";
import { PasskeyLoginButton } from "@/components/passkeys/PasskeyLoginButton";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath: string | null;
  isRead: boolean;
  createdAt: string;
};

function useNotifications(enabled: boolean) {
  return useQuery<{ notifications: AppNotification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    enabled,
    refetchInterval: 30_000,
  });
}

export function Navbar() {
  const [location, setLocation] = useLocation();
  const navigate = setLocation;
  const { isAuthenticated, login, logout, user } = useAuth();
  const { data: profile } = useGetMyProfile({ query: { enabled: isAuthenticated } });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifData } = useNotifications(isAuthenticated);
  const notifications = notifData?.notifications ?? [];
  const unreadCount = notifData?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  function handleNotificationClick(n: AppNotification) {
    if (!n.isRead) markRead.mutate(n.id);
    if (n.linkPath) navigate(n.linkPath);
  }

  const role = profile?.role;
  const isVerified = profile?.isVerified;

  const closeMenu = () => setMobileMenuOpen(false);

  const NavLinks = () => (
    <>
      <Link href="/shipments" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/shipments' ? 'text-primary' : 'text-muted-foreground'}`} onClick={closeMenu}>
        Browse Loads
      </Link>
      <Link href="/driver-routes" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/driver-routes' ? 'text-primary' : 'text-muted-foreground'} flex items-center gap-1`} onClick={closeMenu}>
        <Route className="h-3.5 w-3.5" />Backhaul Finder
      </Link>
      
      {isAuthenticated && role === 'shipper' && (
        <>
          <Link href="/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`} onClick={closeMenu}>
            My Shipments
          </Link>
          <Button asChild variant="accent" size="sm" className="hidden md:flex ml-2">
            <Link href="/post-load">
              <PlusCircle className="mr-2 h-4 w-4" />
              Post a Load
            </Link>
          </Button>
        </>
      )}

      {isAuthenticated && role === 'driver' && (
        <Link href="/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/dashboard' ? 'text-primary' : 'text-muted-foreground'}`} onClick={closeMenu}>
          My Jobs
        </Link>
      )}

      {isAuthenticated && role === 'admin' && (
        <Link href="/admin" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/admin' ? 'text-primary' : 'text-muted-foreground'}`} onClick={closeMenu}>
          Admin Dashboard
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group" onClick={closeMenu}>
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              <CarCarrierIcon className="h-5 w-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight hidden sm:inline-block">
              Evo<span className="text-primary">Haul</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 ml-6">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={login}>Log in</Button>
              <PasskeyLoginButton variant="outline" className="h-9 text-sm" onSuccess={() => window.location.reload()} />
              <Button onClick={login}>Sign up</Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/messages" className="text-muted-foreground hover:text-primary transition-colors relative">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>

              {/* Notification Bell */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-primary hover:underline font-normal"
                        onClick={() => markAllRead.mutate()}
                      >
                        Mark all read
                      </button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    <ScrollArea className="max-h-80">
                      {notifications.slice(0, 20).map((n) => (
                        <DropdownMenuItem
                          key={n.id}
                          className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer ${!n.isRead ? "bg-primary/5" : ""}`}
                          onClick={() => handleNotificationClick(n)}
                        >
                          <span className={`text-sm leading-snug ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                            {n.title}
                          </span>
                          <span className="text-xs text-muted-foreground leading-snug">{n.body}</span>
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarImage src={profile?.profileImageUrl || user?.profileImage} alt={profile?.firstName || 'User'} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile?.firstName?.[0] || user?.username?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none flex items-center gap-1">
                        {profile?.firstName ? `${profile.firstName} ${profile.lastName}` : user?.username}
                        {isVerified && <ShieldCheck className="h-3 w-3 text-primary" />}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile?.email || 'Complete your profile'}
                      </p>
                      {role && (
                        <Badge variant="outline" className="w-fit mt-1 uppercase text-[10px]">
                          {role}
                        </Badge>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer flex items-center">
                      <Briefcase className="mr-2 h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {role === "shipper" && (
                    <DropdownMenuItem asChild>
                      <Link href="/saved-drivers" className="cursor-pointer flex items-center">
                        <Heart className="mr-2 h-4 w-4 text-rose-500" />
                        <span>Saved Drivers</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {role === "driver" && (
                    <DropdownMenuItem asChild>
                      <Link href="/driver-routes" className="cursor-pointer flex items-center">
                        <Route className="mr-2 h-4 w-4 text-primary" />
                        <span>My Routes</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="cursor-pointer flex items-center">
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile & Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
          <NavLinks />
          {isAuthenticated && role === 'shipper' && (
            <Button asChild variant="accent" className="w-full justify-start mt-2">
              <Link href="/post-load" onClick={closeMenu}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Post a Load
              </Link>
            </Button>
          )}
          {!isAuthenticated && (
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" className="w-full justify-center" onClick={login}>Log in</Button>
              <Button className="w-full justify-center" onClick={login}>Sign up</Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
