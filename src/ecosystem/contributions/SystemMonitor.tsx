"use client";

import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, LinearProgress, Grid, alpha } from '@mui/material';
import { Cpu, Database, Activity, Globe } from 'lucide-react';

export const SystemMonitor = () => {
    const [stats, setStats] = useState({
        cpu: 12,
        mem: 45,
        net: 8,
        latency: 24
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setStats({
                cpu: Math.floor(Math.random() * 20) + 5,
                mem: 40 + Math.floor(Math.random() * 10),
                net: Math.floor(Math.random() * 50),
                latency: 18 + Math.floor(Math.random() * 15)
            });
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Box sx={{ p: 3, color: 'white' }}>
            <Typography variant="overline" sx={{ opacity: 0.4, fontWeight: 900, mb: 3, display: 'block' }}>
                System Telemetry
            </Typography>
            
            <Grid container spacing={3}>
                <MonitorItem 
                    icon={<Cpu size={16} />} 
                    label="Kernel Load" 
                    value={stats.cpu} 
                    color="#00F0FF" 
                />
                <MonitorItem 
                    icon={<Database size={16} />} 
                    label="Vault Memory" 
                    value={stats.mem} 
                    color="#FACC15" 
                />
                <MonitorItem 
                    icon={<Activity size={16} />} 
                    label="Network I/O" 
                    value={stats.net} 
                    color="#FF00F5" 
                />
                <MonitorItem 
                    icon={<Globe size={16} />} 
                    label="Gateway Latency" 
                    value={stats.latency} 
                    suffix="ms"
                    color="#4ADE80" 
                />
            </Grid>
        </Box>
    );
};

const MonitorItem = ({ icon, label, value, color, suffix = "%" }: any) => (
    <Grid item xs={6}>
        <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ color }}>{icon}</Box>
                <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 600 }}>{label}</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                    {value}{suffix}
                </Typography>
                <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                        variant="determinate" 
                        value={Math.min(value, 100)} 
                        sx={{ 
                            height: 4, 
                            borderRadius: 2,
                            bgcolor: alpha(color, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: color }
                        }} 
                    />
                </Box>
            </Stack>
        </Stack>
    </Grid>
);
