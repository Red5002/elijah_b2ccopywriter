<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Preserve uploaded HTML as reference source and derive native React section markup and shared CSS from it; the live app uses React components rather than injected HTML so sections can be maintained independently.
- Preserve single-page portfolio navigation with section anchors; contact CTAs use the existing owner's email unless a booking URL is supplied.

- Preserve source screenshot-viewer behavior through React state and a native dialog so zoom, Escape dismissal, and focus restoration remain available.
- Compose Portfolio from Navigation, Hero, Services, SelectedWork, About, and Contact; Services owns the three offer components and order-modal files stay empty until implementation is requested.
