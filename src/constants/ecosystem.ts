export interface EcosystemApp {
  id: string;
  label: string;
  subdomain: string;
  type: 'app' | 'accounts' | 'support';
}

export const NEXT_PUBLIC_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || 'whisperrnote.app';

export const ECOSYSTEM_APPS: EcosystemApp[] = [
  { id: 'whisperrnote', label: 'Whisperrnote', subdomain: 'app', type: 'app' },
  { id: 'whisperrtask', label: 'Whisperrtask', subdomain: 'whisperrtask', type: 'app' },
  { id: 'whisperrmeet', label: 'Whisperrmeet', subdomain: 'whisperrmeet', type: 'app' },
  { id: 'whisperrcal', label: 'Whisperrcal', subdomain: 'whisperrcal', type: 'app' },
  { id: 'whisperrevents', label: 'Whisperrevents', subdomain: 'whisperrevents', type: 'app' },
  { id: 'tenchat', label: 'TenChat', subdomain: 'tenchat', type: 'app' },
  { id: 'accounts', label: 'Accounts', subdomain: 'accounts', type: 'accounts' },
  { id: 'support', label: 'Support', subdomain: 'support', type: 'support' },
];

export const DEFAULT_ECOSYSTEM_LOGO = '/logo/rall.svg';

export function getEcosystemUrl(subdomain: string) {
  if (!subdomain) {
    return '#';
  }
  return `https://${subdomain}.${NEXT_PUBLIC_DOMAIN}`;
}
