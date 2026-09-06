# Google Sheet sync — 5-step setup (optional)

The app works fully without this. Sync just mirrors the same data the JSON export contains into a Google Sheet you own.

1. **Make a sheet.** Go to sheets.google.com, create a blank spreadsheet, name it "Anya Spelling Quest".
2. **Open the script editor.** In the sheet: Extensions → Apps Script. Delete the sample code, paste the whole of `Code.gs` from this folder, and press Save (name the project anything).
3. **Deploy it as a web app.** Deploy → New deployment → gear icon → *Web app*. Set *Execute as*: **Me**; *Who has access*: **Anyone**. Click Deploy, approve the permissions (it only touches this spreadsheet), and copy the **Web app URL** (ends in `/exec`).
4. **Paste the URL into the app.** On the iPad: 🔒 Grown-ups → PIN → Settings → *Google Sheet sync* → paste → *Save URL*.
5. **Sync.** Tap *Sync now*. Within a few seconds the sheet gets tabs *Sessions, Words, Videos, Revisions, Events, Meta*. Each sync rewrites all tabs, so the sheet always equals the device.

Notes
- The app sends with `mode: no-cors`, so it cannot read the reply; check the *Meta* tab's `lastSync` cell to confirm.
- If you edit `Code.gs` later, you must create a **new deployment version** (Deploy → Manage deployments → edit → version: New) or the old code keeps running.
- Nothing else is sent anywhere. Sync is manual (a button), never automatic.
