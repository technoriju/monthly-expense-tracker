import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DashboardGreeting } from '@/features/dashboard/components/DashboardGreeting';
import { changeUiLanguage } from '@/i18n';
import { useUiStore } from '@/store/uiStore';

import { profileImageService } from '../services/profileImageService';

// lucide ships ESM only; icons are irrelevant to these tests.
jest.mock(
  'lucide-react-native',
  () => new Proxy({}, { get: (_target, name) => (name === '__esModule' ? false : () => null) }),
);

jest.mock('../services/profileImageService', () => ({
  profileImageService: { getUri: jest.fn(), pick: jest.fn(), remove: jest.fn() },
}));

const service = jest.mocked(profileImageService);
const PHOTO = 'file:///data/profile/photo-1.jpg';
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const renderGreeting = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <DashboardGreeting now={new Date(2025, 4, 1, 9)} />
    </SafeAreaProvider>,
  );

beforeEach(async () => {
  await changeUiLanguage('en');
  service.getUri.mockReset().mockReturnValue(null);
  service.pick.mockReset();
  service.remove.mockReset();
});

describe('Profile photo', () => {
  it('opens the sheet from the avatar and offers only "Choose photo" without a photo', async () => {
    await renderGreeting();
    await fireEvent.press(screen.getByRole('button', { name: 'Profile' }));

    expect(screen.getByText('Profile photo')).toBeTruthy();
    expect(screen.getByText('Choose photo')).toBeTruthy();
    expect(screen.queryByText('Remove photo')).toBeNull();
  });

  it('shows the picked photo on the dashboard and closes the sheet', async () => {
    service.pick.mockResolvedValue(PHOTO);
    await renderGreeting();
    await fireEvent.press(screen.getByRole('button', { name: 'Profile' }));
    await fireEvent.press(screen.getByText('Choose photo'));

    expect(service.pick).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Profile photo')).toBeNull();
    expect(screen.getByTestId('profile-photo')).toBeTruthy();
  });

  it('keeps the sheet open when the picker is cancelled', async () => {
    service.pick.mockResolvedValue(null);
    await renderGreeting();
    await fireEvent.press(screen.getByRole('button', { name: 'Profile' }));
    await fireEvent.press(screen.getByText('Choose photo'));

    expect(screen.getByText('Profile photo')).toBeTruthy();
  });

  it('removes a saved photo', async () => {
    service.getUri.mockReturnValue(PHOTO);
    await renderGreeting();
    await fireEvent.press(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByText('Change photo')).toBeTruthy();
    expect(screen.getAllByTestId('profile-photo')).toHaveLength(2);
    await fireEvent.press(screen.getByText('Remove photo'));

    expect(service.remove).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-photo')).toBeNull();
  });

  it('shows an error toast when saving the photo fails', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    service.pick.mockRejectedValue(new Error('copy failed'));
    await renderGreeting();
    await fireEvent.press(screen.getByRole('button', { name: 'Profile' }));
    await fireEvent.press(screen.getByText('Choose photo'));

    expect(useUiStore.getState().toast?.message).toBe('Could not set the photo. Please try again.');
  });
});
