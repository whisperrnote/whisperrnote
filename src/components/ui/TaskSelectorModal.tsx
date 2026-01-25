'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItemButton, 
  ListItemText, 
  CircularProgress, 
  TextField,
  InputAdornment,
  alpha
} from '@mui/material';
import { 
  Search as SearchIcon,
  Assignment as TaskIcon,
  CheckCircle as DoneIcon,
  RadioButtonUnchecked as TodoIcon
} from '@mui/icons-material';
import { Modal } from './modal';
import { listFlowTasks } from '@/lib/appwrite';
import { useToast } from './Toast';

interface Task {
  $id: string;
  title: string;
  status: string;
}

interface TaskSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (taskId: string) => void;
}

export function TaskSelectorModal({ isOpen, onClose, onSelect }: TaskSelectorModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showError } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchTasks = async () => {
        setLoading(true);
        try {
          const res = await listFlowTasks();
          setTasks(res.documents as any[]);
        } catch (err: any) {
          showError(err.message || 'Failed to fetch tasks from WhisperrFlow');
          onClose();
        } finally {
          setLoading(false);
        }
      };
      fetchTasks();
    }
  }, [isOpen, showError, onClose]);

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Attach Task">
      <Box sx={{ minHeight: '300px', maxHeight: '500px', display: 'flex', flexDirection: 'column' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            mb: 2,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(0, 245, 255, 0.3)' },
              '&.Mui-focused fieldset': { borderColor: '#00F5FF' },
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress size={32} sx={{ color: '#00F5FF' }} />
          </Box>
        ) : filteredTasks.length === 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5 }}>
            <TaskIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography variant="body2">No tasks found</Typography>
          </Box>
        ) : (
          <List sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
            {filteredTasks.map((task) => (
              <ListItemButton
                key={task.$id}
                onClick={() => onSelect(task.$id)}
                sx={{
                  borderRadius: '12px',
                  mb: 1,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  '&:hover': {
                    bgcolor: 'rgba(0, 245, 255, 0.05)',
                    borderColor: 'rgba(0, 245, 255, 0.2)',
                  }
                }}
              >
                <Box sx={{ mr: 2, display: 'flex', color: task.status === 'done' ? '#4CAF50' : 'rgba(255, 255, 255, 0.3)' }}>
                  {task.status === 'done' ? <DoneIcon fontSize="small" /> : <TodoIcon fontSize="small" />}
                </Box>
                <ListItemText 
                  primary={task.title} 
                  primaryTypographyProps={{ 
                    fontSize: '0.9rem', 
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.9)'
                  }} 
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Modal>
  );
}
