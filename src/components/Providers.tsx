"use client";

import { AuthProvider } from "@/components/ui/AuthContext";
import { OverlayProvider } from "@/components/ui/OverlayContext";
import { LoadingProvider } from "@/components/ui/LoadingContext";
import { RouteGuard } from "@/components/ui/RouteGuard";
import { ThemeProvider as AppThemeProvider, useTheme } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { IslandProvider } from "@/components/ui/DynamicIsland";
import Overlay from "@/components/ui/Overlay";
import { ContextMenuProvider } from "@/components/ui/ContextMenuContext";
import { GlobalContextMenu } from "@/components/ui/GlobalContextMenu";
import GlobalShortcuts from "@/components/GlobalShortcuts";
import { KernelProvider } from "@/ecosystem/kernel/EcosystemKernel";
import { EcosystemPortal } from "@/components/common/EcosystemPortal";
import { EcosystemEvents } from "@/components/common/EcosystemEvents";

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { darkTheme } from "@/theme/theme";

function MuiThemeWrapper({ children }: { children: React.ReactNode }) {
    return (
        <MuiThemeProvider theme={darkTheme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AppThemeProvider>
            <MuiThemeWrapper>
                <KernelProvider>
                    <IslandProvider>
                        <ToastProvider>
                            <AuthProvider>
                                <OverlayProvider>
                                    <LoadingProvider>
                                        <ContextMenuProvider>
                                            <RouteGuard>
                                                {children}
                                            </RouteGuard>
                                            <Overlay />
                                            <GlobalContextMenu />
                                            <GlobalShortcuts />
                                            <EcosystemPortal />
                                            <EcosystemEvents />
                                        </ContextMenuProvider>
                                    </LoadingProvider>
                                </OverlayProvider>
                            </AuthProvider>
                        </ToastProvider>
                    </IslandProvider>
                </KernelProvider>
            </MuiThemeWrapper>
        </AppThemeProvider>
    );
}
