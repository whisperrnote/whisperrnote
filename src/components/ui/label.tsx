import React from 'react';
import { InputLabel, InputLabelProps } from '@mui/material';

export interface LabelProps extends InputLabelProps {
  children: React.ReactNode;
}

export function Label({ children, ...props }: LabelProps) {
  return (
    <InputLabel 
      sx={{ 
        fontSize: '0.875rem', 
        fontWeight: 500, 
        mb: 0.5,
        color: 'text.secondary'
      }}
      {...props}
    >
      {children}
    </InputLabel>
  );
}
