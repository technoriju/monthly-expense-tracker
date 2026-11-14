import '@/i18n';

import { act, render, screen } from '@testing-library/react-native';

import { useAdsStore } from '@/store/adsStore';

import { AdBanner } from '../components/AdBanner';

// jest-expo runs as iOS; ads are Android-only, so force them on for these tests.
jest.mock('../adConfig', () => ({
  ...jest.requireActual<typeof import('../adConfig')>('../adConfig'),
  adsEnabled: () => true,
}));

// lucide ships ESM only (pulled in by the UI barrel); icons are irrelevant here.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

beforeEach(() => {
  useAdsStore.setState({ status: 'ready', privacyOptionsRequired: false });
});

describe('AdBanner', () => {
  it('renders nothing until ads are ready', async () => {
    useAdsStore.setState({ status: 'pending' });
    await render(<AdBanner />);
    expect(screen.queryByTestId('banner-ad')).toBeNull();
  });

  it('renders nothing when ads are unavailable', async () => {
    useAdsStore.setState({ status: 'unavailable' });
    await render(<AdBanner />);
    expect(screen.queryByTestId('banner-ad')).toBeNull();
  });

  it('requests the test unit and shows the label only after an ad loads', async () => {
    await render(<AdBanner />);
    const banner = screen.getByTestId('banner-ad');
    expect(banner.props.unitId).toBe('test-adaptive-banner');
    expect(screen.queryByText('Advertisement')).toBeNull();

    await act(async () => banner.props.onAdLoaded());
    expect(screen.getByText('Advertisement')).toBeTruthy();
  });

  it('collapses on no-fill or network failure', async () => {
    await render(<AdBanner />);
    await act(async () =>
      screen.getByTestId('banner-ad').props.onAdFailedToLoad(new Error('no-fill')),
    );
    expect(screen.queryByTestId('ad-banner')).toBeNull();
  });
});
