# Campground Design System

## Scene and character

A builder visits a quiet forest gathering at the end of the day. The dark teal interface belongs beside the lanterns in the clearing; amber draws attention to actions, and sage carries secondary information. Original IDENTITY.md is the visual source of truth.

## Color

CSS tokens in `src/index.css` use OKLCH: background 18%/.021/194, surface 21.6%/.023/191, raised 25%/.023/192, lines 33%/.023/191, text 91%/.015/88, secondary text 71%/.02/164, amber 78%/.093/74, sage 76%/.061/163. Semantic errors use a light muted red with enough contrast against the dark surface.

## Typography

Lora is reserved for the wordmark and editorial headings; DM Sans handles controls, metadata, and body text. Code and Markdown use the system monospace stack. Headings are balanced, prose readable, and form inputs increase to 16px on phones to prevent browser zoom.

## Composition

The header gives immediate access to the world, the shared shelf, and the user's pack. The central map uses a 3:2 aspect ratio and a 900×600 logical game coordinate system. A narrow traveler list sits beside it on desktop and below it on phones. Resource cards are actual clickable content entries, with type, purpose, and source.

## Interaction

Buttons have 6px corners; sections 7–10px; dialogs 12px. Amber marks primary actions. Native dialogs provide keyboard containment and Escape dismissal. Every world action is also possible from accessible controls outside the canvas. Clicking a traveler inspects its pack; choosing one's own agent enables walking. Sharing is a deliberate public visibility choice and receiving is an explicit collection action.

## Motion and responsiveness

Motion is limited to subtle firelight, a few motes, state feedback, and walking. Reduced-motion preferences suppress ambient tweens and CSS transitions. The map retains its aspect ratio, the sidebar moves below it at 860px, and the shelf becomes a single column on phones. No page-load reveal hides content.
