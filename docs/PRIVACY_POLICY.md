# Privacy Policy — Expense Tracker (DRAFT)

> **Draft for the owner's review.** It describes what the app's code does as of version 1.0.0.
> It is not legal advice. Fill in the bracketed fields, have it reviewed, and host it at a
> public URL before store submission. Update it whenever the app's data handling changes.

**Last updated:** [date]
**Developer / contact:** [name], [contact email]

## Summary

Expense Tracker stores your income, expenses, budgets and preferences only on your device. The
app has no account, no server for your data, no advertising and no analytics. The developer does
not receive any of your data.

## Update check

When the app starts (and again when you return to it, at most every 15 minutes), it downloads a
small public file from the developer's website (`expensetracker.dlyneed.com`) that says which app
versions are current or still supported. The request contains no personal data, identifiers,
transactions or settings. Like any web request, the server can see your device's IP address. If
your version is no longer supported, the app asks you to update from the Play Store or App Store;
your data on the device is not changed or deleted. Without an internet connection the app keeps
working.

## Data the app stores on your device

- Transactions you enter: amount, type, category, date, optional note and payment method, and —
  for entries added by voice — the recognized text you reviewed and saved.
- Budgets, categories and your preferences (app language, voice language, theme, currency).
- Receipts you scan and save: the receipt photo (as a file in the app's private storage), the
  shop name, bill number, items and totals, and the text read from the photo.

This data is kept in the app's private database on your device. The app does not encrypt this
database itself; it relies on your device's screen lock and storage protection. On Android, the
database is excluded from Google's automatic app backup. On iOS, a device backup to iCloud or a
computer may include app data, depending on your device settings.

## Voice entry and the microphone

Voice entry is optional. When you use it, the app uses your device's microphone and your device's
speech recognition service (Google on Android, Apple on iOS) to turn speech into text:

- Depending on your device and language, recognition happens on the device or the audio is sent
  to that provider over the internet. The provider's own privacy policy applies to that processing.
- The app does not record or store audio. It keeps only the text you review and save.
- You can use the app fully without voice entry, and you can deny or revoke microphone access in
  your device settings at any time.

## Receipt scanning and the camera

Receipt scanning is optional. When you use it, the app uses your camera (or a photo you pick) and
reads the text with on-device text recognition (Google ML Kit on Android, Apple Vision on iOS).
The photo is not uploaded. A scanned receipt is stored only after you review it and save the
expense. Receipts are not included in backup files; restoring a backup or clearing all data
deletes them. Deleting an expense or removing its receipt deletes the photo.

## Backups and exports

Backup (JSON) and CSV export files are created only when you ask. They are not encrypted and go
only where you choose to save or share them (for example a folder, a cloud drive app or a
messaging app). The app itself does not upload them.

## Data sharing

The app does not sell, share or transfer your data to the developer or to third parties. It
contains no advertising or analytics SDKs.

## Permissions

- **Microphone** (and **Speech Recognition** on iOS): only for voice entry, only while you record.
- **Camera**: only when you choose to photograph a receipt. **Photos** (iOS): only to pick a profile
  photo or a receipt image.
- **Internet** (Android): required by the app framework, used by the system speech service and by the
  app's update check (see above); the app sends none of your data.

## Deleting your data

- **Settings → Clear all data** deletes all transactions, budgets and saved receipts in the app.
- Uninstalling the app deletes its local data from the device (except copies kept by your device's
  own system backup).
- Backup or export files you saved elsewhere are not affected; delete them separately.

## Children

The app is not directed at children and does not knowingly collect personal information from them.

## Changes

If this policy changes, the new version will be published at this URL with a new "Last updated" date.

## Contact

[contact email]
