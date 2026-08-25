# Kitchook Brand

This document records the visual identity decisions that should survive individual UI revisions.

## Wordmark

The full wordmark is **KitchooK!**. The capital `K` characters create a subtle visual frame around the name, and the exclamation point gives the mark a clear endpoint.

- Set the wordmark letters in **DM Sans Variable at weight 550**.
- On hover, smoothly increase the letter weight to 650; while pressed, increase it to 1000. This is a transient CSS interaction, not persistent state.
- Honor reduced-motion preferences by removing the weight transition.
- Preserve the exact capitalization `KitchooK!` in the visual mark and in page-title branding.
- Keep the exclamation point in Kitchook coral (`#e99898`) at weight 1000 in every interaction state. Its heavier weight is part of the brand identifier.
- Use the full wordmark in the site header when space permits.
- The compact brand mark is **KK!** and may be used later for constrained formats such as an app icon or favicon. Do not replace the full header wordmark with it without a demonstrated space constraint.

The font is self-hosted so the identity does not depend on a third-party request at runtime.

## Color meaning

Coral is the identity and emphasis color. It means **important—look here**. Its use should be deliberate rather than decorative noise.

Current examples include:

- the wordmark exclamation point;
- favorite or priority markers;
- the primary recipe-title panel.

Important states must still include text, structure, or another non-color cue so meaning does not depend on color perception alone.

## Supporting typography

- Homepage intro `h1`: Bricolage Grotesque Variable, optical sizing automatic, width 100%, and weight 475.
- Recipe page `h1`: Syne Variable, weight 800.
- Section `h2`: Syne Variable, weight 700.
- Recipe-card `h3`: Google Sans Flex, optical sizing automatic, width 35%, weight 550, grade 100, and roundness 40.
- Navigation links: M PLUS U Variable, weight 550 by default, 750 on hover, and the font's maximum weight of 900 while pressed.
- Body copy and other interface text: the native system sans-serif stack.

Display typography should remain direct and high-impact without creating excessive vertical space. Variable-weight interactions use the same 180 ms CSS transition and must become immediate when reduced motion is requested.

## Core palette

- Paper: `#fff8e7`
- Ink: `#171717`
- Yellow: `#fae8a4`
- Coral: `#e99898`
- Blue: `#68b7ff`
- Mint: `#98e9ab`

Dark mode may change foundational paper, surface, and ink colors, but the named accents should retain their identity and remain paired with explicit high-contrast ink.
