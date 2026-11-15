# Subhash Thakur - Portfolio

Personal portfolio website built with HTML, CSS and jQuery. No build step: open `index.html` or deploy the folder to any static host (GitHub Pages, Netlify, Vercel).

Based on the open-source Portfolio-Website template by Jigar Sable.

## Structure

```
index.html            home page (about, skills, education, work, experience, contact)
projects/             full projects page with category filters
experience/           experience timeline page
404.html              not-found page
skills.json           skills shown on the home page
projects/projects.json  projects shown on the home + projects pages
assets/js/config.js   email / chat settings (see below)
assets/css/theme.css  dark theme, focus styles, reduced motion
assets/js/theme.js    theme toggle
admin/                private admin panel (index.html, admin.css, admin.js)
```

## Add a project

Add an entry to `projects/projects.json`:

```json
{
  "name": "My App",
  "desc": "One or two sentences about what it does.",
  "category": "python",
  "image": "my-app.png",
  "links": { "view": "https://my-app.vercel.app", "code": "https://github.com/buildwithsubhash/my-app" }
}
```

- `category`: `mern`, `lamp`, `python`, `basicweb`, `android` or `other`. The filter buttons on the projects page are built from whichever categories you actually use (`other` shows only under "All Projects").
- `image` is optional. Leave it `""` to show a placeholder tile, or put a screenshot in `assets/images/projects/` and use its file name. Use lowercase names: most hosts are case-sensitive.
- Leave a link empty (`""`) and its button is hidden.
- The home page shows the first 6 non-Android projects; the rest are on the projects page.

## Contact form and chat

By default the contact form opens the visitor's mail app addressed to the email in `assets/js/config.js`. To send directly from the page, create an [EmailJS](https://www.emailjs.com) account and fill in `publicKey`, `serviceId` and `templateId`. For live chat, fill in the `tawk` IDs from [Tawk.to](https://www.tawk.to). Anything left empty stays off.

## Admin panel

A private editor for projects and skills, at `/admin/` (for example `https://buildwithsubhash.github.io/Personal-Portfolio/admin/`). It is not linked from the site and is marked `noindex`.

It has no server. After you sign in with a GitHub token, it edits `projects/projects.json` and `skills.json` by committing to your repo through the GitHub API; GitHub Pages then rebuilds the site (usually within a minute or two). You can add, edit, delete and reorder projects, upload a screenshot (resized to 1200 px wide and saved as WebP), and manage skills. Nothing goes live until you click **Publish changes**, and **Discard** drops unpublished edits.

**One-time setup: create a token**

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
2. Repository access: **Only select repositories** → this portfolio repo.
3. Repository permissions → **Contents: Read and write**.
4. Pick an expiry, generate, and paste the token on the admin sign-in page.

**Security notes**

- The page is public, but it can't change anything without a valid token. The page loads no third-party scripts and its content-security policy only allows requests to `api.github.com`, so the token has nowhere else to go.
- Tick "Keep me signed in" only on a device you own; otherwise the token lasts for the current browser tab. If a token is ever exposed, delete it on GitHub (it can only touch this one repo).
- Removing a project doesn't delete its screenshot file from `assets/images/projects/`; remove unused files in GitHub if you care about repo size.
- If you rename the repo or change its default branch, update `CONFIG` at the top of `admin/admin.js`.

## Theme and accessibility

- Light/dark theme toggle in the header. It follows the visitor's system setting on the first visit and remembers their choice afterwards. Dark-mode colors live in `assets/css/theme.css`.
- Animations and the particle background switch off for visitors who have "reduce motion" enabled.
- Keyboard users get a "Skip to content" link, visible focus outlines and a keyboard-operable mobile menu.

## Once you have a final URL

These need your real address, so they're not set yet:

- Make `og:image` in each page's `<head>` an absolute URL (e.g. `https://yourname.dev/assets/images/profile2.jpg`) so link previews show your photo.
- Add `<link rel="canonical" href="https://yourname.dev/">` to `index.html`.
- Add a `sitemap.xml` and submit it in Google Search Console.

## Hosting note

`404.html` works both from the domain root and from the GitHub Pages project path `/Personal-Portfolio/` (the repo name is set in the small script at the top of that file). If you rename the repo, update the name there.
