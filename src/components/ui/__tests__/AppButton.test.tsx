import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppButton } from '../AppButton';

describe('AppButton', () => {
  it('renders an accessible button and handles presses', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire when disabled and exposes the disabled state', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Save" onPress={onPress} disabled />);
    const button = screen.getByRole('button', { name: 'Save' });
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('marks itself busy while loading', async () => {
    await render(<AppButton label="Save" onPress={jest.fn()} loading />);
    expect(screen.getByRole('button', { name: 'Save' })).toBeBusy();
  });
});
