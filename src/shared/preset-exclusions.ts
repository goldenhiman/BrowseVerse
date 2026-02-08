// ============================================================
// Preset Domain Exclusions (India-focused)
// ============================================================

export interface PresetExclusion {
  id: string;
  label: string;
  description: string;
  domains: string[];
  icon: string;
}

export const PRESET_EXCLUSIONS: PresetExclusion[] = [
  {
    id: 'email',
    label: 'Email',
    description: 'Gmail, Outlook, Yahoo, Proton, etc.',
    icon: 'Mail',
    domains: [
      'gmail.com',
      'outlook.com',
      'yahoo.com',
      'proton.me',
      'protonmail.com',
      'icloud.com',
      'zoho.com',
      'rediffmail.com',
      'fastmail.com',
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity & Docs',
    description: 'Notion, Google Docs, Confluence, etc.',
    icon: 'FileText',
    domains: [
      'notion.so',
      'notion.site',
      'docs.google.com',
      'drive.google.com',
      'confluence.atlassian.com',
      'atlassian.net',
      'dropbox.com',
      'figma.com',
      'miro.com',
      'airtable.com',
      'slack.com',
      'onedrive.live.com',
      'sharepoint.com',
    ],
  },
  {
    id: 'banking',
    label: 'Banking & Finance',
    description: 'HDFC, ICICI, Paytm, Zerodha, etc.',
    icon: 'Landmark',
    domains: [
      'hdfcbank.com',
      'icicibank.com',
      'onlinesbi.sbi',
      'sbi.co.in',
      'axisbank.com',
      'kotak.com',
      'pnb.co.in',
      'idfcbank.com',
      'yesbank.in',
      'paytm.com',
      'phonepe.com',
      'pay.google.com',
      'zerodha.com',
      'groww.in',
      'upstox.com',
      'angelone.in',
      'policybazaar.com',
      'cred.club',
    ],
  },
  {
    id: 'gov',
    label: 'Government & Identity',
    description: 'DigiLocker, Aadhaar, IRCTC, etc.',
    icon: 'Shield',
    domains: [
      'digilocker.gov.in',
      'uidai.gov.in',
      'irctc.co.in',
      'incometax.gov.in',
      'epfo.gov.in',
      'passportindia.gov.in',
    ],
  },
  {
    id: 'passwords',
    label: 'Password Managers',
    description: '1Password, Bitwarden, etc.',
    icon: 'Key',
    domains: [
      '1password.com',
      'lastpass.com',
      'bitwarden.com',
      'dashlane.com',
    ],
  },
];

/** Default preset IDs to enable on first run */
export const DEFAULT_PRESET_IDS = PRESET_EXCLUSIONS.map((p) => p.id);

/** Get all domains from enabled presets */
export function getDomainsFromPresets(presetIds: string[]): string[] {
  const set = new Set<string>();
  for (const id of presetIds) {
    const preset = PRESET_EXCLUSIONS.find((p) => p.id === id);
    if (preset) for (const d of preset.domains) set.add(d);
  }
  return [...set];
}
