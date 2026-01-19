"use client";

import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, LinearProgress, Grid, alpha, Chip } from '@mui/material';
import { Cpu, Database, Activity, Globe, Wifi } from 'lucide-react';
import { MeshProtocol, NodeIdentity, MeshMessage } from '@/lib/ecosystem/mesh';

export const SystemMonitor = () => {
    const [stats, setStats] = useState({
        cpu: 12,
        mem: 45,
        net: 8,
        latency: 24
    });

    const [nodes, setNodes] = useState<Record<string, { lastSeen: number, load: number }>>({});

    useEffect(() => {
        const unsub = MeshProtocol.subscribe((msg: MeshMessage) => {
            if (msg.type === 'PULSE') {
                setNodes(prev => ({
                    ...prev,
                    [msg.sourceNode]: {
                        lastSeen: Date.now(),
                        load: msg.payload?.load || 0
                    }
                }));
            }
        });

        const interval = setInterval(() => {
            setStats({
                cpu: Math.floor(Math.random() * 20) + 5,
                mem: 40 + Math.floor(Math.random() * 10),
                net: Math.floor(Math.random() * 50),
                latency: 18 + Math.floor(Math.random() * 15)
            });
        }, 2000);
        
        return () => {
            unsub();
            clearInterval(interval);
        };
    }, []);

    const activeNodes = Object.keys(nodes).filter(nid => Date.now() - nodes[nid].lastSeen < 10000);

    return (
        <Box sx={{ p: 3, color: 'white' }}>
            <Typography variant="overline" sx={{ opacity: 0.4, fontWeight: 900, mb: 3, display: 'block' }}>
                System Telemetry
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 4 }}>
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

            <Typography variant="overline" sx={{ opacity: 0.4, fontWeight: 900, mb: 2, display: 'block' }}>
                Mesh Infrastructure ({activeNodes.length} Nodes Online)
            </Typography>

            <Stack spacing={1}>
                {MeshProtocol.getNodes().map(node => {
                    const isActive = activeNodes.includes(node.id);
                    const load = nodes[node.id]?.load || 0;
                    
                    return (
                        <Box key={node.id} sx={{ 
                            p: 1.5, 
                            borderRadius: 2, 
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ 
                                    width: 8, 
                                    height: 8, 
                                    borderRadius: '50%', 
                                    bgcolor: isActive ? '#00F0FF' : 'rgba(255,255,255,0.1)',
                                    boxShadow: isActive ? '0 0 10px #00F0FF' : 'none'
                                }} />
                                <Stack>
                                    <Typography variant="body2" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '10px' }}>
                                        {node.id}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.4, fontSize: '9px' }}>
                                        {node.type} • v{node.version}
                                    </Typography>
                                </Stack>
                            </Stack>

                            <Stack direction="row" spacing={2} alignItems="center">
                                {isActive && (
                                    <Box sx={{ width: 60 }}>
                                        <LinearProgress 
                                            variant="determinate" 
                                            value={load * 100} 
                                            sx={{ height: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.05)' }} 
                                        />
                                    </Box>
                                )}
                                <Chip 
                                    label={isActive ? 'ONLINE' : 'OFFLINE'} 
                                    size="small" 
                                    sx={{ 
                                        height: 16, 
                                        fontSize: '8px', 
                                        fontWeight: 900,
                                        bgcolor: isActive ? alpha('#00F0FF', 0.1) : 'rgba(255,255,255,0.05)',
                                        color: isActive ? '#00F0FF' : 'rgba(255,255,255,0.4)',
                                        border: 'none'
                                    }} 
                                />
                            </Stack>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
};

const MonitorItem = ({ icon, label, value, color, suffix = "%" }: any) => (
    <Grid size={{ xs: 6 }}>
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
