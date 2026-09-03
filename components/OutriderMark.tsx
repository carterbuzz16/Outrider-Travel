// The Outrider eye/horse mark.
// Outlined vector paths lifted straight from the source comp (OUTRIDER 1.pdf),
// so the letterforms and spacing are the artwork's own — no web font to load,
// no fallback to flash. Inlined rather than served as a file: at this size the
// markup costs less than the extra request would.
export default function OutriderMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 99.393 83.367"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M36.466 19.829L43.883 16.785L2.986 0.001L2.986 6.088Z M57.06 60.995L96.63 44.623C99.393 43.48 99.388 39.564 96.622 38.429L57.113 22.215L96.407 6.088L96.407 0L49.697 19.171L49.696 19.171L42.28 22.215L2.772 38.429C0.005 39.564 0 43.48 2.763 44.623L36.537 58.597L43.929 55.563L17.542 44.646C14.778 43.502 14.784 39.587 17.551 38.451L49.697 25.258L81.843 38.451C84.609 39.587 84.615 43.502 81.852 44.646L49.697 57.949L49.696 57.949L42.333 60.995L2.986 77.274L2.986 83.367L49.697 64.041L96.407 83.367L96.407 77.274Z M49.697 32.67C45.781 32.67 42.607 36.705 42.607 41.682C42.607 46.66 45.781 50.695 49.697 50.695C53.613 50.695 56.786 46.66 56.786 41.682C56.786 36.705 53.613 32.67 49.697 32.67" />
    </svg>
  );
}
