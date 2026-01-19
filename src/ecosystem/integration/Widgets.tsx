"use client";

import React from 'react';
import { Grid, Box, Typography, alpha, IconButton } from '@mui/material';
import { QuickNote } from '../contributions/QuickNote';
import { Maximize2 } from 'lucide-react';
import { useWindowing } from './WindowingSystem';
import { getEcosystemUrl } from '@/constants/ecosystem';

// In a real monorepo, these would be imported from @whisperr/[app]
// For this environment, we'll implement them as "Integrated Contributions"

/* --- Integrated Components from other apps --- */

/**
 * Integrated MiniChat (from WhisperrConnect)
 */
import { MiniChat } from './MiniChat';

/**
 * Integrated VaultStatus (from WhisperrKeep)
 */
import { VaultStatus } from './VaultStatus';

/**
 * Integrated FocusStatus (from WhisperrFlow)
 */
import { FocusStatus } from './FocusStatus';

const WidgetWrapper = ({ 
    title, 
    children, 
    onExpand,
    appColor = '#00F0FF'
}: { 
    title: string, 
    children: React.ReactNode, 
    onExpand?: () => void,
    appColor?: string 
}) => (
    <Box sx={{ 
        position: 'relative',
        '&:hover .expand-btn': { opacity: 1 }
    }}>
        {children}
        {onExpand && (
            <IconButton 
                className="expand-btn"
                onClick={onExpand}
                size="small"
                sx={{ 
                    position: 'absolute', 
                    top: 12, 
                    right: 12, 
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    color: 'rgba(255,255,255,0.4)',
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '&:hover': { bgcolor: alpha(appColor, 0.2), color: appColor }
                }}
            >
                <Maximize2 size={14} />
            </IconButton>
        )}
    </Box>
);

export const EcosystemWidgets = () => {
    const { openWindow } = useWindowing();

    return (
        <Box sx={{ mt: 4 }}>
            <Typography variant="overline" sx={{ 
                color: 'rgba(255, 255, 255, 0.3)', 
                fontWeight: 900, 
                letterSpacing: '0.2em',
                mb: 2,
                display: 'block'
            }}>
                Ecosystem Command Center
            </Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <WidgetWrapper title="QuickNote" onExpand={() => openWindow('QuickNote', `${getEcosystemUrl('note')}?is_embedded=true`)}>
                        <QuickNote />
                    </WidgetWrapper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <WidgetWrapper title="MiniChat" appColor="#FF00F5" onExpand={() => openWindow('WhisperrConnect', `${getEcosystemUrl('connect')}?is_embedded=true`)}>
                        <MiniChat />
                    </WidgetWrapper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <WidgetWrapper title="VaultStatus" appColor="#FACC15" onExpand={() => openWindow('WhisperrKeep', `${getEcosystemUrl('keep')}?is_embedded=true`)}>
                        <VaultStatus />
                    </WidgetWrapper>
                </Grid>
                <Grid item xs={12} md={6}>
                    <WidgetWrapper title="FocusStatus" appColor="#4ADE80" onExpand={() => openWindow('WhisperrFlow', `${getEcosystemUrl('flow')}?is_embedded=true`)}>
                        <FocusStatus />
                    </WidgetWrapper>
                </Grid>
            </Grid>
        </Box>
    );
};
