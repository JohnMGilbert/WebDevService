# Tutti Bambini Sheet Content System

This folder contains the lightweight Google Sheets content system for client-editable Events, Blog posts, and future announcement-style sections.

## Spreadsheet Setup

Create one Google Spreadsheet with these tabs:

Events:

```text
Active | Title | Date | Time | Address | Description | Link | Image | Image Alt
TRUE   | Summer Festival | 2026-07-10 | 10:00 AM | 300 El Molino Blvd | Annual community event | https://example.com | /assets/tutti-bambini/events/summer-festival.jpg | Children at the summer festival
```

Blog:

```text
Active | Title | Date | Summary | Link | Image | Image Alt
TRUE   | New Program Launch | 2026-07-15 | We are launching a new program. | /blog/new-program | https://example.com/program-photo.jpg | Children shopping at Tutti Bambini
```

Rows are displayed only when `Active` is `TRUE`. If a tab has no active rows, the matching website section remains hidden.

`Image` and `Image Alt` are optional. Use a full `https://` image URL, a Google Drive share link, or a site-relative image path. `Image Alt` should briefly describe the image for accessibility.

For Google Drive images, put the images in a shared folder or share each image as `Anyone with the link can view`, then paste the copied Drive link into the `Image` column. The frontend converts common Drive links like `https://drive.google.com/file/d/FILE_ID/view?...` into displayable image URLs.

## Apps Script Deployment

1. In the spreadsheet, open `Extensions > Apps Script`.
2. Paste the contents of `google-apps-script.js` into `Code.gs`.
3. If the script is bound to this spreadsheet, leave `SPREADSHEET_ID` blank. If using a standalone script, paste the spreadsheet ID into `SPREADSHEET_ID`.
4. Click `Deploy > New deployment`.
5. Choose `Web app`.
6. Set `Execute as` to `Me`.
7. Set `Who has access` to `Anyone` so the public website can read the JSON feed.
8. Deploy and copy the Web App URL ending in `/exec`.
9. Paste that URL into the homepage wrapper:

```html
<div class="tb-page" data-content-api="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec">
```

After this one-time setup, the client only edits Google Sheets. No site redeploy is needed for content changes.

Spreadsheet content changes do not require redeploying the Apps Script. Adding, editing, hiding, or deleting rows takes effect automatically the next time the website fetches the JSON feed. Redeploy the Apps Script only when the script code changes, such as when adding support for new columns or a new content type. For live `/exec` URLs, create a new deployment version after changing code; the `/dev` test URL reflects the latest saved code for editors only.

## Sheet Access Security

Do not make the Google Sheet itself public. Keep the spreadsheet's `General access` set to `Restricted`, then add only the client and trusted staff as named `Editors`.

The Apps Script Web App URL is public because the website needs to fetch it from visitors' browsers. That public endpoint can read and return active rows, but it does not give visitors edit access to the spreadsheet. Only Google accounts with editor access to the Sheet can change Events and Blog posts.

This setup is appropriate for public website content. Do not store private donor details, internal notes, passwords, or unpublished sensitive information in tabs served by this endpoint.

## Front-End Usage

The section JavaScript exposes a reusable loader:

```js
loadSection({
  endpoint: apiUrl + "?action=events",
  sectionId: "events-section",
  listId: "events-list",
  renderItem: event => `...`
});
```

Current sections:

```html
<section id="events-section" hidden>
  <h2>Upcoming Events</h2>
  <div id="events-list"></div>
</section>

<section id="blog-section" hidden>
  <h2>Latest News</h2>
  <div id="blog-list"></div>
</section>
```

When a section has exactly one active item, the frontend tries to display a companion image:

```text
WebDevService/assets/tutti-bambini/event_filler_image.png
WebDevService/assets/tutti-bambini/blog_filler_image.png
```

The event image appears to the right of the single event. The blog image appears to the left of the single blog post. If either image is missing, the section still renders without showing a broken image.

## Extending Content Types

To add `Announcements`, `Staff Updates`, `Testimonials`, or `FAQs`:

1. Add a new tab to the spreadsheet.
2. Add a new entry in the `ACTIONS` object in `google-apps-script.js`.
3. Add a hidden HTML section.
4. Call `loadSection()` with the new `action`, section ID, list ID, and renderer.

## Security And Reliability

- Keep the spreadsheet editable only by trusted staff. The Web App exposes active public content as JSON.
- The front end escapes Sheet values before rendering to reduce the risk of accidental HTML injection.
- Use relative links for internal website pages and full `https://` links for external destinations.
- Google Apps Script may cache and throttle under load. For a small nonprofit site this is usually fine; if traffic grows, add `CacheService` in Apps Script with a short TTL such as 5 minutes.
- Add columns without breaking old content by keeping headers stable and mapping only the fields each action needs.
