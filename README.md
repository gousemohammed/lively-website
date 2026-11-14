# Lively website (ready to host)

This folder is the finished Lively landing page. Push it to GitHub as its own repository, and Cloudflare Pages serves it
as it is. There's nothing to build on Cloudflare.

## What's in here

| File or folder | What it is |
|---|---|
| `index.html` | The landing page |
| `404.html` | The "page not found" page |
| `_astro/` | Styles, scripts, photos and fonts the page uses (names change on each build) |
| `email/lively-logo.png` | The logo shown in the sign-up emails |
| `robots.txt`, `sitemap.xml` | For search engines (they fill in once the domain is set) |
| `_headers` | Cloudflare settings: caching and security headers |

## Don't edit these files

They're generated. Change the site in `../landing-page`, then refresh this folder from `landing-page` with:

    npm run website

That rebuilds the site and replaces everything here (except this README and the `.git` folder).

## Cloudflare Pages settings

- Framework preset: **None**
- Build command: *(leave empty)*
- Build output directory: **/**

## Before going live

Replace the temporary email (support.lively@gmail.com), set the domain, and add the Privacy and Terms pages.
The full go-live list is in `../landing-page/AGENTS.md`.
