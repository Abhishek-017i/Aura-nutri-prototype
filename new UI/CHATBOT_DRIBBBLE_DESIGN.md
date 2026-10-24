# Aura Nutri Chatbot — Dribbble-Inspired Visual Design Specification

## 1. Purpose

Use the attached Dribbble screenshot as a **visual reference only** to redesign the existing Aura Nutri chatbot interface. The immediate goal is to preview a warmer, softer, more polished chatbot experience before deciding whether to apply the same visual language more broadly across Aura Nutri.

The reference's strongest visual characteristics are:
- Warm peach, blush pink, and orange color progression.
- A pale, warm-white main surface.
- Generous, deliberate vertical spacing.
- Softly rounded cards and controls.
- A warm orange gradient-like feature panel.
- Subtle borders and soft depth rather than hard, heavy shadows.
- A compact, floating circular control integrated into the bottom navigation area.
- A clear contrast between calm content surfaces and the stronger orange conversational feature.

**Do not copy the reference app's content, product features, brand, icons, or layout wholesale.** Apply the visual language only to Aura Nutri's existing chatbot.

---

## 2. Scope: Chatbot UI Only

### In scope
- Existing chatbot page/panel.
- Existing chat header and title area.
- Existing assistant and user message bubbles.
- Existing message composer/input.
- Existing send/microphone button, if already present.
- Existing source chips, typing/streaming state, loading/error state.
- Existing chat container corners, spacing, borders, background, and shadows.
- Responsive treatment of the existing chatbot on desktop and mobile/PWA.

### Out of scope
- Dashboard redesign.
- Bottom navigation redesign, except for avoiding overlap with the chatbot on mobile.
- New bottom navigation items or floating buttons.
- New chatbot capabilities, tools, modes, or message actions.
- New notifications, symptom trackers, phase cards, analytics, or self-care features from the reference.
- Any backend, API, database, authentication, routing, or chat-streaming changes.
- Any change to the assistant's clinical scope, prompts, safety behavior, or data.

If a reference element has no equivalent in the existing chatbot, omit it. Do not create a feature merely to fill visual space.

---

## 3. Visual Direction

### Design keywords
**Warm clinical · soft editorial · reassuring · premium · spacious · clear**

The interface should feel like a thoughtful women's wellness companion, not a generic orange chatbot and not a direct clone of the reference.

### Suggested color tokens

These are suggested starting values inferred from the screenshot, not extracted pixel-perfect values. Reconcile them with the current Aura Nutri design tokens and check contrast before implementation.

| Token | Suggested value | Intended use |
|---|---|---|
| `chat-bg` | `#FFF7F4` | Main chat page/panel background |
| `chat-surface` | `#FFFCFA` | Message/composer surface where a filled surface is needed |
| `chat-blush` | `#F8DCE2` | Very soft blush highlight |
| `chat-peach` | `#F7C6AD` | Warm peach surface |
| `chat-orange` | `#E88A4D` | Main warm feature/accent color |
| `chat-orange-deep` | `#D8753F` | Darker orange for gradient endpoint/hover if contrast permits |
| `chat-rose` | `#D9728E` | Existing Aura Nutri brand accent compatibility |
| `chat-text` | `#3D292E` | Main text |
| `chat-muted` | `#8A7176` | Supporting text |
| `chat-border` | `#F0DDE3` | Subtle warm-pink borders |
| `chat-shadow` | `rgba(93, 52, 43, 0.10)` | Soft, low-opacity elevation |

### Color distribution: bottom to top / visual hierarchy

Use the reference's color distribution as a guide, but adapt it to the chatbot's actual layout:
1. **Main background:** a very light warm blush/off-white; this should occupy most of the screen.
2. **Chat transcript surface:** mostly light and calm, not saturated.
3. **Assistant message bubbles:** pale warm surface or pale blush tint; text remains dark and readable.
4. **User message bubbles:** use the existing brand rose or a muted warm orange only if contrast is strong enough for white text.
5. **Composer area:** light, softly bordered, clearly separate from the transcript.
6. **Primary send/mic action:** a circular button with a solid, high-contrast accent fill.
7. **Optional feature accent:** if the current chatbot already has a distinct assistant greeting/header panel, it may use a restrained peach-to-orange treatment. Do not create a new hero card just to imitate the screenshot.

Avoid filling every element with orange or pink. Use orange as a focal accent, not the default background for all messages.

---

## 4. Shape, Radius, Borders, and Shadows

The reference uses soft pill-like controls and cards with visibly rounded corners. Adapt that feel to Aura Nutri's existing component sizes.

Suggested starting values:
- Main chatbot panel: `20px–28px` radius on mobile, depending on the existing app shell.
- Message bubbles: `16px–22px` radius, with a slightly more compact radius at the message-tail/attachment edge if the existing component supports it cleanly.
- Composer/input container: `24px–30px` radius.
- Circular mic/send control: `50%` radius.
- Small source/status chips: `999px` pill radius.
- Borders: `1px solid` using the subtle warm-pink border token.
- Shadows: one soft, low-opacity shadow for the main floating panel or composer only where separation is needed. Avoid shadows on every bubble and every button.

Do not force the large radius on every element. Maintain clear shape hierarchy:
- Large panel = rounded rectangle.
- Message bubbles = medium rounded shape.
- Composer = pill-like shape.
- Mic/send action = circle.
- Chips = small pills.

Do not add a separate border around every nested wrapper. Avoid double borders.

---

## 5. Chat Layout and Spacing

Keep the current Aura Nutri chatbot information architecture and interactions. Change presentation, not behavior.

### Header
- Keep the existing chatbot title/name and any currently supported close/back action.
- Use a compact header with clear title hierarchy and restrained supporting text only if it already exists.
- Use comfortable vertical and horizontal padding.
- Do not add a notification bell, avatar, or new actions solely because the reference has them.

### Message transcript
- Preserve the existing chronological message flow.
- Give messages comfortable breathing room; avoid tightly stacked bubbles.
- Use a consistent maximum width so long assistant responses remain readable.
- Assistant messages should align consistently; user messages should remain visually distinct and follow the existing alignment pattern.
- Use warm neutral/blush fills with dark text.
- Preserve source chips/citations if the current chatbot renders them.
- Keep streaming cursor, loading state, and retry/error treatment functional and legible.
- Do not truncate clinical disclaimers, sources, or important nutrition explanations to achieve a visual match.

### Composer
- Keep the existing text field, send action, and microphone action if currently implemented.
- Use a softly rounded, pill-like composer with a subtle border.
- Keep adequate internal padding so the input text and controls never collide.
- The send/mic action may be circular and slightly elevated, inspired by the circular microphone control in the reference.
- Maintain keyboard submission, voice recording, disabled/loading states, and focus states exactly as they currently work.
- Keep the composer visible above mobile keyboards and safe-area insets.
- Do not add new composer actions.

### Spacing tokens
Use the existing project's spacing scale where possible. If needed, use a restrained rhythm based on `4, 8, 12, 16, 24, 32px`.
- Header vertical padding: approximately `16–20px`.
- Space between consecutive messages: approximately `12–16px`.
- Message internal padding: approximately `12–16px`.
- Composer outer spacing: approximately `12–16px`.
- Mobile horizontal gutters: approximately `16–20px`.
These are starting ranges, not rigid pixel requirements. Follow the existing responsive shell.

---

## 6. Gradient and Background Treatment

The reference uses a warm peach/orange feature region against a pale background.

- Prefer a calm, nearly solid warm background for the overall chatbot.
- A very subtle blush-to-peach gradient may be used **only** for an existing assistant header/intro surface if the effect is restrained and consistent with `RULES.md`.
- Do not add full-screen decorative gradients, glowing orbs, radial effects, sparkles, dot grids, or background illustrations.
- Do not use a saturated orange gradient behind the entire chat transcript.
- If the existing project rules require flat colors/no gradients, follow those rules and use a flat peach surface instead. Do not silently violate established design rules.
- Preserve legible contrast for all text and controls.

---

## 7. Responsive Behavior

### Mobile/PWA
- Use the available viewport width without horizontal scrolling.
- Respect device safe-area insets.
- Keep the header compact and the transcript scrollable.
- Keep the composer anchored to the visible bottom area without covering the last message.
- If the app has a fixed bottom navigation, ensure the chat composer does not overlap it; use the existing app shell's established behavior.
- Ensure long assistant responses, source chips, and multi-line messages wrap naturally.
- Make the circular mic/send control large enough to tap comfortably.
- Avoid forcing the exact phone mockup frame or status bar from the reference into the real app.

### Desktop
- Use a readable maximum transcript width rather than stretching message lines across the entire monitor.
- Keep the surrounding app shell and navigation unchanged.
- Avoid adding a fake phone frame.
- Maintain balanced whitespace without making the chat area feel empty.

---

## 8. Theme Compatibility

- Preserve the existing light/dark theme toggle.
- The warm palette can be the default direction for the light-mode chatbot.
- In dark mode, adapt to existing dark theme tokens: use deep plum/dark surfaces, readable muted text, subtle dark borders, and restrained rose/orange accents.
- Do not force the light peach background into dark mode.
- Do not change global theme tokens unless necessary and approved; prefer scoped chatbot tokens/classes first.
- Ensure all focus, disabled, loading, error, and hover states remain visible in both themes.

---

## 9. Product and Engineering Constraints

- Inspect the actual chat component(s), app shell, theme setup, and styles before editing.
- Reuse the current component structure and installed icon system.
- Do not add a new UI framework, icon library, font package, or animation dependency.
- Do not change chat hooks, WebSocket/streaming code, API calls, request/response types, authentication, or persistence.
- Do not alter chatbot prompts or medical behavior.
- Do not invent data, example answers, sources, or new assistant capabilities.
- Keep the change isolated to existing chatbot UI styles/components and any minimal responsive styling required.
- Avoid broad global CSS selectors that unintentionally restyle the entire app.
- Preserve existing uncommitted changes and inspect the final diff.

---

## 10. Implementation Workflow

1. Inspect the current chatbot component and identify all its existing visual states.
2. Record the current behavior and files before changing anything.
3. Map the screenshot's visual qualities to existing chatbot elements:
   - warm pale background → chatbot background
   - soft white surface → existing transcript/composer surface
   - rounded cards → existing message bubbles/panel
   - warm accent region → existing header/intro surface only, if present
   - circular microphone → existing mic/send control only
4. Explicitly omit reference features that do not exist in Aura Nutri.
5. Implement scoped styles and reuse existing tokens where possible.
6. Verify mobile/PWA and desktop layouts.
7. Verify light and dark themes.
8. Verify typing, sending, streaming, source chips, microphone, loading, error, and keyboard behavior.
9. Run the existing frontend build/type-check/lint scripts if available.
10. Report files changed and any remaining issues.

---

## 11. Acceptance Criteria

The redesign is accepted only if:
- The chatbot has a warmer blush/peach visual atmosphere inspired by the reference.
- Color is distributed intentionally: calm light background, warm accent used sparingly, readable text.
- Rounded panel, message, composer, and circular-control shapes feel cohesive.
- Spacing is more comfortable and the message transcript remains readable.
- The design still unmistakably belongs to Aura Nutri.
- No unrelated template features or content were added.
- Existing chat and voice interactions still work.
- Existing API, auth, backend, and data behavior are unchanged.
- Light/dark mode and mobile/desktop remain usable.
- The final code diff is limited to the chatbot UI and necessary scoped styling.

## Final instruction

Implement this as a **visual experiment on the existing chatbot only**. Do not roll the design across the whole website yet. The user will evaluate the result and decide whether the same design language should be extended to other screens.
