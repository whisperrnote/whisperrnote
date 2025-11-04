'use client';

import {
  Box,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
  Tabs,
  Tab,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { Notes } from '@/types/appwrite';
import { useState } from 'react';
import Comments from './Comments';
import Collaborators from './Collaborators';
import AttachmentViewer from './AttachmentViewer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import NoteContentDisplay from '@/components/NoteContentDisplay';

interface NoteViewerProps {
  note: Notes | null;
  onClose: () => void;
}

function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`note-viewer-tabpanel-${index}`}
      aria-labelledby={`note-viewer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function NoteViewer({ note, onClose }: NoteViewerProps) {
  const [tabIndex, setTabIndex] = useState(0);

  if (!note) {
    return null;
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {note.title}
          </Typography>
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <Close />
          </IconButton>
        </Toolbar>
        <Tabs value={tabIndex} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="Content" />
          <Tab label="Comments" />
          <Tab label="Attachments" />
          <Tab label="Collaborators" />
        </Tabs>
      </AppBar>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <TabPanel value={tabIndex} index={0}>
          <Box sx={{ '& .prose': { maxWidth: 'none' } }}>
            {note.format === 'doodle' ? (
              <NoteContentDisplay
                content={note.content || ''}
                format="doodle"
                className="w-full max-w-4xl"
              />
            ) : note.content ? (
              <div className="prose prose-lg max-w-none dark:prose-invert text-foreground dark:text-dark-fg [&>*]:leading-relaxed [&>p]:mb-6 [&>h1]:mb-8 [&>h1]:mt-8 [&>h2]:mb-6 [&>h2]:mt-7 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-6 [&>ol]:mb-6 [&>ol>li]:marker:font-bold [&>blockquote]:mb-6 [&>pre]:mb-6 [&>*:first-child]:mt-0 [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {note.content}
                </ReactMarkdown>
              </div>
            ) : (
              <Typography variant="body1" color="text.secondary" fontStyle="italic">
                This note is empty.
              </Typography>
            )}
          </Box>
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <Comments noteId={note.$id} />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <AttachmentViewer noteId={note.$id} attachments={note.attachments || []} />
        </TabPanel>
        <TabPanel value={tabIndex} index={3}>
          <Collaborators noteId={note.$id} collaborators={note.collaborators || []} />
        </TabPanel>
      </Box>
    </Box>
  );
}
