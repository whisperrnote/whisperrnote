import React from 'react';
import { TextField, TextFieldProps } from '@mui/material';

export type InputProps = TextFieldProps;

const Input = React.forwardRef<HTMLDivElement, InputProps>(
  ({ type, ...props }, ref) => {
    return (
      <TextField
        type={type}
        fullWidth
        variant="outlined"
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
