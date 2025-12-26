"use client";

import React, { useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Button as MuiButton, 
  Stack, 
  Grid, 
  AppBar, 
  Toolbar, 
  Link,
  Avatar,
  useTheme,
  alpha
} from '@mui/material';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/components/ui/AuthContext';
import { AIHeroInput } from '@/components/AIHeroInput';
import {
  SparklesIcon,
  CpuChipIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

const features = [
  {
    icon: <SparklesIcon style={{ height: 32, width: 32 }} />,
    title: 'AI-Powered Creation',
    description:
      "Generate comprehensive notes, research summaries, and creative content with advanced AI assistance in seconds.",
  },
  {
    icon: <CpuChipIcon style={{ height: 32, width: 32 }} />,
    title: 'Secure Synchronization',
    description:
      'Securely store and share your notes with professional-grade encryption and private access control.',
  },
  {
    icon: <ShieldCheckIcon style={{ height: 32, width: 32 }} />,
    title: 'Smart Collaboration',
    description:
      'Real-time collaborative editing with AI insights and secure note management.',
  },
];

export default function LandingPage() {
  const { openIDMWindow, isAuthenticated, user, isAuthenticating } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/notes');
      return;
    }
  }, [isAuthenticated, router]);

  // Generate user initials from name or email
  const getUserInitials = (user: any): string => {
    if (user?.name) {
      return user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Handle AI prompt selection with smart routing
  const handlePromptSelect = async (prompt: string) => {
    if (isAuthenticated) {
      // User is logged in - go directly to notes with AI generation
      router.push(`/notes?ai-prompt=${encodeURIComponent(prompt)}`);
    } else {
      // User not logged in - show auth modal, then proceed
      openIDMWindow();
      // Store prompt in sessionStorage for after login
      sessionStorage.setItem('pending-ai-prompt', prompt);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="sticky" sx={{ bgcolor: alpha(theme.palette.background.default, 0.8), backdropFilter: 'blur(8px)', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 5 } }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box 
              component="img"
              src="/logo/whisperrnote.png" 
              alt="Whisperrnote Logo" 
              sx={{ h: 32, w: 32, borderRadius: 2 }}
            />
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Whisperrnote</Typography>
          </Stack>
          
          <Stack direction="row" spacing={4} sx={{ display: { xs: 'none', md: 'flex' }, flex: 1, justifyContent: 'center' }}>
            {['Product', 'Solutions', 'Resources', 'Pricing'].map((item) => (
              <Link
                key={item}
                href="#"
                underline="none"
                sx={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: 'text.secondary',
                  transition: 'color 0.2s',
                  '&:hover': { color: 'text.primary' }
                }}
              >
                {item}
              </Link>
            ))}
          </Stack>

          <Box>
            {isAuthenticated ? (
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 36, height: 36, fontSize: '0.875rem', fontWeight: 500 }}>
                {getUserInitials(user)}
              </Avatar>
            ) : (
              <Button 
                variant="text" 
                onClick={() => openIDMWindow()}
                isLoading={isAuthenticating}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1 }}>
        <Box sx={{ py: { xs: 12, md: 16 }, textAlign: 'center', position: 'relative' }}>
          <Container maxWidth="md">
            <Typography variant="h1" sx={{ mb: 2, fontSize: { xs: '2.5rem', md: '3.75rem' }, fontWeight: 900, lineHeight: 1.1 }}>
              Your notes, elevated by AI
            </Typography>
            <Typography variant="body1" sx={{ mb: 6, color: 'text.secondary', fontSize: { xs: '1.125rem', md: '1.25rem' }, maxWidth: '768px', mx: 'auto' }}>
              Transform your ideas with AI assistance and secure your notes. 
              Generate comprehensive content instantly, collaborate seamlessly, and own your data forever.
            </Typography>

            <Stack direction="column" alignItems="center" spacing={2} sx={{ mb: 6 }}>
              <Button 
                size="large" 
                sx={{ px: 6, py: 2, fontSize: '1.125rem', fontWeight: 'bold' }}
                onClick={() => openIDMWindow()}
                isLoading={isAuthenticating}
              >
                Get Started Free
              </Button>
            </Stack>
            
            <AIHeroInput onPromptSelectAction={handlePromptSelect} />
          </Container>
        </Box>

        <Box sx={{ py: { xs: 10, md: 14 }, bgcolor: 'background.paper' }}>
          <Container>
            <Box sx={{ textAlign: 'center', mb: 8, maxWidth: '672px', mx: 'auto' }}>
              <Typography variant="h2" sx={{ mb: 2, fontWeight: 'bold' }}>
                AI-powered notes for the future
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Experience next-generation note-taking with intelligent content generation, 
                private cloud storage, and advanced security built-in.
              </Typography>
            </Box>

            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <CardHeader>
                      <Box sx={{ 
                        display: 'flex', 
                        height: 48, 
                        width: 48, 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: 3, 
                        bgcolor: alpha(theme.palette.primary.main, 0.1), 
                        color: 'primary.main' 
                      }}>
                        {feature.icon}
                      </Box>
                    </CardHeader>
                    <CardContent>
                      <CardTitle sx={{ mb: 1 }}>
                        {feature.title}
                      </CardTitle>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>

      <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 6 }}>
        <Container>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center" spacing={3}>
            <Stack direction="row" spacing={3} flexWrap="wrap" justifyContent="center">
              {['About', 'Contact', 'Privacy Policy', 'Terms of Service'].map((item) => (
                <Link
                  key={item}
                  href="#"
                  underline="none"
                  sx={{ 
                    fontSize: '0.875rem', 
                    color: 'text.secondary',
                    transition: 'color 0.2s',
                    '&:hover': { color: 'text.primary' }
                  }}
                >
                  {item}
                </Link>
              ))}
            </Stack>
            <Typography variant="body2" color="text.disabled">
              © 2025 Whisperrnote. All rights reserved.
            </Typography>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
