"use client";

import React from 'react';
import { Grid, Box, Typography } from '@mui/material';
import { QuickNote } from '../contributions/QuickNote';
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

export const EcosystemWidgets = () => {
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
                    <QuickNote />
                </Grid>
                <Grid item xs={12} md={6}>
                    <MiniChat />
                </Grid>
                <Grid item xs={12} md={6}>
                    <VaultStatus />
                </Grid>
                <Grid item xs={12} md={6}>
                    <FocusStatus />
                </Grid>
            </Grid>
        </Box>
    );
};
