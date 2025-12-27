import React from 'react';
import { Chip } from '@mui/material';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const colorMap: Record<string, "primary" | "secondary" | "success" | "warning" | "error" | "default"> = {
    default: 'primary',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error'
  };

  return (
    <Chip 
      label={children} 
      size="small" 
      color={colorMap[variant]} 
      sx={{ 
        height: 20, 
        fontSize: '0.7rem', 
        fontWeight: 600,
        borderRadius: '6px'
      }} 
    />
  );
}
