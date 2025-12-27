'use client';

import React from 'react';
import { sidebarIgnoreProps } from '@/constants/sidebar';
import { Box, Typography, Pagination as MuiPagination, PaginationItem } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  totalCount: number;
  pageSize: number;
  className?: string;
  compact?: boolean; // For mobile/smaller displays
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  pageSize,
  compact = false
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const handleMuiPageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    onPageChange(page);
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        width: '100%',
        mt: 2
      }} 
      {...sidebarIgnoreProps}
    >
      {/* Results info */}
      <Typography variant="body2" color="text.secondary">
        {compact ? (
          `${currentPage} / ${totalPages}`
        ) : (
          `Showing ${startItem}-${endItem} of ${totalCount} results`
        )}
      </Typography>

      {/* Pagination controls */}
      <MuiPagination
        count={totalPages}
        page={currentPage}
        onChange={handleMuiPageChange}
        size={compact ? "small" : "medium"}
        renderItem={(item) => (
          <PaginationItem
            slots={{ previous: ChevronLeftIcon, next: ChevronRightIcon }}
            {...item}
            sx={{
              borderRadius: '12px',
              bgcolor: item.selected ? 'primary.main' : 'rgba(255, 255, 255, 0.05)',
              color: item.selected ? 'primary.contrastText' : 'text.primary',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              '&:hover': {
                bgcolor: item.selected ? 'primary.dark' : 'rgba(255, 255, 255, 0.1)',
              }
            }}
          />
        )}
      />
    </Box>
  );
}
