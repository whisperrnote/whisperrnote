"use client";

import "../globals.css";
import { AppWithLoading } from "@/components/ui/AppWithLoading";
import { AuthProvider } from "@/components/ui/AuthContext";
import { OverlayProvider } from "@/components/ui/OverlayContext";
import { SubscriptionProvider } from "@/components/ui/SubscriptionContext";
import { RouteGuard } from "@/components/ui/RouteGuard";
import { ThemeProvider } from "@/components/ThemeProvider";
// AIProvider removed for lazy AI loading
import { ToastProvider } from "@/components/ui/Toast";
import Overlay from "@/components/ui/Overlay";
import { ContextMenuProvider } from "@/components/ui/ContextMenuContext";
import { GlobalContextMenu } from "@/components/ui/GlobalContextMenu";
import GlobalShortcuts from "@/components/GlobalShortcuts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AppWithLoading>
              <AuthProvider>
                <SubscriptionProvider>
                  <OverlayProvider>
                     <ContextMenuProvider>
                          <RouteGuard>
                            {children}
                          </RouteGuard>
                          <Overlay />
                          <GlobalContextMenu />
                          <GlobalShortcuts />
                        </ContextMenuProvider>
                  </OverlayProvider>
                </SubscriptionProvider>
              </AuthProvider>
            </AppWithLoading>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
